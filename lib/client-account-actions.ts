"use server";

// Cuenta real del cliente final — /mi-cuenta. Reemplaza por completo el
// portal por token (lib/client-portal-actions.ts, retirado) ahora que el
// cliente tiene sesión de verdad (ver lib/client-auth.ts). Misma superficie
// de datos que el portal viejo, pero resuelta por sesión en vez de por
// token, más las acciones de edición que el portal nunca tuvo.
//
// Split de edición (pedido explícito del negocio):
// - "Mi perfil" (datos de presentación): nombre, whatsapp, foto — el cliente
//   sí puede cambiarlos. El correo queda de solo lectura a propósito: es el
//   identificador de su cuenta de Supabase Auth, cambiarlo es un flujo aparte
//   que no entra en este alcance básico.
// - "Mi hoja de vida": sexo, objetivo, nivel, actividad, peso, altura, perfil
//   deportivo — también editable por el cliente.
// - "Mi rutina" (weekly_plans): SOLO LECTURA. La arma y aprueba el
//   entrenador; el cliente nunca la toca desde acá.

import { getSupabaseAdmin } from "./supabase-admin";
import { getCurrentClient } from "./client-auth";
import { validateImageFile, imageExtension } from "./image-validation";
import type { AdminActionResult } from "./admin-actions";
import type { ClientRow, MeasurementRow } from "./trainer-clients-actions";
import type { RoutineRow } from "./trainer-routines-actions";
import type { PerfilCrossfit, PerfilRunning } from "./client-profile-types";
import type { Json } from "./database.types";
import {
  approveProposalItem,
  rejectAndReplaceItem,
  getReplacementSuggestions,
  type SuggestedSlot,
} from "./public-session-proposal-actions";

export type { SuggestedSlot };

async function requireOwnClient(): Promise<ClientRow> {
  const client = await getCurrentClient();
  if (!client) throw new Error("No autenticado");
  return client;
}

export interface OwnTrainerBranding {
  businessName: string;
  logoUrl: string | null;
  colorPrimario: string;
  colorSecundario: string;
  // Tercer color de marca (ver migración de task #231) — se suma acá para
  // que /mi-cuenta pueda usar el mismo sistema de 3 variables CSS
  // (--hf-primary/--hf-secondary/--hf-tertiary) que ya usan las plantillas de
  // landing (brandColorVars en starter-templates/types.ts), en vez de un
  // único accentColor plano. Así la cuenta del cliente se siente una
  // continuación visual de la landing del entrenador, no una pantalla aparte.
  colorTerciario: string;
  whatsapp: string | null;
  subdominio: string | null;
  // Rama del entrenador (running/crossfit/gym) — se usa solo para elegir la
  // foto de fondo tipo parallax de /mi-cuenta (lib/branch-theme.ts, mismo
  // mecanismo ya usado en las pantallas del panel del entrenador). No se usa
  // para nada funcional acá, solo para que la pantalla no se sienta vacía en
  // pantallas anchas.
  especialidad: string | null;
}

export interface OwnNextAppointment {
  // Id real en "evaluations" — se usa para el nombre/UID del evento al
  // generar el link de "agregar a mi calendario" (Google Calendar / .ics).
  id: string;
  scheduledAt: string;
  modalidad: string;
  duracionMin: number;
  meetLink: string | null;
  // Qué se va a hacer en la sesión — lo define el entrenador al agendar
  // (título libre, ej. "Piernas y glúteos", + notas). Las citas creadas
  // automáticamente al aprobar un plan de sesiones llevan el título por
  // defecto "Sesión de entrenamiento" y sin notas; las agendadas a mano
  // desde la Agenda del entrenador suelen traer detalle real. Se muestra en
  // /mi-cuenta para que el cliente sepa qué le espera, no solo cuándo.
  titulo: string | null;
  notas: string | null;
  // Estado real de la cita en "evaluations" (pendiente/completada) — se usa
  // para el badge "Confirmada"/"Completada" en la lista de "Próximas citas"
  // (calendario/semana) de /mi-cuenta. Toda fila en "evaluations" es, por
  // definición, una cita YA aprobada (se crea recién cuando el cliente
  // aprueba un ítem propuesto) — no hay estado "pendiente de aprobación" acá.
  status: string;
}

export interface OwnPendingItem {
  id: string;
  scheduledAt: string;
  durationMin: number;
  modalidad: string;
  status: "pendiente" | "aprobada" | "rechazada";
}

export interface OwnPendingProposal {
  proposalId: string;
  items: OwnPendingItem[];
}

export interface ClientAccountData {
  client: ClientRow;
  trainer: OwnTrainerBranding;
  routine: RoutineRow | null;
  nextAppointment: OwnNextAppointment | null;
  // Citas reales (evaluations, ya aprobadas) en una ventana de ~2 semanas —
  // alimenta la sección "Próximas citas" (vista tipo calendario/semana) en
  // /mi-cuenta. nextAppointment sigue existiendo para la tarjeta destacada
  // (es simplemente el primer elemento de esta lista que aún no pasó).
  upcomingAppointments: OwnNextAppointment[];
  pendingProposal: OwnPendingProposal | null;
  measurements: MeasurementRow[];
}

export async function getOwnClientDashboardData(): Promise<ClientAccountData | null> {
  const me = await getCurrentClient();
  if (!me) return null;

  // Ventana para "Próximas citas" (calendario/semana) — desde ayer (buffer de
  // zona horaria para no perder la cita de hoy temprano) hasta 14 días
  // adelante. No filtra "completada": el cliente debe poder ver, dentro de
  // esa ventana, tanto lo que ya pasó/hizo como lo que viene.
  const windowStart = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const windowEnd = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  const supabase = getSupabaseAdmin();
  const [{ data: trainer }, { data: routine }, { data: upcoming }, { data: proposal }, { data: measurements }] = await Promise.all([
    supabase
      .from("trainers")
      .select("business_name, logo_url, color_primario, color_secundario, color_terciario, whatsapp_publico, whatsapp, subdominio, especialidad")
      .eq("id", me.trainer_id)
      .maybeSingle(),
    supabase
      .from("weekly_plans")
      .select("*")
      .eq("client_id", me.id)
      .eq("status", "aprobado")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("evaluations")
      .select("id, scheduled_at, modalidad, duracion_min, meet_link, status, titulo, notas")
      .eq("client_id", me.id)
      .not("status", "eq", "cancelada")
      .not("scheduled_at", "is", null)
      .gte("scheduled_at", windowStart)
      .lte("scheduled_at", windowEnd)
      .order("scheduled_at", { ascending: true })
      .limit(20),
    // Última propuesta del cliente, sea cual sea su estado — antes filtraba
    // por status="pendiente", así que en cuanto se aprobaba/rechazaba la
    // última sesión de una propuesta (y esta pasaba a "completada") todo el
    // bloque desaparecía de /mi-cuenta sin dejar rastro de qué se había
    // aprobado. Ahora se trae la más reciente igual, y es ProposalSection
    // quien decide qué mostrar según el status de cada ítem.
    supabase.from("session_proposals").select("id, status").eq("client_id", me.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("measurements").select("*").eq("client_id", me.id).order("fecha", { ascending: false }),
  ]);

  if (!trainer) return null;

  const upcomingAppointments: OwnNextAppointment[] = ((upcoming ?? []) as {
    id: string;
    scheduled_at: string;
    modalidad: string;
    duracion_min: number;
    meet_link: string | null;
    status: string;
    titulo: string | null;
    notas: string | null;
  }[]).map((e) => ({
    id: e.id,
    scheduledAt: e.scheduled_at,
    modalidad: e.modalidad,
    duracionMin: e.duracion_min,
    meetLink: e.meet_link,
    status: e.status,
    titulo: e.titulo,
    notas: e.notas,
  }));
  const nextAppointment =
    upcomingAppointments.find((a) => a.status !== "completada" && new Date(a.scheduledAt).getTime() >= Date.now()) ?? null;

  let pendingProposal: OwnPendingProposal | null = null;
  if (proposal) {
    const { data: items } = await supabase
      .from("session_proposal_items")
      .select("id, scheduled_at, duration_min, modalidad, status")
      .eq("proposal_id", proposal.id)
      .order("scheduled_at", { ascending: true });
    pendingProposal = {
      proposalId: proposal.id,
      items: ((items ?? []) as { id: string; scheduled_at: string; duration_min: number; modalidad: string; status: string }[]).map(
        (i) => ({
          id: i.id,
          scheduledAt: i.scheduled_at,
          durationMin: i.duration_min,
          modalidad: i.modalidad,
          status: i.status as OwnPendingItem["status"],
        })
      ),
    };
  }

  return {
    client: me,
    trainer: {
      businessName: trainer.business_name,
      logoUrl: trainer.logo_url,
      colorPrimario: trainer.color_primario,
      colorSecundario: trainer.color_secundario,
      colorTerciario: trainer.color_terciario,
      whatsapp: trainer.whatsapp_publico?.trim() || trainer.whatsapp,
      subdominio: trainer.subdominio,
      especialidad: trainer.especialidad,
    },
    routine: (routine as RoutineRow | null) ?? null,
    nextAppointment,
    upcomingAppointments,
    pendingProposal,
    measurements: (measurements ?? []) as MeasurementRow[],
  };
}

// ---------------------------------------------------------------------------
// Mi perfil (datos de presentación) — nombre, whatsapp, foto. El correo NO
// se edita acá (ver comentario arriba).
// ---------------------------------------------------------------------------

export interface UpdateOwnPresentationInput {
  fullName?: string;
  whatsapp?: string | null;
}

export async function updateOwnPresentation(input: UpdateOwnPresentationInput): Promise<AdminActionResult> {
  const me = await requireOwnClient();

  const update: { full_name?: string; whatsapp?: string | null } = {};
  if (input.fullName !== undefined) {
    const trimmed = input.fullName.trim();
    if (!trimmed) return { ok: false, error: "Tu nombre no puede quedar vacío." };
    update.full_name = trimmed;
  }
  if (input.whatsapp !== undefined) update.whatsapp = input.whatsapp?.trim() || null;

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("clients").update(update).eq("id", me.id);
  if (error) return { ok: false, error: "No pudimos guardar tus datos." };
  return { ok: true };
}

export async function uploadOwnAvatar(formData: FormData): Promise<AdminActionResult & { url?: string }> {
  const me = await requireOwnClient();

  const validated = validateImageFile(formData.get("foto"));
  if (!validated.ok) return { ok: false, error: validated.error };

  const supabase = getSupabaseAdmin();
  const ext = imageExtension(validated.file);
  const path = `${me.trainer_id}/clientes/${me.id}/avatar-${Date.now()}.${ext}`;
  const buffer = Buffer.from(await validated.file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, buffer, { contentType: validated.file.type, upsert: true });
  if (uploadError) return { ok: false, error: uploadError.message };

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);

  const { error: updateError } = await supabase.from("clients").update({ avatar_url: data.publicUrl }).eq("id", me.id);
  if (updateError) return { ok: false, error: updateError.message };

  return { ok: true, url: data.publicUrl };
}

// ---------------------------------------------------------------------------
// Mi hoja de vida — todo editable salvo la rutina, que ni siquiera vive acá.
// ---------------------------------------------------------------------------

export interface UpdateOwnHojaDeVidaInput {
  sexo?: string | null;
  objetivo?: string | null;
  nivel?: string | null;
  actividad?: string | null;
  pesoActual?: number | null;
  altura?: number | null;
  perfilDeportivo?: (PerfilRunning | PerfilCrossfit) | null;
}

export async function updateOwnHojaDeVida(input: UpdateOwnHojaDeVidaInput): Promise<AdminActionResult> {
  const me = await requireOwnClient();

  const update: {
    sexo?: string | null;
    objetivo?: string | null;
    nivel?: string | null;
    actividad?: string | null;
    peso_actual?: number | null;
    altura?: number | null;
    perfil_deportivo?: Json | null;
  } = {};
  if (input.sexo !== undefined) update.sexo = input.sexo || null;
  if (input.objetivo !== undefined) update.objetivo = input.objetivo || null;
  if (input.nivel !== undefined) update.nivel = input.nivel || null;
  if (input.actividad !== undefined) update.actividad = input.actividad || null;
  if (input.pesoActual !== undefined) update.peso_actual = input.pesoActual;
  if (input.altura !== undefined) update.altura = input.altura;
  if (input.perfilDeportivo !== undefined) update.perfil_deportivo = (input.perfilDeportivo as unknown as Json) ?? null;

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("clients").update(update).eq("id", me.id);
  if (error) return { ok: false, error: "No pudimos guardar tu hoja de vida." };
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Progreso — subir foto de avance (crea una medición con solo la foto).
// ---------------------------------------------------------------------------

export async function addOwnProgressPhoto(formData: FormData): Promise<AdminActionResult & { url?: string }> {
  const me = await requireOwnClient();

  const validated = validateImageFile(formData.get("foto"));
  if (!validated.ok) return { ok: false, error: validated.error };

  const supabase = getSupabaseAdmin();
  const ext = imageExtension(validated.file);
  const path = `${me.trainer_id}/clientes/${me.id}/progreso-${Date.now()}.${ext}`;
  const buffer = Buffer.from(await validated.file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, buffer, { contentType: validated.file.type, upsert: true });
  if (uploadError) return { ok: false, error: uploadError.message };

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);

  const peso = formData.get("peso");
  const pesoNum = peso && typeof peso === "string" && peso.trim() ? parseFloat(peso) : null;

  const { error: insertError } = await supabase.from("measurements").insert({
    client_id: me.id,
    fecha: new Date().toISOString().slice(0, 10),
    peso: pesoNum,
    foto_url: data.publicUrl,
  });
  if (insertError) return { ok: false, error: insertError.message };

  if (pesoNum != null) {
    await supabase.from("clients").update({ peso_actual: pesoNum }).eq("id", me.id);
  }

  return { ok: true, url: data.publicUrl };
}

// ---------------------------------------------------------------------------
// Agenda — aprobar/rechazar sesiones propuestas, delegando en las mismas
// acciones que ya usa /agenda/aprobar/[token] (igual que hacía el portal por
// token). El token de la propuesta nunca sale al navegador: se resuelve acá
// a partir de la sesión del cliente.
// ---------------------------------------------------------------------------

async function resolveProposalToken(proposalId: string): Promise<string | null> {
  const me = await requireOwnClient();
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from("session_proposals").select("token, client_id").eq("id", proposalId).maybeSingle();
  if (!data || data.client_id !== me.id) return null;
  return data.token;
}

export async function approveOwnProposalItem(proposalId: string, itemId: string): Promise<AdminActionResult> {
  const proposalToken = await resolveProposalToken(proposalId);
  if (!proposalToken) return { ok: false, error: "Esta propuesta ya no es válida." };
  return approveProposalItem(proposalToken, itemId);
}

export async function getOwnReplacementSuggestions(
  proposalId: string,
  itemId: string
): Promise<AdminActionResult & { slots?: SuggestedSlot[] }> {
  const proposalToken = await resolveProposalToken(proposalId);
  if (!proposalToken) return { ok: false, error: "Esta propuesta ya no es válida." };
  return getReplacementSuggestions(proposalToken, itemId);
}

export async function rejectAndReplaceOwnItem(proposalId: string, itemId: string, chosenIso: string): Promise<AdminActionResult> {
  const proposalToken = await resolveProposalToken(proposalId);
  if (!proposalToken) return { ok: false, error: "Esta propuesta ya no es válida." };
  return rejectAndReplaceItem(proposalToken, itemId, chosenIso);
}
