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
import type { AdminActionResult, TrainerRow } from "./admin-actions";
import {
  getConnection,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  getEventAttendeeStatus,
  type GoogleConnectionRow,
} from "./google-calendar";
import type { RoutineDias } from "./routine-types";
import { daysSinceLastTraining, isInactivityAlert } from "./training-stats";
import {
  AGENDA_WORKING_HOURS,
  MODALIDAD_LABEL,
  formatApptDateTime,
  trainerBranding,
  type AppointmentStatus,
  type AppointmentModalidad,
} from "./agenda-constants";
import { sendEmail, type EmailContext } from "./mail";

// AGENDA_WORKING_HOURS, AppointmentStatus, AppointmentModalidad,
// APPOINTMENT_STATUS_LABELS, MODALIDAD_LABEL, formatApptDateTime y
// trainerBranding viven en ./agenda-constants (no son server actions, no
// pueden ir en un archivo "use server") — se re-exportan los tipos aquí
// (borrados en runtime, no rompen la regla) para no tener que tocar cada
// archivo que ya los importaba de aquí como tipo.
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

/** Título del evento de Google Calendar — antes era solo el título suelto
 * (ej. "Seguimiento"), que no dice con quién ni de qué negocio es la cita. */
function buildEventSummary(titulo: string | null | undefined, clientName: string): string {
  return `${titulo?.trim() || "Cita"} — ${clientName}`;
}

/** Descripción del evento de Google Calendar — antes era solo las notas
 * libres del entrenador (casi siempre vacías). Ahora siempre incluye quién
 * es el cliente, con qué negocio es la cita y la modalidad, y agrega las
 * notas del entrenador al final si existen. */
function buildEventDescription(input: {
  clientName: string;
  businessName: string;
  modalidad: AppointmentModalidad;
  notas?: string | null;
}): string {
  const lines = [
    `Cliente: ${input.clientName}`,
    `Entrenador: ${input.businessName}`,
    `Modalidad: ${MODALIDAD_LABEL[input.modalidad]}`,
  ];
  if (input.notas?.trim()) lines.push("", `Notas: ${input.notas.trim()}`);
  lines.push("", "Agendado a través de HakunnaFit.");
  return lines.join("\n");
}

type AppointmentEmailKind = "creada" | "reprogramada" | "cancelada";

const APPOINTMENT_EMAIL_COPY: Record<
  AppointmentEmailKind,
  { verbo: string; trainerVerb: string; clientVerb: string }
> = {
  creada: { verbo: "agendada", trainerVerb: "Se agendó una nueva cita", clientVerb: "te agendó una cita" },
  reprogramada: { verbo: "reprogramada", trainerVerb: "Se reprogramó una cita", clientVerb: "reprogramó tu cita" },
  cancelada: { verbo: "cancelada", trainerVerb: "Se canceló una cita", clientVerb: "canceló tu cita" },
};

/**
 * Notifica por correo tanto al entrenador como al cliente cuando se crea,
 * reprograma o cancela una cita — hasta ahora la única forma de enterarse
 * era ver el evento en Google Calendar (y solo si tenían su cuenta
 * conectada), así que un cliente sin Google conectado nunca se enteraba de
 * nada. Migrado al motor de correos (lib/mail): el correo ahora se ve con
 * el logo/colores reales del entrenador (marca "trainer"), no con la marca
 * genérica de HakunnaFit — ver docs/EMAIL_ARCHITECTURE.md sección 1. Si
 * falta RESEND_API_KEY, sendEmail no lanza error, solo lo deja registrado
 * en email_log como "skipped_config".
 */
async function notifyAppointment(
  kind: AppointmentEmailKind,
  trainer: TrainerRow,
  client: OwnClientBasics,
  appt: {
    titulo?: string | null;
    scheduledAt: string;
    modalidad: AppointmentModalidad;
    notas?: string | null;
    meetLink?: string | null;
  }
): Promise<void> {
  const copy = APPOINTMENT_EMAIL_COPY[kind];
  const { dateLabel, timeLabel } = formatApptDateTime(appt.scheduledAt);
  const modalidadLabel = MODALIDAD_LABEL[appt.modalidad];
  const tituloLabel = appt.titulo?.trim() || "Cita";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://hakunnafit.com";
  const brand = { kind: "trainer" as const, trainer: trainerBranding(trainer) };
  const flowId = `agenda-cita-${kind}`;

  // Si hay link de Google Meet y la cita sigue en pie, el botón principal
  // lleva directo a la videollamada (lo más accionable) en vez de al panel
  // — a una cita cancelada no tiene sentido ofrecerle "unirse".
  const meetLink = kind !== "cancelada" ? appt.meetLink : null;

  const infoBox = {
    rows: [
      { label: "Fecha", value: dateLabel },
      { label: "Hora", value: timeLabel },
      { label: "Modalidad", value: modalidadLabel },
      ...(meetLink ? [{ label: "Link de la sesión", value: meetLink }] : []),
      ...(appt.notas?.trim() ? [{ label: "Notas", value: appt.notas.trim() }] : []),
    ],
  };

  const trainerContext: EmailContext = {
    brand,
    audience: "trainer",
    to: trainer.email || "",
    recipientName: trainer.full_name || trainer.business_name,
    subject: `${copy.trainerVerb}: ${client.fullName} — ${dateLabel}`,
    heading: `${tituloLabel} con ${client.fullName}`,
    message: `${copy.trainerVerb} con ${client.fullName}.`,
    primaryButton: meetLink
      ? { label: "Unirse a la videollamada", url: meetLink }
      : { label: "Ver en la Agenda", url: `${siteUrl}/panel/agenda` },
    infoBox,
  };

  const clientContext: EmailContext = {
    brand,
    audience: "client",
    to: client.email || "",
    recipientName: client.fullName,
    subject: `${trainer.business_name} ${copy.clientVerb} — ${dateLabel}`,
    heading: `Tu cita ${copy.verbo}`,
    message: `${trainer.business_name} ${copy.clientVerb}.`,
    primaryButton: meetLink ? { label: "Unirse a la videollamada", url: meetLink } : undefined,
    infoBox,
  };

  await Promise.all([
    trainer.email ? sendEmail({ flowId, category: "trainer", context: trainerContext }) : Promise.resolve(),
    client.email ? sendEmail({ flowId, category: "client", context: clientContext }) : Promise.resolve(),
  ]);
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

/**
 * Sincroniza la cita con Google Calendar en cada cuenta conectada (la del
 * entrenador y/o la del cliente) y devuelve el link de Google Meet a
 * guardar en evaluations.meet_link — o null si la cita es presencial, si
 * nadie tiene Google conectado, o si la llamada a Google falló. Se prioriza
 * el link generado en el calendario del entrenador (ahí es donde vive la
 * invitación "oficial" con Sí/No/Tal vez) sobre el del cliente; en un
 * update (evento ya existía) no se pide un link nuevo — updateCalendarEvent
 * preserva el que ya se había mandado por correo.
 */
async function syncAppointmentToGoogle(
  evaluationId: string,
  clientId: string,
  trainerId: string,
  event: {
    summary: string;
    description?: string;
    startIso: string;
    endIso: string;
    clientEmail: string | null;
    requestMeetLink: boolean;
  }
): Promise<string | null> {
  const supabase = getSupabaseAdmin();

  const owners: { type: "trainer" | "client"; id: string }[] = [
    { type: "trainer", id: trainerId },
    { type: "client", id: clientId },
  ];

  let meetLink: string | null = null;

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

    const created = await createCalendarEvent(connection, {
      summary: event.summary,
      description: event.description,
      startIso: event.startIso,
      endIso: event.endIso,
      // El attendee solo tiene sentido en el calendario del entrenador (para
      // invitar al cliente por si no conectó el suyo) — en el propio
      // calendario del cliente el evento ya es de su cuenta, no hace falta.
      attendeeEmail: owner.type === "trainer" ? event.clientEmail : null,
      requestMeetLink: event.requestMeetLink,
    });
    if (created) {
      await supabase
        .from("evaluation_calendar_events")
        .insert({ evaluation_id: evaluationId, connection_id: connection.id, google_event_id: created.eventId });
      if (created.meetLink && (owner.type === "trainer" || !meetLink)) meetLink = created.meetLink;
    }
  }

  return meetLink;
}

/**
 * Revisa el RSVP de Google en las citas 'pendiente' que tienen invitación
 * mandada desde el calendario del ENTRENADOR (el único lugar donde el
 * cliente aparece como invitado con los botones Sí/No/Tal vez — un evento
 * creado directo en el propio calendario del cliente no tiene RSVP que
 * revisar) y las pasa a 'confirmada' si el cliente ya aceptó.
 *
 * Sin scopeTrainerId revisa TODAS las citas de la plataforma — la usa el
 * cron diario (app/api/cron/sync-rsvp). Con scopeTrainerId solo las de ese
 * entrenador — la usa el botón "Sincronizar" de la Agenda, para dar una
 * confirmación al instante sin depender de esperar al cron del día
 * siguiente (el plan de Vercel de HakunnaFit no permite crons más
 * frecuentes que 1 vez al día).
 */
export async function syncPendingAppointmentRsvps(scopeTrainerId?: string): Promise<{ checked: number; confirmed: number }> {
  const supabase = getSupabaseAdmin();

  let query = supabase
    .from("evaluations")
    .select("id, client_id")
    .eq("status", "pendiente")
    .gt("scheduled_at", new Date().toISOString());
  if (scopeTrainerId) query = query.eq("trainer_id", scopeTrainerId);
  const { data: pending } = await query;
  if (!pending || pending.length === 0) return { checked: 0, confirmed: 0 };

  const evaluationIds = pending.map((p) => p.id);
  const { data: links } = await supabase
    .from("evaluation_calendar_events")
    .select("evaluation_id, google_event_id, google_calendar_connections(*)")
    .in("evaluation_id", evaluationIds);

  interface RsvpLinkRow {
    evaluation_id: string;
    google_event_id: string;
    google_calendar_connections: GoogleConnectionRow | null;
  }
  // Filtro en JS (no en la query) — mismo criterio que ya usa
  // deleteAppointmentFromGoogle más abajo para esta misma tabla.
  const linkRows = ((links ?? []) as unknown as RsvpLinkRow[]).filter(
    (l) => l.google_calendar_connections?.owner_type === "trainer"
  );
  if (linkRows.length === 0) return { checked: 0, confirmed: 0 };

  const clientIdByEvalId = new Map(pending.map((p) => [p.id, p.client_id]));
  const clientIds = Array.from(new Set(pending.map((p) => p.client_id)));
  const { data: clients } = await supabase.from("clients").select("id, email").in("id", clientIds);
  const emailByClientId = new Map((clients ?? []).map((c) => [c.id, c.email]));

  let checked = 0;
  let confirmed = 0;
  for (const link of linkRows) {
    const clientId = clientIdByEvalId.get(link.evaluation_id);
    const clientEmail = clientId ? emailByClientId.get(clientId) : null;
    if (!clientEmail || !link.google_calendar_connections) continue;

    checked++;
    const status = await getEventAttendeeStatus(link.google_calendar_connections, link.google_event_id, clientEmail);
    if (status === "accepted") {
      await supabase.from("evaluations").update({ status: "confirmada" }).eq("id", link.evaluation_id);
      confirmed++;
    }
  }
  return { checked, confirmed };
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

/**
 * Crea una cita real (evaluations) a partir de un item de propuesta de
 * sesiones ya aprobado por el cliente — ver
 * lib/public-session-proposal-actions.ts. Mismo camino que
 * createOwnAppointment (sync a Google Calendar + Meet automático si es
 * virtual + correo de confirmación a entrenador y cliente), pero sin pasar
 * por requireTrainer(): quien aprueba acá es el cliente desde un link
 * público sin sesión, así que el caller ya validó el token/item antes de
 * llamar esto y pasa trainerId/clientId directo.
 */
export async function createAppointmentFromProposalItem(input: {
  trainerId: string;
  clientId: string;
  scheduledAt: string;
  durationMin: number;
  modalidad: AppointmentModalidad;
  titulo?: string | null;
}): Promise<AdminActionResult & { id?: string }> {
  const supabase = getSupabaseAdmin();
  const { data: trainerRow } = await supabase.from("trainers").select("*").eq("id", input.trainerId).maybeSingle();
  const { data: clientRow } = await supabase.from("clients").select("id, full_name, email").eq("id", input.clientId).maybeSingle();
  if (!trainerRow || !clientRow) return { ok: false, error: "Entrenador o cliente no encontrado." };
  const trainer = trainerRow as unknown as TrainerRow;
  const client: OwnClientBasics = { id: clientRow.id, fullName: clientRow.full_name ?? "Cliente", email: clientRow.email };

  const { data, error } = await supabase
    .from("evaluations")
    .insert({
      client_id: input.clientId,
      trainer_id: input.trainerId,
      scheduled_at: input.scheduledAt,
      duracion_min: input.durationMin,
      titulo: input.titulo || "Sesión de entrenamiento",
      modalidad: input.modalidad,
      status: "pendiente",
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "No se pudo agendar la sesión." };

  const start = new Date(input.scheduledAt);
  const end = new Date(start.getTime() + input.durationMin * 60_000);
  const meetLink = await syncAppointmentToGoogle(data.id, input.clientId, input.trainerId, {
    summary: buildEventSummary(input.titulo, client.fullName),
    description: buildEventDescription({
      clientName: client.fullName,
      businessName: trainer.business_name,
      modalidad: input.modalidad,
    }),
    startIso: start.toISOString(),
    endIso: end.toISOString(),
    clientEmail: client.email,
    requestMeetLink: input.modalidad === "virtual",
  });
  if (meetLink) await supabase.from("evaluations").update({ meet_link: meetLink }).eq("id", data.id);

  await supabase
    .from("trainer_activity")
    .insert({ trainer_id: input.trainerId, type: "cita_agendada", title: "Sesión aprobada por el cliente" });

  await notifyAppointment("creada", trainer, client, {
    titulo: input.titulo,
    scheduledAt: input.scheduledAt,
    modalidad: input.modalidad,
    meetLink,
  });

  return { ok: true, id: data.id };
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
  const { trainer, client } = await assertOwnClient(input.clientId);
  const modalidad = input.modalidad ?? "presencial";
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("evaluations")
    .insert({
      client_id: input.clientId,
      trainer_id: trainer.id,
      scheduled_at: input.scheduledAt,
      duracion_min: input.durationMin,
      titulo: input.titulo || null,
      notas: input.notas || null,
      modalidad,
      status: "pendiente",
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "No se pudo crear la cita." };

  const start = new Date(input.scheduledAt);
  const end = new Date(start.getTime() + input.durationMin * 60_000);
  const meetLink = await syncAppointmentToGoogle(data.id, input.clientId, trainer.id, {
    summary: buildEventSummary(input.titulo, client.fullName),
    description: buildEventDescription({
      clientName: client.fullName,
      businessName: trainer.business_name,
      modalidad,
      notas: input.notas,
    }),
    startIso: start.toISOString(),
    endIso: end.toISOString(),
    clientEmail: client.email,
    requestMeetLink: modalidad === "virtual",
  });
  if (meetLink) await supabase.from("evaluations").update({ meet_link: meetLink }).eq("id", data.id);

  await supabase.from("trainer_activity").insert({ trainer_id: trainer.id, type: "cita_agendada", title: "Nueva cita agendada" });

  await notifyAppointment("creada", trainer, client, {
    titulo: input.titulo,
    scheduledAt: input.scheduledAt,
    modalidad,
    notas: input.notas,
    meetLink,
  });

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

  const modalidad = input.modalidad !== undefined ? input.modalidad : (existing.modalidad as AppointmentModalidad);
  const dateOrDurationChanged = input.scheduledAt !== undefined || input.durationMin !== undefined;

  if (input.status === "cancelada") {
    await deleteAppointmentFromGoogle(evaluationId);
    const { data: client } = await supabase
      .from("clients")
      .select("id, email, full_name")
      .eq("id", existing.client_id)
      .maybeSingle();
    if (client) {
      await notifyAppointment(
        "cancelada",
        trainer,
        { id: client.id, fullName: client.full_name ?? "Cliente", email: client.email },
        { titulo: existing.titulo, scheduledAt: existing.scheduled_at as string, modalidad, notas: existing.notas }
      );
    }
  } else if (dateOrDurationChanged || input.titulo !== undefined || input.notas !== undefined || input.modalidad !== undefined) {
    const scheduledAt = input.scheduledAt ?? (existing.scheduled_at as string);
    const durationMin = input.durationMin ?? existing.duracion_min;
    const titulo = input.titulo !== undefined ? input.titulo : existing.titulo;
    const notas = input.notas !== undefined ? input.notas : existing.notas;
    const { data: client } = await supabase
      .from("clients")
      .select("id, email, full_name")
      .eq("id", existing.client_id)
      .maybeSingle();
    const clientBasics: OwnClientBasics = {
      id: existing.client_id,
      fullName: client?.full_name ?? "Cliente",
      email: client?.email ?? null,
    };
    const start = new Date(scheduledAt);
    const end = new Date(start.getTime() + durationMin * 60_000);
    const newMeetLink = await syncAppointmentToGoogle(evaluationId, existing.client_id, trainer.id, {
      summary: buildEventSummary(titulo, clientBasics.fullName),
      description: buildEventDescription({ clientName: clientBasics.fullName, businessName: trainer.business_name, modalidad, notas }),
      startIso: start.toISOString(),
      endIso: end.toISOString(),
      clientEmail: clientBasics.email,
      // Solo se pide un link nuevo si el evento de Google no existía todavía
      // (p. ej. pasó de presencial a virtual, o nadie tenía Google conectado
      // antes) — si ya había uno, syncAppointmentToGoogle no lo toca y acá se
      // sigue usando el que ya estaba guardado en evaluations.meet_link.
      requestMeetLink: modalidad === "virtual",
    });
    const meetLink = modalidad === "virtual" ? newMeetLink ?? (existing.meet_link as string | null) : null;
    if (newMeetLink) await supabase.from("evaluations").update({ meet_link: newMeetLink }).eq("id", evaluationId);
    else if (modalidad !== "virtual" && existing.meet_link) await supabase.from("evaluations").update({ meet_link: null }).eq("id", evaluationId);

    // Solo se avisa por correo si de verdad cambió fecha/hora (reprogramación
    // real) — si el entrenador solo editó el título o las notas, alcanza con
    // actualizar el evento de Google en silencio, sin mandar otro correo.
    if (dateOrDurationChanged) {
      await notifyAppointment("reprogramada", trainer, clientBasics, { titulo, scheduledAt, modalidad, notas, meetLink });
    }
  }

  return { ok: true };
}

export async function cancelOwnAppointment(evaluationId: string): Promise<AdminActionResult> {
  const trainer = await requireTrainer();
  const supabase = getSupabaseAdmin();
  const { data: existing } = await supabase
    .from("evaluations")
    .select("id, trainer_id, client_id, titulo, notas, scheduled_at, modalidad")
    .eq("id", evaluationId)
    .maybeSingle();
  if (!existing || existing.trainer_id !== trainer.id) return { ok: false, error: "Cita no encontrada." };

  await deleteAppointmentFromGoogle(evaluationId);
  const { error } = await supabase.from("evaluations").delete().eq("id", evaluationId);
  if (error) return { ok: false, error: error.message };

  const { data: client } = await supabase.from("clients").select("id, email, full_name").eq("id", existing.client_id).maybeSingle();
  if (client) {
    await notifyAppointment(
      "cancelada",
      trainer,
      { id: client.id, fullName: client.full_name ?? "Cliente", email: client.email },
      {
        titulo: existing.titulo,
        scheduledAt: existing.scheduled_at as string,
        modalidad: existing.modalidad as AppointmentModalidad,
        notas: existing.notas,
      }
    );
  }

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
    const meetLink = await syncAppointmentToGoogle(ev.id, ev.clientId, trainer.id, {
      summary: buildEventSummary(ev.titulo, ev.clientFullName),
      description: buildEventDescription({
        clientName: ev.clientFullName,
        businessName: trainer.business_name,
        modalidad: ev.modalidad,
        notas: ev.notas,
      }),
      startIso: start.toISOString(),
      endIso: end.toISOString(),
      clientEmail: client?.email ?? null,
      requestMeetLink: ev.modalidad === "virtual",
    });
    // Solo pisa meet_link si de verdad se generó uno nuevo (evento recién
    // creado en este resync) — si ya existía, syncAppointmentToGoogle
    // devuelve null a propósito y no hay que tocar lo que ya estaba guardado.
    if (meetLink) await supabase.from("evaluations").update({ meet_link: meetLink }).eq("id", ev.id);
  }

  // Además de empujar eventos, "Sincronizar" también revisa si algún
  // cliente ya aceptó su citación desde la última vez — así el entrenador
  // tiene una forma de confirmar al instante sin esperar al cron diario.
  await syncPendingAppointmentRsvps(trainer.id);

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
