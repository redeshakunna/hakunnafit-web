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

export interface AgendaEventRow {
  id: string;
  clientId: string;
  clientFullName: string;
  clientWhatsapp: string | null;
  scheduledAt: string;
  durationMin: number;
  titulo: string | null;
  notas: string | null;
  status: string;
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
    status: string;
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
  status?: string;
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
    status?: string;
    updated_at: string;
  } = { updated_at: new Date().toISOString() };
  if (input.scheduledAt !== undefined) update.scheduled_at = input.scheduledAt;
  if (input.durationMin !== undefined) update.duracion_min = input.durationMin;
  if (input.titulo !== undefined) update.titulo = input.titulo || null;
  if (input.notas !== undefined) update.notas = input.notas || null;
  if (input.status !== undefined) update.status = input.status;

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
 * Link de WhatsApp con recordatorio prellenado — el entrenador confirma el
 * envío manual (mismo patrón que el resto de links de WhatsApp del
 * proyecto), no se manda nada automático.
 */
export function buildAppointmentWhatsappReminder(input: {
  clientFullName: string;
  clientWhatsapp: string;
  scheduledAt: string;
  titulo: string | null;
}): string {
  const fecha = new Date(input.scheduledAt).toLocaleString("es-CO", { dateStyle: "full", timeStyle: "short" });
  const digits = input.clientWhatsapp.replace(/\D/g, "");
  const texto = `Hola ${input.clientFullName}! Te recuerdo tu cita${
    input.titulo ? ` de ${input.titulo}` : ""
  } el ${fecha}. ¡Nos vemos! 💪`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(texto)}`;
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
