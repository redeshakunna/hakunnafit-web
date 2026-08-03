"use server";

// Acciones de servidor del lado del entrenador para "Propuesta de plan de
// sesiones" (tarea #392): el entrenador elige días de la semana + horario +
// duración + modalidad + número de sesiones, genera una lista concreta de
// fechas y se la envía al cliente por correo con un link de un solo
// propósito (mismo patrón token que /agenda/conectar/[token], ver
// calendar-connections-actions.ts). El cliente debe aprobar cada sesión una
// por una desde /agenda/aprobar/[token] (tarea #393/#395) — solo cuando
// aprueba un item, ESE día se convierte en una cita real (evaluations) y se
// sincroniza con Google Calendar; nada se agenda automáticamente solo
// porque el entrenador lo propuso.
//
// session_proposals = el "sobre" (quién, para quién, token, estado general).
// session_proposal_items = cada fecha propuesta dentro de esa propuesta, con
// su propio estado (pendiente/aprobada/rechazada) — así el cliente puede
// aprobar unas y rechazar otras sin invalidar el resto del plan.

import { randomBytes } from "crypto";
import { getSupabaseAdmin } from "./supabase-admin";
import { requireTrainer } from "./trainer-auth";
import type { AdminActionResult, TrainerRow } from "./admin-actions";
import { MODALIDAD_LABEL, formatApptDateTime, trainerBranding, type AppointmentModalidad } from "./agenda-constants";
import { sendEmail, type EmailContext } from "./mail";

const PROPOSAL_TOKEN_TTL_DAYS = 14;

interface OwnClientBasics {
  id: string;
  fullName: string;
  email: string | null;
}

async function assertOwnClient(clientId: string): Promise<{ trainer: TrainerRow; client: OwnClientBasics }> {
  const trainer = await requireTrainer();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("clients")
    .select("id, trainer_id, email, full_name")
    .eq("id", clientId)
    .maybeSingle();
  if (error || !data || data.trainer_id !== trainer.id) {
    throw new Error("Cliente no encontrado.");
  }
  return { trainer, client: { id: data.id, fullName: data.full_name ?? "Cliente", email: data.email } };
}

function generateProposalToken(): string {
  return randomBytes(18).toString("base64url").slice(0, 24);
}

/** "6:00 am" / "12:00 pm" → {hour: 0-23, minute}. Solo acepta el formato de
 * HORARIOS_ENTRENO (lib/client-ui.ts) — ese picklist ya evita texto libre en
 * el resto de la plataforma, esta propuesta usa el mismo horario. */
function parseHorarioEntreno(horario: string): { hour: number; minute: number } | null {
  const match = horario.trim().match(/^(\d{1,2}):(\d{2})\s*(am|pm)$/i);
  if (!match) return null;
  let hour = parseInt(match[1], 10);
  const minute = parseInt(match[2], 10);
  const meridiem = match[3].toLowerCase();
  if (meridiem === "pm" && hour !== 12) hour += 12;
  if (meridiem === "am" && hour === 12) hour = 0;
  return { hour, minute };
}

const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/**
 * Calcula `count` fechas concretas (objetos Date, instante UTC real) a
 * partir de los días de la semana elegidos (0=domingo..6=sábado, misma
 * convención que Date.getDay()) y una hora fija — siempre en hora de
 * Bogotá (UTC-5 todo el año, Colombia no tiene horario de verano, así que
 * el offset fijo "-05:00" es seguro sin importar la fecha). Empieza a
 * buscar desde mañana, nunca hoy mismo, para no proponerle al cliente una
 * sesión el mismo día que el entrenador arma el plan.
 */
function computeProposalDates(weekdays: number[], hour: number, minute: number, count: number): Date[] {
  const now = new Date();
  const bogotaDateStr = now.toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
  const todayMidnightUtcMs = new Date(`${bogotaDateStr}T00:00:00-05:00`).getTime();
  const todayWeekdayShort = now.toLocaleDateString("en-US", { timeZone: "America/Bogota", weekday: "short" });
  const todayWeekday = WEEKDAY_INDEX[todayWeekdayShort] ?? 0;

  const weekdaySet = new Set(weekdays);
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");

  const results: Date[] = [];
  let offset = 1;
  // Tope de 400 días como salvaguarda — con al menos 1 día de la semana
  // seleccionado (se valida antes de llamar esta función) nunca se llega
  // ni cerca de eso, pero evita un loop infinito si weekdays llegara vacío.
  while (results.length < count && offset < 400) {
    const candidateWeekday = (todayWeekday + offset) % 7;
    if (weekdaySet.has(candidateWeekday)) {
      const dayMs = todayMidnightUtcMs + offset * 24 * 60 * 60 * 1000;
      const dayDateStr = new Date(dayMs).toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
      results.push(new Date(`${dayDateStr}T${hh}:${mm}:00-05:00`));
    }
    offset++;
  }
  return results;
}

export interface SessionProposalItemRow {
  id: string;
  scheduledAt: string;
  durationMin: number;
  modalidad: AppointmentModalidad;
  status: "pendiente" | "aprobada" | "rechazada";
}

export interface SessionProposalRow {
  id: string;
  status: "pendiente" | "completada" | "cancelada";
  token: string;
  url: string;
  createdAt: string;
  items: SessionProposalItemRow[];
}

/**
 * Genera la propuesta: inserta el "sobre" (session_proposals) + una fila por
 * fecha calculada (session_proposal_items, todas 'pendiente') y le manda al
 * cliente el link de aprobación por correo. Solo puede haber una propuesta
 * 'pendiente' a la vez por cliente — si ya hay una, hay que cancelarla
 * primero (cancelSessionProposal) en vez de acumular propuestas activas que
 * se pisarían entre sí.
 */
export async function proposeSessionPlan(input: {
  clientId: string;
  weekdays: number[];
  horario: string;
  durationMin: number;
  modalidad: AppointmentModalidad;
  count: number;
}): Promise<AdminActionResult & { id?: string; url?: string }> {
  const { trainer, client } = await assertOwnClient(input.clientId);
  if (!client.email) return { ok: false, error: "El cliente no tiene correo registrado — no podría avisarle de la propuesta." };
  if (!input.weekdays.length) return { ok: false, error: "Selecciona al menos un día de la semana." };
  if (!Number.isFinite(input.count) || input.count < 1) return { ok: false, error: "El número de sesiones debe ser mayor a 0." };
  if (!Number.isFinite(input.durationMin) || input.durationMin < 15) return { ok: false, error: "Duración inválida." };

  const parsed = parseHorarioEntreno(input.horario);
  if (!parsed) return { ok: false, error: "Horario inválido." };

  const supabase = getSupabaseAdmin();

  const { data: existing } = await supabase
    .from("session_proposals")
    .select("id")
    .eq("client_id", input.clientId)
    .eq("status", "pendiente")
    .maybeSingle();
  if (existing) {
    return { ok: false, error: "Ya hay una propuesta pendiente para este cliente. Cancélala antes de crear una nueva." };
  }

  const dates = computeProposalDates(input.weekdays, parsed.hour, parsed.minute, input.count);
  if (dates.length < input.count) {
    return { ok: false, error: "No se pudieron calcular suficientes fechas con esos días de la semana." };
  }

  const token = generateProposalToken();
  const expiresAt = new Date(Date.now() + PROPOSAL_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  const { data: proposal, error: proposalError } = await supabase
    .from("session_proposals")
    .insert({
      trainer_id: trainer.id,
      client_id: input.clientId,
      status: "pendiente",
      token,
      token_expires_at: expiresAt.toISOString(),
    })
    .select("id")
    .single();
  if (proposalError || !proposal) {
    return { ok: false, error: proposalError?.message ?? "No se pudo crear la propuesta." };
  }

  const items = dates.map((d) => ({
    proposal_id: proposal.id,
    scheduled_at: d.toISOString(),
    duration_min: input.durationMin,
    modalidad: input.modalidad,
    status: "pendiente" as const,
  }));
  const { error: itemsError } = await supabase.from("session_proposal_items").insert(items);
  if (itemsError) {
    // Sin transacciones multi-tabla en supabase-js — si los items fallan,
    // se retira el "sobre" para no dejar una propuesta vacía huérfana.
    await supabase.from("session_proposals").delete().eq("id", proposal.id);
    return { ok: false, error: itemsError.message };
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://hakunnafit.com";
  const url = `${siteUrl}/agenda/aprobar/${token}`;

  const firstLabel = formatApptDateTime(dates[0].toISOString());
  const lastLabel = formatApptDateTime(dates[dates.length - 1].toISOString());
  const brand = { kind: "trainer" as const, trainer: trainerBranding(trainer) };

  const context: EmailContext = {
    brand,
    audience: "client",
    to: client.email,
    recipientName: client.fullName,
    subject: `${trainer.business_name} te propuso tu plan de sesiones`,
    heading: "Tienes un plan de sesiones por aprobar",
    message: `${trainer.business_name} propuso ${dates.length} sesiones para ti. Revísalas y apruébalas una por una — puedes ajustar cualquiera que no te sirva.`,
    primaryButton: { label: "Revisar y aprobar mis sesiones", url },
    infoBox: {
      rows: [
        { label: "Sesiones propuestas", value: String(dates.length) },
        { label: "Desde", value: `${firstLabel.dateLabel}, ${firstLabel.timeLabel}` },
        { label: "Hasta", value: `${lastLabel.dateLabel}, ${lastLabel.timeLabel}` },
        { label: "Modalidad", value: MODALIDAD_LABEL[input.modalidad] },
      ],
    },
  };

  await sendEmail({ flowId: "propuesta-sesiones-creada", category: "client", context });

  return { ok: true, id: proposal.id, url };
}

interface ProposalJoinRow {
  id: string;
  status: "pendiente" | "completada" | "cancelada";
  token: string;
  created_at: string;
}

/**
 * Trae la propuesta 'pendiente' activa de un cliente (si hay una) con todos
 * sus items — usada tanto para mostrar el progreso en la ficha del cliente
 * (tarea #394) como para bloquear la creación de una propuesta nueva
 * mientras haya una en curso.
 */
export async function getOwnSessionProposal(clientId: string): Promise<SessionProposalRow | null> {
  const { trainer } = await assertOwnClient(clientId);
  const supabase = getSupabaseAdmin();

  const { data: proposal } = await supabase
    .from("session_proposals")
    .select("id, status, token, created_at")
    .eq("client_id", clientId)
    .eq("trainer_id", trainer.id)
    .eq("status", "pendiente")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!proposal) return null;
  const row = proposal as ProposalJoinRow;

  const { data: items } = await supabase
    .from("session_proposal_items")
    .select("id, scheduled_at, duration_min, modalidad, status")
    .eq("proposal_id", row.id)
    .order("scheduled_at", { ascending: true });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://hakunnafit.com";
  return {
    id: row.id,
    status: row.status,
    token: row.token,
    url: `${siteUrl}/agenda/aprobar/${row.token}`,
    createdAt: row.created_at,
    items: (items ?? []).map((i) => ({
      id: i.id,
      scheduledAt: i.scheduled_at,
      durationMin: i.duration_min,
      modalidad: i.modalidad as AppointmentModalidad,
      status: i.status,
    })),
  };
}

/**
 * Cancela una propuesta 'pendiente' — el entrenador se arrepintió o se
 * equivocó de días/horario antes de que el cliente termine de revisarla.
 * Una propuesta 'completada' (el cliente ya resolvió todos los items) no se
 * puede cancelar por acá, ya cumplió su propósito.
 */
export async function cancelSessionProposal(proposalId: string): Promise<AdminActionResult> {
  const trainer = await requireTrainer();
  const supabase = getSupabaseAdmin();
  const { data: proposal, error: findError } = await supabase
    .from("session_proposals")
    .select("id, trainer_id, status")
    .eq("id", proposalId)
    .maybeSingle();
  if (findError || !proposal || proposal.trainer_id !== trainer.id) {
    return { ok: false, error: "Propuesta no encontrada." };
  }
  if (proposal.status !== "pendiente") {
    return { ok: false, error: "Esta propuesta ya no está pendiente." };
  }
  const { error } = await supabase.from("session_proposals").update({ status: "cancelada" }).eq("id", proposalId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
