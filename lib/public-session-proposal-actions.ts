"use server";

// Acciones de servidor PÚBLICAS (sin sesión, validadas por token) para que
// el cliente final apruebe o rechace cada sesión de una propuesta de plan —
// mismo patrón que /agenda/conectar/[token] (calendar-connections-actions.ts):
// el token es de un solo propósito y expira, no da acceso a nada más del
// cliente.
//
// Reglas del flujo (definidas por el entrenador — ver resumen de la
// conversación): el entrenador genera la lista de fechas
// (session-proposals-actions.ts, ya "pendiente" cada una) y el cliente debe
// resolver cada item una por una:
//   - Aprobar: la fecha propuesta le sirve tal cual → se crea la cita real.
//   - Rechazar: esa fecha no le sirve → en vez de dejarla "rechazada" suelta
//     (lo que reduciría el plan sin que nadie lo note), el cliente debe
//     elegir en el momento uno de 2-3 horarios alternativos sugeridos para
//     cubrir exactamente ese cupo — rechazo y reemplazo son una sola acción
//     atómica (rejectAndReplaceItem), así el total de sesiones del plan
//     nunca queda descuadrado.
// Cuando ya no queda ningún item 'pendiente', la propuesta pasa a
// 'completada'.

import { getSupabaseAdmin } from "./supabase-admin";
import type { AdminActionResult } from "./admin-actions";
import type { AppointmentModalidad } from "./agenda-constants";
import { createAppointmentFromProposalItem } from "./trainer-agenda-actions";

// ---------------------------------------------------------------------------
// Lectura de la propuesta
// ---------------------------------------------------------------------------

export interface PublicProposalItem {
  id: string;
  scheduledAt: string;
  durationMin: number;
  modalidad: AppointmentModalidad;
  status: "pendiente" | "aprobada" | "rechazada";
}

export interface PublicProposalSession {
  proposalId: string;
  proposalStatus: "pendiente" | "completada" | "cancelada";
  clientFirstName: string;
  trainer: {
    businessName: string;
    logoUrl: string | null;
    colorPrimario: string;
    colorSecundario: string;
  };
  items: PublicProposalItem[];
}

interface ProposalTokenRow {
  id: string;
  trainer_id: string;
  client_id: string;
  status: "pendiente" | "completada" | "cancelada";
  token_expires_at: string | null;
}

/** Valida el token y devuelve la fila de session_proposals si sigue vigente
 * — null si el token no existe o ya expiró (mismo criterio de expiración
 * que getClientCalendarConnectSession). Centralizado acá porque las 4
 * acciones públicas de este archivo lo necesitan. */
async function resolveProposalByToken(token: string): Promise<ProposalTokenRow | null> {
  if (!token?.trim()) return null;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("session_proposals")
    .select("id, trainer_id, client_id, status, token_expires_at")
    .eq("token", token)
    .maybeSingle();
  if (error || !data) return null;
  if (data.token_expires_at && new Date(data.token_expires_at) < new Date()) return null;
  return data as ProposalTokenRow;
}

export async function getProposalByToken(token: string): Promise<PublicProposalSession | null> {
  const proposal = await resolveProposalByToken(token);
  if (!proposal) return null;

  const supabase = getSupabaseAdmin();
  const [{ data: client }, { data: trainer }, { data: items }] = await Promise.all([
    supabase.from("clients").select("full_name").eq("id", proposal.client_id).maybeSingle(),
    supabase
      .from("trainers")
      .select("business_name, logo_url, color_primario, color_secundario")
      .eq("id", proposal.trainer_id)
      .maybeSingle(),
    supabase
      .from("session_proposal_items")
      .select("id, scheduled_at, duration_min, modalidad, status")
      .eq("proposal_id", proposal.id)
      .order("scheduled_at", { ascending: true }),
  ]);
  if (!trainer) return null;

  return {
    proposalId: proposal.id,
    proposalStatus: proposal.status,
    clientFirstName: (client?.full_name ?? "").split(" ")[0] || "Cliente",
    trainer: {
      businessName: trainer.business_name,
      logoUrl: trainer.logo_url,
      colorPrimario: trainer.color_primario,
      colorSecundario: trainer.color_secundario,
    },
    items: ((items ?? []) as { id: string; scheduled_at: string; duration_min: number; modalidad: string; status: string }[]).map(
      (i) => ({
        id: i.id,
        scheduledAt: i.scheduled_at,
        durationMin: i.duration_min,
        modalidad: i.modalidad as AppointmentModalidad,
        status: i.status as PublicProposalItem["status"],
      })
    ),
  };
}

// ---------------------------------------------------------------------------
// Helpers internos compartidos por approve / reject+replace
// ---------------------------------------------------------------------------

interface ProposalItemRow {
  id: string;
  proposal_id: string;
  scheduled_at: string;
  duration_min: number;
  modalidad: AppointmentModalidad;
  status: "pendiente" | "aprobada" | "rechazada";
}

async function loadPendingItem(proposal: ProposalTokenRow, itemId: string): Promise<ProposalItemRow | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("session_proposal_items")
    .select("id, proposal_id, scheduled_at, duration_min, modalidad, status")
    .eq("id", itemId)
    .maybeSingle();
  if (error || !data || data.proposal_id !== proposal.id) return null;
  if (data.status !== "pendiente") return null;
  return data as ProposalItemRow;
}

/** Marca la propuesta 'completada' si ya no queda ningún item 'pendiente' —
 * se llama después de resolver cada item (aprobar o rechazar+reemplazar). */
async function maybeCompleteProposal(proposalId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { count } = await supabase
    .from("session_proposal_items")
    .select("id", { count: "exact", head: true })
    .eq("proposal_id", proposalId)
    .eq("status", "pendiente");
  if (!count) {
    await supabase.from("session_proposals").update({ status: "completada" }).eq("id", proposalId);
  }
}

// ---------------------------------------------------------------------------
// Aprobar un item
// ---------------------------------------------------------------------------

export async function approveProposalItem(token: string, itemId: string): Promise<AdminActionResult> {
  const proposal = await resolveProposalByToken(token);
  if (!proposal) return { ok: false, error: "Este link ya no es válido." };
  if (proposal.status !== "pendiente") return { ok: false, error: "Esta propuesta ya se resolvió." };

  const item = await loadPendingItem(proposal, itemId);
  if (!item) return { ok: false, error: "Esta sesión ya fue resuelta o no existe." };

  const created = await createAppointmentFromProposalItem({
    trainerId: proposal.trainer_id,
    clientId: proposal.client_id,
    scheduledAt: item.scheduled_at,
    durationMin: item.duration_min,
    modalidad: item.modalidad,
  });
  if (!created.ok) return created;

  const supabase = getSupabaseAdmin();
  await supabase
    .from("session_proposal_items")
    .update({ status: "aprobada", evaluation_id: created.id })
    .eq("id", item.id);

  await maybeCompleteProposal(proposal.id);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Rechazar + elegir reemplazo (acción atómica)
// ---------------------------------------------------------------------------

export interface SuggestedSlot {
  iso: string;
  dateLabel: string;
  timeLabel: string;
}

/** Franjas horarias candidatas para un reemplazo — mismo picklist que usa el
 * resto de la plataforma (HORARIOS_ENTRENO en lib/client-ui.ts) filtrado a
 * lo que cae dentro de AGENDA_WORKING_HOURS, más el horario original de la
 * sesión rechazada (por si el entrenador ya trabaja fuera de ese rango,
 * como 6-7am, que el resto del negocio sí permite). */
const CANDIDATE_HOURS: { hour: number; minute: number }[] = [
  { hour: 6, minute: 0 },
  { hour: 7, minute: 0 },
  { hour: 8, minute: 0 },
  { hour: 9, minute: 0 },
  { hour: 12, minute: 0 },
  { hour: 16, minute: 0 },
  { hour: 17, minute: 0 },
  { hour: 18, minute: 0 },
];

function formatSlot(iso: string): { dateLabel: string; timeLabel: string } {
  const date = new Date(iso);
  return {
    dateLabel: date.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Bogota" }),
    timeLabel: date.toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "America/Bogota" }),
  };
}

/**
 * Calcula 2-3 horarios alternativos para reemplazar un item rechazado —
 * mismo horario original probado en los próximos días primero (más cercano
 * a lo que el cliente ya esperaba), y si faltan opciones prueba otras
 * franjas del día. Descarta cualquier candidato que: ya sea otro item de
 * esta misma propuesta, quede en el pasado, o choque con una cita activa
 * del entrenador o del cliente (evaluations con status != 'cancelada').
 */
export async function getReplacementSuggestions(token: string, itemId: string): Promise<AdminActionResult & { slots?: SuggestedSlot[] }> {
  const proposal = await resolveProposalByToken(token);
  if (!proposal) return { ok: false, error: "Este link ya no es válido." };

  const item = await loadPendingItem(proposal, itemId);
  if (!item) return { ok: false, error: "Esta sesión ya fue resuelta o no existe." };

  const supabase = getSupabaseAdmin();

  const otherItems = await supabase
    .from("session_proposal_items")
    .select("scheduled_at")
    .eq("proposal_id", proposal.id)
    .neq("id", item.id);
  const takenIso = new Set((otherItems.data ?? []).map((r) => new Date(r.scheduled_at).getTime()));

  // Ventana de 45 días hacia adelante alcanza de sobra para encontrar 3
  // huecos libres en cualquier agenda real; evita traer todo el historial.
  const windowEnd = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString();
  const { data: busyRows } = await supabase
    .from("evaluations")
    .select("scheduled_at, duracion_min")
    .or(`trainer_id.eq.${proposal.trainer_id},client_id.eq.${proposal.client_id}`)
    .neq("status", "cancelada")
    .gte("scheduled_at", new Date().toISOString())
    .lte("scheduled_at", windowEnd);
  const busy = (busyRows ?? [])
    .filter((r): r is { scheduled_at: string; duracion_min: number } => Boolean(r.scheduled_at))
    .map((r) => {
      const start = new Date(r.scheduled_at).getTime();
      return { start, end: start + r.duracion_min * 60_000 };
    });

  function hasConflict(startMs: number, durationMin: number): boolean {
    const end = startMs + durationMin * 60_000;
    return busy.some((b) => startMs < b.end && end > b.start);
  }

  const original = new Date(item.scheduled_at);
  const originalHourBogota = parseInt(
    original.toLocaleTimeString("en-US", { hour: "2-digit", hour12: false, timeZone: "America/Bogota" }),
    10
  );
  const originalMinuteBogota = new Date(original.toLocaleString("en-US", { timeZone: "America/Bogota" })).getMinutes();

  // Primero: mismo horario original, próximos 10 días. Segundo: otras
  // franjas de CANDIDATE_HOURS, próximos 10 días. Así el reemplazo más
  // parecido a lo pactado siempre aparece primero en la lista.
  const hourCandidates = [
    { hour: originalHourBogota, minute: originalMinuteBogota },
    ...CANDIDATE_HOURS.filter((h) => h.hour !== originalHourBogota),
  ];

  const results: SuggestedSlot[] = [];
  outer: for (const { hour, minute } of hourCandidates) {
    for (let offset = 1; offset <= 14; offset++) {
      const dayMs = Date.now() + offset * 24 * 60 * 60 * 1000;
      const dayDateStr = new Date(dayMs).toLocaleDateString("en-CA", { timeZone: "America/Bogota" });
      const hh = String(hour).padStart(2, "0");
      const mm = String(minute).padStart(2, "0");
      const candidate = new Date(`${dayDateStr}T${hh}:${mm}:00-05:00`);
      const candidateMs = candidate.getTime();
      if (candidateMs <= Date.now()) continue;
      if (takenIso.has(candidateMs)) continue;
      if (hasConflict(candidateMs, item.duration_min)) continue;
      if (results.some((r) => r.iso === candidate.toISOString())) continue;

      const { dateLabel, timeLabel } = formatSlot(candidate.toISOString());
      results.push({ iso: candidate.toISOString(), dateLabel, timeLabel });
      if (results.length >= 3) break outer;
      break; // ya encontró un hueco para este horario — pasa al siguiente horario candidato
    }
  }

  return { ok: true, slots: results };
}

export async function rejectAndReplaceItem(token: string, itemId: string, chosenIso: string): Promise<AdminActionResult> {
  const proposal = await resolveProposalByToken(token);
  if (!proposal) return { ok: false, error: "Este link ya no es válido." };
  if (proposal.status !== "pendiente") return { ok: false, error: "Esta propuesta ya se resolvió." };

  const item = await loadPendingItem(proposal, itemId);
  if (!item) return { ok: false, error: "Esta sesión ya fue resuelta o no existe." };

  // Revalida el horario elegido contra las mismas reglas de disponibilidad
  // (no confía en lo que mandó el cliente, aunque haya salido de la lista
  // que este mismo servidor sugirió — pudo pasar tiempo entre sugerir y
  // elegir, y algo pudo ocuparse mientras tanto).
  const chosenDate = new Date(chosenIso);
  if (Number.isNaN(chosenDate.getTime()) || chosenDate.getTime() <= Date.now()) {
    return { ok: false, error: "El horario elegido ya no es válido." };
  }

  const supabase = getSupabaseAdmin();
  const windowEnd = new Date(chosenDate.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const { data: busyRows } = await supabase
    .from("evaluations")
    .select("scheduled_at, duracion_min")
    .or(`trainer_id.eq.${proposal.trainer_id},client_id.eq.${proposal.client_id}`)
    .neq("status", "cancelada")
    .gte("scheduled_at", new Date().toISOString())
    .lte("scheduled_at", windowEnd);
  const chosenStart = chosenDate.getTime();
  const chosenEnd = chosenStart + item.duration_min * 60_000;
  const conflict = (busyRows ?? [])
    .filter((r): r is { scheduled_at: string; duracion_min: number } => Boolean(r.scheduled_at))
    .some((r) => {
      const start = new Date(r.scheduled_at).getTime();
      const end = start + r.duracion_min * 60_000;
      return chosenStart < end && chosenEnd > start;
    });
  if (conflict) return { ok: false, error: "Ese horario ya no está disponible — elige otro." };

  const created = await createAppointmentFromProposalItem({
    trainerId: proposal.trainer_id,
    clientId: proposal.client_id,
    scheduledAt: chosenDate.toISOString(),
    durationMin: item.duration_min,
    modalidad: item.modalidad,
  });
  if (!created.ok) return created;

  await supabase
    .from("session_proposal_items")
    .update({ status: "aprobada", scheduled_at: chosenDate.toISOString(), evaluation_id: created.id })
    .eq("id", item.id);

  await maybeCompleteProposal(proposal.id);
  return { ok: true };
}
