"use server";

// Acciones de servidor del módulo Clientes (/panel/clientes) — CRUD real
// sobre las tablas clients/evaluations/measurements que ya existían en la
// base de datos (creadas en una iteración anterior del esquema) pero nunca
// habían sido conectadas a ninguna pantalla. Todo aquí opera siempre sobre
// requireTrainer() (la sesión real del entrenador), nunca recibe un
// trainer_id externo, y siempre revalida que el cliente pertenezca al
// entrenador antes de editar/borrar — así una llamada manipulada no puede
// tocar clientes de otro entrenador.

import { getSupabaseAdmin } from "./supabase-admin";
import { requireTrainer } from "./trainer-auth";
import { PLAN_CLIENT_CAP } from "./catalog";
import { validateImageFile, imageExtension } from "./image-validation";
import type { AdminActionResult } from "./admin-actions";

export type ClientStatus = "pendiente_evaluacion" | "activo" | "pausado" | "inactivo";

export interface ClientRow {
  id: string;
  trainer_id: string;
  user_id: string | null;
  full_name: string;
  email: string | null;
  whatsapp: string | null;
  sexo: string | null;
  objetivo: string | null;
  nivel: string | null;
  actividad: string | null;
  rutina_actual: string | null;
  peso_actual: number | null;
  altura: number | null;
  plan_elegido: string | null;
  dias_por_semana: number | null;
  horario_entreno: string | null;
  status: ClientStatus;
  pausado_motivo: string | null;
  pausado_en: string | null;
  created_at: string;
}

async function assertOwnClient(clientId: string): Promise<{ trainerId: string }> {
  const trainer = await requireTrainer();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("clients").select("id, trainer_id").eq("id", clientId).maybeSingle();
  if (error || !data || data.trainer_id !== trainer.id) {
    throw new Error("Cliente no encontrado.");
  }
  return { trainerId: trainer.id };
}

export async function getOwnClients(): Promise<ClientRow[]> {
  const trainer = await requireTrainer();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("trainer_id", trainer.id)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data as ClientRow[];
}

/** Cliente puntual por id, verificando que pertenezca al entrenador de la
 * sesión — alimenta la página de perfil /panel/clientes/[id]. */
export async function getOwnClient(clientId: string): Promise<ClientRow | null> {
  const trainer = await requireTrainer();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("clients").select("*").eq("id", clientId).maybeSingle();
  if (error || !data || data.trainer_id !== trainer.id) return null;
  return data as ClientRow;
}

export async function getOwnRecentClients(limit = 5): Promise<ClientRow[]> {
  const trainer = await requireTrainer();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("trainer_id", trainer.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data as ClientRow[];
}

export interface UpcomingEvaluationRow extends EvaluationRow {
  client_full_name: string;
}

/**
 * Próximas evaluaciones agendadas de TODOS los clientes del entrenador
 * (no solo uno) — alimenta la tarjeta "Próximas citas" del Dashboard. Se
 * hace en dos pasos (ids de clientes propios, luego evaluaciones de esos
 * ids) porque evaluations no tiene trainer_id indexado para RLS del propio
 * entrenador aquí — igual se filtra explícitamente por trainer_id, que sí
 * existe en la tabla, así que en realidad es un solo query.
 */
export async function getOwnUpcomingEvaluations(limit = 5): Promise<UpcomingEvaluationRow[]> {
  const trainer = await requireTrainer();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("evaluations")
    .select("*, clients(full_name)")
    .eq("trainer_id", trainer.id)
    .eq("status", "pendiente")
    .gte("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(limit);
  if (error || !data) return [];
  return data.map((row) => {
    const { clients, ...rest } = row as EvaluationRow & { clients: { full_name: string } | null };
    return { ...rest, client_full_name: clients?.full_name ?? "Cliente" };
  });
}

export interface CreateOwnClientInput {
  fullName: string;
  email?: string | null;
  whatsapp?: string | null;
  sexo?: string | null;
  objetivo?: string | null;
  nivel?: string | null;
  actividad?: string | null;
  pesoActual?: number | null;
  altura?: number | null;
  planElegido?: string | null;
  diasPorSemana?: number | null;
  horarioEntreno?: string | null;
  status?: ClientStatus;
}

/**
 * Crea un cliente nuevo — revalida server-side el tope de clientes por plan
 * (PLAN_CLIENT_CAP), aunque la UI ya deshabilite el botón al llegar al
 * límite, para que nadie se lo salte llamando la acción directamente.
 */
export async function createOwnClient(input: CreateOwnClientInput): Promise<AdminActionResult & { id?: string }> {
  const trainer = await requireTrainer();
  if (!input.fullName?.trim()) return { ok: false, error: "El nombre del cliente es obligatorio." };

  const supabase = getSupabaseAdmin();
  const { count } = await supabase
    .from("clients")
    .select("id", { count: "exact", head: true })
    .eq("trainer_id", trainer.id);

  const cap = PLAN_CLIENT_CAP[trainer.plan ?? "starter"];
  if ((count ?? 0) >= cap) {
    return {
      ok: false,
      error: `Llegaste al límite de ${cap} clientes de tu plan actual. Sube de plan para agregar más.`,
    };
  }

  const { data, error } = await supabase
    .from("clients")
    .insert({
      trainer_id: trainer.id,
      full_name: input.fullName.trim(),
      email: input.email || null,
      whatsapp: input.whatsapp || null,
      sexo: input.sexo || null,
      objetivo: input.objetivo || null,
      nivel: input.nivel || null,
      actividad: input.actividad || null,
      peso_actual: input.pesoActual ?? null,
      altura: input.altura ?? null,
      plan_elegido: input.planElegido || null,
      dias_por_semana: input.diasPorSemana ?? null,
      horario_entreno: input.horarioEntreno || null,
      status: input.status ?? "pendiente_evaluacion",
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "No se pudo crear el cliente." };

  await getSupabaseAdmin()
    .from("trainer_activity")
    .insert({ trainer_id: trainer.id, type: "cliente_creado", title: `Nuevo cliente: ${input.fullName.trim()}` });

  return { ok: true, id: data.id };
}

export interface UpdateOwnClientInput {
  fullName?: string;
  email?: string | null;
  whatsapp?: string | null;
  sexo?: string | null;
  objetivo?: string | null;
  nivel?: string | null;
  actividad?: string | null;
  rutinaActual?: string | null;
  pesoActual?: number | null;
  altura?: number | null;
  planElegido?: string | null;
  diasPorSemana?: number | null;
  horarioEntreno?: string | null;
  status?: ClientStatus;
  pausadoMotivo?: string | null;
}

export async function updateOwnClient(clientId: string, input: UpdateOwnClientInput): Promise<AdminActionResult> {
  await assertOwnClient(clientId);
  const supabase = getSupabaseAdmin();

  const update: {
    full_name?: string;
    email?: string | null;
    whatsapp?: string | null;
    sexo?: string | null;
    objetivo?: string | null;
    nivel?: string | null;
    actividad?: string | null;
    rutina_actual?: string | null;
    peso_actual?: number | null;
    altura?: number | null;
    plan_elegido?: string | null;
    dias_por_semana?: number | null;
    horario_entreno?: string | null;
    status?: ClientStatus;
    pausado_motivo?: string | null;
    pausado_en?: string | null;
  } = {};
  if (input.fullName !== undefined) update.full_name = input.fullName.trim();
  if (input.email !== undefined) update.email = input.email || null;
  if (input.whatsapp !== undefined) update.whatsapp = input.whatsapp || null;
  if (input.sexo !== undefined) update.sexo = input.sexo || null;
  if (input.objetivo !== undefined) update.objetivo = input.objetivo || null;
  if (input.nivel !== undefined) update.nivel = input.nivel || null;
  if (input.actividad !== undefined) update.actividad = input.actividad || null;
  if (input.rutinaActual !== undefined) update.rutina_actual = input.rutinaActual || null;
  if (input.pesoActual !== undefined) update.peso_actual = input.pesoActual;
  if (input.altura !== undefined) update.altura = input.altura;
  if (input.planElegido !== undefined) update.plan_elegido = input.planElegido || null;
  if (input.diasPorSemana !== undefined) update.dias_por_semana = input.diasPorSemana;
  if (input.horarioEntreno !== undefined) update.horario_entreno = input.horarioEntreno || null;
  // Al pausar se sella la fecha automáticamente; al salir de pausado se
  // limpian motivo y fecha para que no quede un "pausado desde" viejo
  // colgando en un cliente activo de nuevo.
  if (input.status !== undefined) {
    update.status = input.status;
    if (input.status === "pausado") {
      update.pausado_en = new Date().toISOString().slice(0, 10);
    } else {
      update.pausado_motivo = null;
      update.pausado_en = null;
    }
  }
  if (input.pausadoMotivo !== undefined) update.pausado_motivo = input.pausadoMotivo || null;

  if (Object.keys(update).length === 0) return { ok: true };

  const { error } = await supabase.from("clients").update(update).eq("id", clientId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteOwnClient(clientId: string): Promise<AdminActionResult> {
  await assertOwnClient(clientId);
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("clients").delete().eq("id", clientId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Mediciones (progreso) — historial de peso/medidas por cliente.
// ---------------------------------------------------------------------------

export interface MeasurementRow {
  id: string;
  client_id: string;
  fecha: string;
  peso: number | null;
  medidas: Record<string, number> | null;
  foto_url: string | null;
  notas: string | null;
  created_at: string;
}

export async function getOwnClientMeasurements(clientId: string): Promise<MeasurementRow[]> {
  await assertOwnClient(clientId);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("measurements")
    .select("*")
    .eq("client_id", clientId)
    .order("fecha", { ascending: false });
  if (error || !data) return [];
  return data as MeasurementRow[];
}

export interface AddMeasurementInput {
  fecha?: string;
  peso?: number | null;
  medidas?: Record<string, number> | null;
  notas?: string | null;
  fotoUrl?: string | null;
}

export async function addOwnClientMeasurement(clientId: string, input: AddMeasurementInput): Promise<AdminActionResult> {
  await assertOwnClient(clientId);
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("measurements").insert({
    client_id: clientId,
    fecha: input.fecha || new Date().toISOString().slice(0, 10),
    peso: input.peso ?? null,
    medidas: input.medidas ?? null,
    notas: input.notas || null,
    foto_url: input.fotoUrl || null,
  });
  if (error) return { ok: false, error: error.message };

  // Mantiene peso_actual del cliente sincronizado con la última medición.
  if (input.peso != null) {
    await supabase.from("clients").update({ peso_actual: input.peso }).eq("id", clientId);
  }
  return { ok: true };
}

/**
 * Sube una foto de progreso para una medición — mismo bucket "avatars" que
 * usan las fotos propias del entrenador, en su propia carpeta por cliente
 * para no mezclarse. Solo sube el archivo y devuelve la URL pública; guardar
 * esa URL en la medición es responsabilidad del caller (addOwnClientMeasurement
 * recibe fotoUrl), así el flujo típico es: subir foto → crear medición.
 */
export async function uploadOwnClientMeasurementPhoto(
  clientId: string,
  formData: FormData
): Promise<AdminActionResult & { url?: string }> {
  const { trainerId } = await assertOwnClient(clientId);

  const validated = validateImageFile(formData.get("foto"));
  if (!validated.ok) return { ok: false, error: validated.error };

  const supabase = getSupabaseAdmin();
  const ext = imageExtension(validated.file);
  const path = `${trainerId}/clientes/${clientId}/progreso-${Date.now()}.${ext}`;
  const buffer = Buffer.from(await validated.file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, buffer, { contentType: validated.file.type, upsert: true });
  if (uploadError) return { ok: false, error: uploadError.message };

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return { ok: true, url: data.publicUrl };
}

// ---------------------------------------------------------------------------
// Evaluaciones — citas de valoración inicial/seguimiento por cliente.
// ---------------------------------------------------------------------------

export interface EvaluationRow {
  id: string;
  client_id: string;
  trainer_id: string;
  scheduled_at: string;
  status: string;
  created_at: string;
}

export async function getOwnClientEvaluations(clientId: string): Promise<EvaluationRow[]> {
  await assertOwnClient(clientId);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("evaluations")
    .select("*")
    .eq("client_id", clientId)
    .order("scheduled_at", { ascending: false });
  if (error || !data) return [];
  return data as EvaluationRow[];
}

/**
 * Próxima evaluación pendiente por cliente, en un solo query — alimenta las
 * tarjetas de /panel/clientes sin tener que pedir una evaluación por
 * cliente por separado (evita N+1 queries en la pantalla).
 */
export async function getOwnNextEvaluationByClient(): Promise<Record<string, string>> {
  const trainer = await requireTrainer();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("evaluations")
    .select("client_id, scheduled_at")
    .eq("trainer_id", trainer.id)
    .eq("status", "pendiente")
    .gte("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: true });
  if (error || !data) return {};
  const map: Record<string, string> = {};
  for (const row of data) {
    if (row.client_id && row.scheduled_at && !map[row.client_id]) map[row.client_id] = row.scheduled_at;
  }
  return map;
}

export async function scheduleOwnEvaluation(clientId: string, scheduledAt: string): Promise<AdminActionResult> {
  const { trainerId } = await assertOwnClient(clientId);
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("evaluations")
    .insert({ client_id: clientId, trainer_id: trainerId, scheduled_at: scheduledAt, status: "pendiente" });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function updateOwnEvaluationStatus(evaluationId: string, status: string): Promise<AdminActionResult> {
  await requireTrainer();
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("evaluations").update({ status }).eq("id", evaluationId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
