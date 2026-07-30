"use server";

// Acciones de servidor del módulo Agenda (/panel/agenda) — CRUD real de citas
// sobre "evaluations" (ya existía para valoraciones, ahora es la tabla base
// de toda la agenda: título/tipo, notas y duración lo vuelven una cita
// genérica, no solo una valoración inicial). Cada cita se sincroniza como
// evento de Google Calendar en las cuentas que estén conectadas — la del
// entrenador (google_calendar_connections owner_type='trainer') y la del
// cliente si él mismo conectó la suya desde /agenda/conectar/[token]. Los dos
// eventos son independientes (cada uno vive en un calendario de una cuenta de
// Google distinta) y se referencian en evaluation_calendar_events.

import { getSupabaseAdmin } from "./supabase-admin";
import { requireTrainer } from "./trainer-auth";
import type { AdminActionResult } from "./admin-actions";
import { getConnection, createCalendarEvent, updateCalendarEvent, deleteCalendarEvent, type GoogleConnectionRow } from "./google-calendar";
import type { RoutineDias } from "./routine-types";
import { daysSinceLastTraining, isInactivityAlert } from "./training-stats";
import { AGENDA_WORKING_HOURS, type AppointmentStatus, type AppointmentModalidad } from "./agenda-constants";

// AGENDA_WORKING_HOURS, AppointmentStatus, AppointmentModalidad y
// APPOINTMENT_STATUS_LABELS viven en ./agenda-constants (no son server
// actions, no pueden ir en un archivo "use server") — se re-exportan los
// tipos aquí (borrados en runtime, no rompen la regla) para no tener que
// tocar cada archivo que ya los importaba de aquí como tipo.
export type { AppointmentStatus, AppointmentModalidad };

export interface AgendaEventRow {
  id: string;
  clientId: string;
  clientFullName: string;
  clientWhatsapp: string | null;
  scheduledAt: string;
  durationMin: number;
  titulo: string | null;
  notas: string | null;
  status: AppointmentStatus;
  modalidad: AppointmentModalidad;
  sessionNumber: number;
  syncedToTrainerGoogle: boolean;
  syncedToClientGoogle: boolean;
}

async function assertOwnClient(clientId: string): Promise<{ trainerId: string; email: string | null }> {
  const trainer = await requireTrainer();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("clients").select("id, trainer_id, email").eq("id", clientId).maybeSingle();
  if (error || !data || data.trainer_id !== trainer.id) {
    throw new Error("Cliente no encontrado.");
  }
  return { trainerId: trainer.id, email: data.email };
}

/**
 * Citas de un rango de fechas (vista mensual/semanal de la Agenda) — trae de
 * una vez el nombre y whatsapp del cliente (para el botón de recordatorio) y
 * si cada cita ya está sincronizada con algún Google Calendar, sin tener que
 * consultar evaluation_calendar_events por separado desde la UI.
 */
export async function getOwnAgendaEvents(rangeStartIso: string, rangeEndIso: string): Promise<AgendaEventRow[]> {
  const trainer = await requireTrainer();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("evaluations")
    .select("*, clients(full_name, whatsapp)")
    .eq("trainer_id", trainer.id)
    .neq("status", "cancelada")
    .gte("scheduled_at", rangeStartIso)
    .lte("scheduled_at", rangeEndIso)
    .order("scheduled_at", { ascending: true });
  if (error || !data) return [];

  interface EvaluationJoinRow {
    id: string;
    client_id: string;
    scheduled_at: string;
    duracion_min: number;
    titulo: string | null;
    notas: string | null;
    status: AppointmentStatus;
    modalidad: AppointmentModalidad;
    clients: { full_name: string; whatsapp: string | null } | null;
  }
  const rows = data as unknown as EvaluationJoinRow[];

  const evaluationIds = rows.map((row) => row.id);
  const { data: links } = await supabase
    .from("evaluation_calendar_events")
    .select("evaluation_id, connection_id, google_calendar_connections(owner_type)")
    .in("evaluation_id", evaluationIds.length ? evaluationIds : [""]);

  interface LinkJoinRow {
    evaluation_id: string;
    google_calendar_connections: { owner_type: string } | null;
  }
  const linkRows = (links ?? []) as unknown as LinkJoinRow[];

  const trainerSynced = new Set<string>();
  const clientSynced = new Set<string>();
  for (const link of linkRows) {
    const ownerType = link.google_calendar_connections?.owner_type;
    if (ownerType === "trainer") trainerSynced.add(link.evaluation_id);
    if (ownerType === "client") clientSynced.add(link.evaluation_id);
  }

  // Numeración de sesión (#N) por cliente — cuenta todas las citas que ese
  // cliente ha tenido con este entrenador hasta la fecha, no solo las del
  // rango visible, para que "Sesión #12" sea real y no reinicie cada mes.
  const clientIds = Array.from(new Set(rows.map((row) => row.client_id)));
  const { data: allEvals } = await supabase
    .from("evaluations")
    .select("id, client_id, scheduled_at")
    .eq("trainer_id", trainer.id)
    .neq("status", "cancelada")
    .in("client_id", clientIds.length ? clientIds : [""])
    .order("scheduled_at", { ascending: true });

  const sessionNumberByEvalId = new Map<string, number>();
  const counters = new Map<string, number>();
  for (const row of (allEvals ?? []) as { id: string; client_id: string }[]) {
    const n = (counters.get(row.client_id) ?? 0) + 1;
    counters.set(row.client_id, n);
    sessionNumberByEvalId.set(row.id, n);
  }

  return rows.map((row) => {
    const { clients, ...rest } = row;
    return {
      id: rest.id,
      clientId: rest.client_id,
      clientFullName: clients?.full_name ?? "Cliente",
      clientWhatsapp: clients?.whatsapp ?? null,
      scheduledAt: rest.scheduled_at,
      durationMin: rest.duracion_min,
      titulo: rest.titulo,
      notas: rest.notas,
      status: rest.status,
      modalidad: rest.modalidad,
      sessionNumber: sessionNumberByEvalId.get(rest.id) ?? 1,
      syncedToTrainerGoogle: trainerSynced.has(rest.id),
      syncedToClientGoogle: clientSynced.has(rest.id),
    };
  });
}

async function syncAppointmentToGoogle(
  evaluationId: string,
  clientId: string,
  trainerId: string,
  event: { summary: string; description?: string; startIso: string; endIso: string; clientEmail: string | null }
): Promise<void> {
  const supabase = getSupabaseAdmin();

  const owners: { type: "trainer" | "client"; id: string }[] = [
    { type: "trainer", id: trainerId },
    { type: "client", id: clientId },
  ];

  for (const owner of owners) {
    const connection = await getConnection(owner.type, owner.id);
    if (!connection) continue;

    const { data: existingLink } = await supabase
      .from("evaluation_calendar_events")
      .select("id, google_event_id")
      .eq("evaluation_id", evaluationId)
      .eq("connection_id", connection.id)
      .maybeSingle();

    if (existingLink) {
      await updateCalendarEvent(connection, existingLink.google_event_id, {
        summary: event.summary,
        description: event.description,
        startIso: event.startIso,
        endIso: event.endIso,
        attendeeEmail: owner.type === "trainer" ? event.clientEmail : null,
      });
      continue;
    }

    const googleEventId = await createCalendarEvent(connection, {
      summary: event.summary,
      description: event.description,
      startIso: event.startIso,
      endIso: event.endIso,
      // El attendee solo tiene sentido en el calendario del entrenador (para
      // invitar al cliente por si no conectó el suyo) — en el propio
      // calendario del cliente el evento ya es de su cuenta, no hace falta.
      attendeeEmail: owner.type === "trainer" ? event.clientEmail : null,
    });
    if (googleEventId) {
      await supabase
        .from("evaluation_calendar_events")
        .insert({ evaluation_id: evaluationId, connection_id: connection.id, google_event_id: googleEventId });
    }
  }
}

async function deleteAppointmentFromGoogle(evaluationId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { data: links } = await supabase
    .from("evaluation_calendar_events")
    .select("id, google_event_id, connection_id, google_calendar_connections(*)")
    .eq("evaluation_id", evaluationId);

  interface LinkFullRow {
    google_event_id: string;
    google_calendar_connections: GoogleConnectionRow | null;
  }
  const linkRows = (links ?? []) as unknown as LinkFullRow[];

  for (const link of linkRows) {
    if (link.google_calendar_connections) await deleteCalendarEvent(link.google_calendar_connections, link.google_event_id);
  }
  await supabase.from("evaluation_calendar_events").delete().eq("evaluation_id", evaluationId);
}

export interface CreateAppointmentInput {
  clientId: string;
  scheduledAt: string;
  durationMin: number;
  titulo?: string | null;
  notas?: string | null;
  modalidad?: AppointmentModalidad;
}

export async function createOwnAppointment(input: CreateAppointmentInput): Promise<AdminActionResult & { id?: string }> {
  const { trainerId, email } = await assertOwnClient(input.clientId);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("evaluations")
    .insert({
      client_id: input.clientId,
      trainer_id: trainerId,
      scheduled_at: input.scheduledAt,
      duracion_min: input.durationMin,
      titulo: input.titulo || null,
      notas: input.notas || null,
      modalidad: input.modalidad ?? "presencial",
      status: "pendiente",
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "No se pudo crear la cita." };

  const start = new Date(input.scheduledAt);
  const end = new Date(start.getTime() + input.durationMin * 60_000);
  await syncAppointmentToGoogle(data.id, input.clientId, trainerId, {
    summary: input.titulo || "Cita HakunnaFit",
    description: input.notas || undefined,
    startIso: start.toISOString(),
    endIso: end.toISOString(),
    clientEmail: email,
  });

  await supabase.from("trainer_activity").insert({ trainer_id: trainerId, type: "cita_agendada", title: "Nueva cita agendada" });

  return { ok: true, id: data.id };
}

export interface UpdateAppointmentInput {
  scheduledAt?: string;
  durationMin?: number;
  titulo?: string | null;
  notas?: string | null;
  status?: AppointmentStatus;
  modalidad?: AppointmentModalidad;
}

export async function updateOwnAppointment(evaluationId: string, input: UpdateAppointmentInput): Promise<AdminActionResult> {
  const trainer = await requireTrainer();
  const supabase = getSupabaseAdmin();
  const { data: existing, error: findError } = await supabase
    .from("evaluations")
    .select("*")
    .eq("id", evaluationId)
    .maybeSingle();
  if (findError || !existing || existing.trainer_id !== trainer.id) return { ok: false, error: "Cita no encontrada." };

  const update: {
    scheduled_at?: string;
    duracion_min?: number;
    titulo?: string | null;
    notas?: string | null;
    status?: AppointmentStatus;
    modalidad?: AppointmentModalidad;
    updated_at: string;
  } = { updated_at: new Date().toISOString() };
  if (input.scheduledAt !== undefined) update.scheduled_at = input.scheduledAt;
  if (input.durationMin !== undefined) update.duracion_min = input.durationMin;
  if (input.titulo !== undefined) update.titulo = input.titulo || null;
  if (input.notas !== undefined) update.notas = input.notas || null;
  if (input.status !== undefined) update.status = input.status;
  if (input.modalidad !== undefined) update.modalidad = input.modalidad;

  const { error } = await supabase.from("evaluations").update(update).eq("id", evaluationId);
  if (error) return { ok: false, error: error.message };

  if (input.status === "cancelada") {
    await deleteAppointmentFromGoogle(evaluationId);
  } else if (input.scheduledAt !== undefined || input.durationMin !== undefined || input.titulo !== undefined || input.notas !== undefined) {
    const scheduledAt = input.scheduledAt ?? (existing.scheduled_at as string);
    const durationMin = input.durationMin ?? existing.duracion_min;
    const titulo = input.titulo !== undefined ? input.titulo : existing.titulo;
    const notas = input.notas !== undefined ? input.notas : existing.notas;
    const { data: client } = await supabase.from("clients").select("email").eq("id", existing.client_id).maybeSingle();
    const start = new Date(scheduledAt);
    const end = new Date(start.getTime() + durationMin * 60_000);
    await syncAppointmentToGoogle(evaluationId, existing.client_id, trainer.id, {
      summary: titulo || "Cita HakunnaFit",
      description: notas || undefined,
      startIso: start.toISOString(),
      endIso: end.toISOString(),
      clientEmail: client?.email ?? null,
    });
  }

  return { ok: true };
}

export async function cancelOwnAppointment(evaluationId: string): Promise<AdminActionResult> {
  const trainer = await requireTrainer();
  const supabase = getSupabaseAdmin();
  const { data: existing } = await supabase.from("evaluations").select("id, trainer_id").eq("id", evaluationId).maybeSingle();
  if (!existing || existing.trainer_id !== trainer.id) return { ok: false, error: "Cita no encontrada." };

  await deleteAppointmentFromGoogle(evaluationId);
  const { error } = await supabase.from("evaluations").delete().eq("id", evaluationId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Botón "Sincronizar" de la Agenda — reempuja todas las citas del rango
 * visible a Google (útil si el entrenador o un cliente conectó su Google
 * después de que la cita ya existía; syncAppointmentToGoogle es idempotente,
 * así que esto nunca duplica eventos).
 */
export async function resyncOwnAgendaToGoogle(rangeStartIso: string, rangeEndIso: string): Promise<AdminActionResult> {
  const trainer = await requireTrainer();
  const supabase = getSupabaseAdmin();
  const events = await getOwnAgendaEvents(rangeStartIso, rangeEndIso);

  for (const ev of events) {
    const { data: client } = await supabase.from("clients").select("email").eq("id", ev.clientId).maybeSingle();
    const start = new Date(ev.scheduledAt);
    const end = new Date(start.getTime() + ev.durationMin * 60_000);
    await syncAppointmentToGoogle(ev.id, ev.clientId, trainer.id, {
      summary: ev.titulo || "Cita HakunnaFit",
      description: ev.notas || undefined,
      startIso: start.toISOString(),
      endIso: end.toISOString(),
      clientEmail: client?.email ?? null,
    });
  }
  return { ok: true };
}

// (buildAppointmentWhatsappReminder se movió a lib/agenda-whatsapp.ts — este
// archivo tiene "use server" y Next.js exige que todos sus exports sean
// funciones async; esa era una función pura de construcción de string.)

// ---------------------------------------------------------------------------
// Tips estilo HakAI — reglas simples sobre datos reales, no IA todavía. El
// día que exista el asistente HakAI de verdad, este es el único lugar a
// reemplazar (la UI ya está armada para mostrar una lista de tips).
// ---------------------------------------------------------------------------

export interface AgendaTip {
  id: string;
  message: string;
  tone: "warning" | "info";
}

function formatHour(d: Date): string {
  return d.toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit" });
}

/** Primer hueco libre de al menos 60 min dentro del horario de trabajo del
 * día — usado tanto para el tip como, potencialmente, para sugerir horarios
 * al agendar. */
function findFirstFreeGap(events: AgendaEventRow[], dayDate: Date): { startLabel: string; endLabel: string } | null {
  const windowStart = new Date(dayDate);
  windowStart.setHours(AGENDA_WORKING_HOURS.start, 0, 0, 0);
  const windowEnd = new Date(dayDate);
  windowEnd.setHours(AGENDA_WORKING_HOURS.end, 0, 0, 0);

  const busy = events
    .map((e) => ({ start: new Date(e.scheduledAt), end: new Date(new Date(e.scheduledAt).getTime() + e.durationMin * 60_000) }))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  let cursor = windowStart;
  for (const b of busy) {
    if (b.start.getTime() - cursor.getTime() >= 60 * 60_000) {
      return { startLabel: formatHour(cursor), endLabel: formatHour(b.start) };
    }
    if (b.end.getTime() > cursor.getTime()) cursor = b.end;
  }
  if (windowEnd.getTime() - cursor.getTime() >= 60 * 60_000) {
    return { startLabel: formatHour(cursor), endLabel: formatHour(windowEnd) };
  }
  return null;
}

/**
 * Tips del día: clientes activos inactivos (mismo criterio que la alerta de
 * /panel/clientes), citas de hoy sin confirmar, y el primer hueco libre del
 * día — máximo 4, para que el banner no crezca sin control.
 */
export async function getOwnAgendaTips(dateIso: string): Promise<AgendaTip[]> {
  const trainer = await requireTrainer();
  const supabase = getSupabaseAdmin();
  const tips: AgendaTip[] = [];

  const { data: clients } = await supabase
    .from("clients")
    .select("id, full_name, dias_por_semana")
    .eq("trainer_id", trainer.id)
    .eq("status", "activo");

  if (clients?.length) {
    const clientIds = clients.map((c) => c.id);
    const { data: logs } = await supabase.from("training_logs").select("client_id, fecha").in("client_id", clientIds);
    const lastByClient = new Map<string, string>();
    for (const log of logs ?? []) {
      const prev = lastByClient.get(log.client_id);
      if (!prev || log.fecha > prev) lastByClient.set(log.client_id, log.fecha);
    }
    for (const c of clients) {
      const last = lastByClient.get(c.id);
      const daysSince = daysSinceLastTraining(last ? [last] : []);
      if (isInactivityAlert(daysSince, c.dias_por_semana)) {
        tips.push({
          id: `inactivo-${c.id}`,
          tone: "warning",
          message: `${c.full_name} lleva ${daysSince} día${daysSince === 1 ? "" : "s"} sin entrenar.`,
        });
      }
    }
  }

  const dayDate = new Date(dateIso);
  const dayStart = new Date(dayDate);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayDate);
  dayEnd.setHours(23, 59, 59, 999);
  const events = await getOwnAgendaEvents(dayStart.toISOString(), dayEnd.toISOString());

  for (const ev of events.filter((e) => e.status === "pendiente")) {
    tips.push({ id: `pendiente-${ev.id}`, tone: "info", message: `${ev.clientFullName} aún no confirma su cita de hoy.` });
  }

  const gap = findFirstFreeGap(events, dayDate);
  if (gap) {
    tips.push({ id: "hueco-libre", tone: "info", message: `Tienes un espacio libre de ${gap.startLabel} a ${gap.endLabel}.` });
  }

  return tips.slice(0, 4);
}

// ---------------------------------------------------------------------------
// Overlay semanal de entrenos (a partir de las rutinas con diaSemana)
// ---------------------------------------------------------------------------

export interface WeeklyTrainingOverlayRow {
  weekday: number;
  clientId: string;
  clientFullName: string;
  dayName: string;
}

/**
 * Para cada cliente con rutina activa, extrae los días que el entrenador
 * marcó con un día de la semana fijo (diaSemana) — alimenta el resumen
 * "quién entrena hoy" de la Agenda. Las rutinas sin ese campo (creadas antes
 * de este cambio, o dejadas en "sin día fijo" a propósito) simplemente no
 * aportan filas aquí.
 */
export async function getOwnWeeklyTrainingOverlay(): Promise<WeeklyTrainingOverlayRow[]> {
  const trainer = await requireTrainer();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("weekly_plans")
    .select("dias, clients(id, full_name)")
    .eq("trainer_id", trainer.id);
  if (error || !data) return [];

  interface WeeklyPlanJoinRow {
    dias: RoutineDias;
    clients: { id: string; full_name: string } | null;
  }
  const plans = data as unknown as WeeklyPlanJoinRow[];

  const rows: WeeklyTrainingOverlayRow[] = [];
  for (const plan of plans) {
    const client = plan.clients;
    if (!client) continue;
    const dias = plan.dias ?? [];
    for (const day of dias) {
      if (day.descanso) continue;
      if (day.diaSemana === null || day.diaSemana === undefined) continue;
      rows.push({ weekday: day.diaSemana, clientId: client.id, clientFullName: client.full_name, dayName: day.nombre });
    }
  }
  return rows;
}
