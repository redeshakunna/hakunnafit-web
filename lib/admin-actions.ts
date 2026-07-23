"use server";

import { getSupabaseAdmin } from "./supabase-admin";
import { isAdminAuthenticated } from "./admin-auth";
import {
  PLAN_PRICE_COP,
  planLabel,
  landingStatusLabel,
  dashboardStatusLabel,
  type DashboardStatusKey,
  type LandingStatusKey,
  type PlanKey,
} from "./catalog";
import { isActiveTrainer, getPaymentStatus } from "./admin-helpers";
import { firstAvailableSlug, RESERVED_SUBDOMAINS } from "./slug";
import { createNotification } from "./notifications";

export type { PlanKey };
export type LandingStatus = LandingStatusKey;
export type DashboardAccess = DashboardStatusKey;

export interface AdminActionResult {
  ok: boolean;
  error?: string;
}

export interface LeadRow {
  id: string;
  nombre: string;
  negocio: string | null;
  email: string;
  whatsapp: string | null;
  num_clientes: string | null;
  necesidades: string[] | null;
  mensaje: string | null;
  estado: string;
  plan: PlanKey | null;
  ciudad: string | null;
  subdominio_propuesto: string | null;
  especialidad: string | null;
  metodo_actual: string | null;
  pasarela_interes: string | null;
  tiene_dominio: string | null;
  tiene_logo: string | null;
  interes_tienda: string | null;
  fuente: string;
  created_at: string;
}

export interface TrainerRow {
  id: string;
  business_name: string;
  whatsapp: string | null;
  plan: PlanKey | null;
  landing_status: LandingStatus;
  dashboard_access: DashboardAccess;
  lead_id: string | null;
  proximo_cobro: string | null;
  ciudad: string | null;
  subdominio: string | null;
  created_at: string;
  full_name: string | null;
  email: string | null;
  client_count: number;
  pais: string | null;
  especialidad: string | null;
  instagram: string | null;
  facebook: string | null;
  biografia: string | null;
  avatar_url: string | null;
  notas_internas: string | null;
  dominio_propio: string | null;
}

export interface TrainerActivityRow {
  id: string;
  trainer_id: string;
  type: string;
  title: string;
  description: string | null;
  created_at: string;
}

export interface TrainerContentStats {
  clients: number;
  rutinas: number;
  evaluaciones: number;
}

/**
 * Registra un evento real en el historial de actividad del entrenador.
 * Nunca debe romper la acción que lo dispara — un fallo aquí solo se ignora.
 */
async function logTrainerActivity(
  trainerId: string,
  type: string,
  title: string,
  description?: string | null
): Promise<void> {
  const supabase = getSupabaseAdmin();
  await supabase.from("trainer_activity").insert({
    trainer_id: trainerId,
    type,
    title,
    description: description ?? null,
  });
}

export async function listTrainerActivity(trainerId: string): Promise<TrainerActivityRow[]> {
  await requireAdmin();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("trainer_activity")
    .select("*")
    .eq("trainer_id", trainerId)
    .order("created_at", { ascending: false })
    .limit(20);
  if (error || !data) return [];
  return data as TrainerActivityRow[];
}

export async function getTrainerContentStats(trainerId: string): Promise<TrainerContentStats> {
  await requireAdmin();
  const supabase = getSupabaseAdmin();

  const [{ count: clients }, { count: rutinas }, { count: evaluaciones }] = await Promise.all([
    supabase.from("clients").select("id", { count: "exact", head: true }).eq("trainer_id", trainerId),
    supabase.from("weekly_plans").select("id", { count: "exact", head: true }).eq("trainer_id", trainerId),
    supabase.from("evaluations").select("id", { count: "exact", head: true }).eq("trainer_id", trainerId),
  ]);

  return {
    clients: clients ?? 0,
    rutinas: rutinas ?? 0,
    evaluaciones: evaluaciones ?? 0,
  };
}

async function requireAdmin() {
  const ok = await isAdminAuthenticated();
  if (!ok) throw new Error("No autorizado");
}

export async function listLeads(): Promise<LeadRow[]> {
  await requireAdmin();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("hakunnafit_leads")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as LeadRow[];
}

export async function listTrainers(): Promise<TrainerRow[]> {
  await requireAdmin();
  const supabase = getSupabaseAdmin();

  const { data: trainers, error } = await supabase
    .from("trainers")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !trainers) return [];

  const ids = trainers.map((t) => t.id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

  const { data: clientRows } = await supabase
    .from("clients")
    .select("trainer_id")
    .in("trainer_id", ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]);

  const countByTrainer = new Map<string, number>();
  for (const row of clientRows ?? []) {
    countByTrainer.set(row.trainer_id, (countByTrainer.get(row.trainer_id) ?? 0) + 1);
  }

  return trainers.map((t) => ({
    ...t,
    full_name: profileById.get(t.id)?.full_name ?? null,
    email: profileById.get(t.id)?.email ?? null,
    client_count: countByTrainer.get(t.id) ?? 0,
  })) as TrainerRow[];
}

export interface DashboardStats {
  totalLeads: number;
  newLeads: number;
  totalTrainers: number;
  activeTrainers: number;
  mrrCop: number;
  upcomingCharges: { businessName: string; date: string }[];
  leadsUncontacted: number;
  landingsPending: number;
  newTrainersByDay: { date: string; count: number }[];
  planDistribution: Record<PlanKey, number>;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  await requireAdmin();
  const [leads, trainers] = await Promise.all([listLeads(), listTrainers()]);

  const totalLeads = leads.length;
  const newLeads = leads.filter((l) => l.estado === "nuevo").length;
  const leadsUncontacted = newLeads;

  const totalTrainers = trainers.length;
  const activeOnes = trainers.filter(isActiveTrainer);
  const activeTrainers = activeOnes.length;

  const mrrCop = activeOnes.reduce((sum, t) => sum + (t.plan ? PLAN_PRICE_COP[t.plan] : 0), 0);

  const in7Days = new Date();
  in7Days.setDate(in7Days.getDate() + 7);
  const upcomingCharges = trainers
    .filter((t) => t.proximo_cobro && new Date(t.proximo_cobro) <= in7Days)
    .sort((a, b) => (a.proximo_cobro! < b.proximo_cobro! ? -1 : 1))
    .map((t) => ({ businessName: t.business_name, date: t.proximo_cobro! }));

  const landingsPending = trainers.filter((t) => t.landing_status === "pendiente").length;

  const since = new Date();
  since.setDate(since.getDate() - 30);
  const byDay = new Map<string, number>();
  for (const t of trainers) {
    const created = new Date(t.created_at);
    if (created >= since) {
      const key = created.toISOString().slice(0, 10);
      byDay.set(key, (byDay.get(key) ?? 0) + 1);
    }
  }
  const newTrainersByDay = Array.from(byDay.entries())
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, count]) => ({ date, count }));

  const planDistribution: Record<PlanKey, number> = { starter: 0, pro: 0, elite: 0 };
  for (const t of trainers) {
    if (t.plan) planDistribution[t.plan] += 1;
  }

  return {
    totalLeads,
    newLeads,
    totalTrainers,
    activeTrainers,
    mrrCop,
    upcomingCharges,
    leadsUncontacted,
    landingsPending,
    newTrainersByDay,
    planDistribution,
  };
}

export async function updateLeadEstado(leadId: string, estado: string): Promise<AdminActionResult> {
  await requireAdmin();
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("hakunnafit_leads").update({ estado }).eq("id", leadId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export interface UpdateLeadInput {
  leadId: string;
  nombre?: string;
  negocio?: string | null;
  email?: string;
  whatsapp?: string | null;
  ciudad?: string | null;
  plan?: PlanKey | null;
  mensaje?: string | null;
}

export async function updateLead(input: UpdateLeadInput): Promise<AdminActionResult> {
  await requireAdmin();
  const supabase = getSupabaseAdmin();

  const update: {
    nombre?: string;
    negocio?: string | null;
    email?: string;
    whatsapp?: string | null;
    ciudad?: string | null;
    plan?: PlanKey | null;
    mensaje?: string | null;
  } = {};
  if (input.nombre !== undefined && input.nombre.trim()) update.nombre = input.nombre.trim();
  if (input.negocio !== undefined) update.negocio = input.negocio || null;
  if (input.email !== undefined && input.email.trim()) update.email = input.email.trim();
  if (input.whatsapp !== undefined) update.whatsapp = input.whatsapp || null;
  if (input.ciudad !== undefined) update.ciudad = input.ciudad || null;
  if (input.plan !== undefined) update.plan = input.plan;
  if (input.mensaje !== undefined) update.mensaje = input.mensaje || null;

  if (Object.keys(update).length === 0) return { ok: true };

  const { error } = await supabase.from("hakunnafit_leads").update(update).eq("id", input.leadId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export interface CreateLeadInput {
  nombre: string;
  negocio?: string | null;
  email: string;
  whatsapp?: string | null;
  ciudad?: string | null;
  plan?: PlanKey | null;
  numClientes?: string | null;
  mensaje?: string | null;
  subdominioDeseado?: string | null;
}

/**
 * Crea una solicitud manualmente desde el panel — para cuando alguien
 * contacta a Nando directo (WhatsApp, llamada, en persona) en vez de llenar
 * el formulario público. Queda marcada con fuente "manual" para distinguirla
 * en Solicitudes, y sigue el mismo flujo de aprobación que cualquier otra.
 */
export async function createLeadManual(input: CreateLeadInput): Promise<AdminActionResult> {
  await requireAdmin();

  const nombre = input.nombre.trim();
  const email = input.email.trim();
  if (!nombre || !email) return { ok: false, error: "Nombre y correo son obligatorios." };

  const supabase = getSupabaseAdmin();

  let subdominioPropuesto: string | null = null;
  try {
    const [{ data: existingTrainers }, { data: pendingLeads }] = await Promise.all([
      supabase.from("trainers").select("subdominio"),
      supabase.from("hakunnafit_leads").select("subdominio_propuesto").neq("estado", "convertido"),
    ]);
    const taken = new Set([
      ...RESERVED_SUBDOMAINS,
      ...(existingTrainers ?? []).map((t) => t.subdominio),
      ...(pendingLeads ?? []).map((l) => l.subdominio_propuesto),
    ].filter((s): s is string => !!s));
    subdominioPropuesto = firstAvailableSlug(input.subdominioDeseado || input.negocio || nombre, taken);
  } catch {
    subdominioPropuesto = null;
  }

  const { error } = await supabase.from("hakunnafit_leads").insert({
    nombre,
    negocio: input.negocio || null,
    email,
    whatsapp: input.whatsapp || null,
    num_clientes: input.numClientes || null,
    mensaje: input.mensaje || null,
    plan: input.plan ?? null,
    ciudad: input.ciudad || null,
    subdominio_propuesto: subdominioPropuesto,
    fuente: "manual",
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export interface ConvertLeadInput {
  leadId: string;
  plan?: PlanKey;
  proximoCobro?: string | null;
}

/**
 * Aprueba una solicitud (lead) y la convierte en un entrenador real:
 * - Crea la cuenta de acceso (Supabase Auth) — solo tendrá uso si el plan es Pro/Elite.
 * - Crea su fila en profiles + trainers, con el subdominio ya propuesto en el
 *   formulario (revalidado por si otro entrenador lo tomó primero).
 * - Marca el lead como "convertido".
 *
 * Como el formulario del sitio ya pide el plan al visitante, normalmente no
 * hace falta pasar `plan` ni `proximoCobro` — se usan el del lead y un cobro
 * a 30 días desde hoy. Solo hace falta indicarlos a mano para leads antiguos
 * que no tenían plan (de antes de este cambio).
 *
 * El acceso al dashboard se activa de una vez si el plan es Pro/Elite, porque este
 * paso ya implica que Nando verificó el pago manualmente antes de aprobar.
 */
export async function convertLeadToTrainer(input: ConvertLeadInput): Promise<AdminActionResult> {
  await requireAdmin();
  const supabase = getSupabaseAdmin();

  const { data: lead, error: leadError } = await supabase
    .from("hakunnafit_leads")
    .select("*")
    .eq("id", input.leadId)
    .single();

  if (leadError || !lead) {
    return { ok: false, error: "No se encontró la solicitud." };
  }

  const plan = input.plan ?? lead.plan;
  if (!plan) {
    return { ok: false, error: "Esta solicitud no tiene un plan asignado todavía." };
  }

  const defaultProximoCobro = new Date();
  defaultProximoCobro.setDate(defaultProximoCobro.getDate() + 30);
  const proximoCobro = input.proximoCobro || defaultProximoCobro.toISOString().slice(0, 10);

  const { data: created, error: userError } = await supabase.auth.admin.createUser({
    email: lead.email,
    email_confirm: true,
    user_metadata: { full_name: lead.negocio || lead.nombre },
  });

  let userId: string;

  if (userError || !created?.user) {
    // Si el correo ya tiene una cuenta (ej: un intento anterior que falló a
    // mitad de camino, dejando el usuario creado pero sin perfil/entrenador),
    // reutilizamos esa cuenta en vez de fallar — así el botón "Aprobar" es
    // seguro de volver a intentar.
    const alreadyRegistered = /already.*registered|already exists/i.test(userError?.message ?? "");
    if (!alreadyRegistered) {
      return { ok: false, error: userError?.message ?? "No se pudo crear la cuenta del entrenador." };
    }

    const { data: usersPage, error: listError } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    const existingUser = listError
      ? undefined
      : usersPage.users.find((u) => u.email?.toLowerCase() === lead.email.toLowerCase());

    if (!existingUser) {
      return {
        ok: false,
        error: "Ese correo ya tiene una cuenta pero no pudimos encontrarla para reutilizarla.",
      };
    }
    userId = existingUser.id;
  } else {
    userId = created.user.id;
  }

  const { error: profileError } = await supabase.from("profiles").upsert({
    id: userId,
    role: "trainer",
    full_name: lead.negocio || lead.nombre,
    email: lead.email,
  });

  if (profileError) {
    return { ok: false, error: "No se pudo crear el perfil del entrenador." };
  }

  // Revalidamos el subdominio propuesto por si alguien más lo tomó desde que
  // se envió el formulario.
  let subdominio: string | null = null;
  const baseSlug = lead.subdominio_propuesto || lead.negocio || lead.nombre;
  const { data: existingTrainers } = await supabase.from("trainers").select("subdominio").neq("id", userId);
  const taken = new Set([
    ...RESERVED_SUBDOMAINS,
    ...(existingTrainers ?? []).map((t) => t.subdominio).filter((s): s is string => !!s),
  ]);
  subdominio = firstAvailableSlug(baseSlug, taken);

  const { error: trainerError } = await supabase.from("trainers").upsert({
    id: userId,
    business_name: lead.negocio || lead.nombre,
    whatsapp: lead.whatsapp,
    plan,
    // Starter no tiene un proceso de diseño manual — su landing se publica
    // sola al aprobar (por ahora muestra un placeholder de "en construcción"
    // personalizado en /landing/[subdominio] hasta que exista la plantilla
    // real). Pro/Elite sí pasan por diseño manual, así que quedan pendientes.
    landing_status: plan === "starter" ? "publicada" : "pendiente",
    dashboard_access: plan === "starter" ? "sin_acceso" : "activo",
    lead_id: lead.id,
    proximo_cobro: proximoCobro,
    ciudad: lead.ciudad || null,
    subdominio,
  });

  if (trainerError) {
    return { ok: false, error: "No se pudo crear el registro del entrenador." };
  }

  await supabase.from("hakunnafit_leads").update({ estado: "convertido" }).eq("id", lead.id);

  await createNotification({
    type: "entrenador_aprobado",
    title: `Entrenador aprobado: ${lead.negocio || lead.nombre}`,
    message: `${lead.negocio || lead.nombre} fue aprobado con el plan ${planLabel(plan)}${
      subdominio ? ` (${subdominio}.hakunnafit.com)` : ""
    }.`,
    link: "/panel-hakunna/entrenadores",
    trainerId: userId,
    leadId: lead.id,
  });

  await logTrainerActivity(
    userId,
    "cuenta_creada",
    "Cuenta creada",
    `Entrenador aprobado y registrado con el plan ${planLabel(plan)}.`
  );

  return { ok: true };
}

export interface UpdateTrainerInput {
  trainerId: string;
  plan?: PlanKey;
  landingStatus?: LandingStatus;
  dashboardAccess?: DashboardAccess;
  proximoCobro?: string | null;
  ciudad?: string | null;
  businessName?: string;
  whatsapp?: string | null;
  email?: string;
  pais?: string | null;
  especialidad?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  biografia?: string | null;
  avatarUrl?: string | null;
  notasInternas?: string | null;
  dominioPropio?: string | null;
}

export async function updateTrainer(input: UpdateTrainerInput): Promise<AdminActionResult> {
  await requireAdmin();
  const supabase = getSupabaseAdmin();

  const { data: current } = await supabase
    .from("trainers")
    .select("plan, landing_status, dashboard_access, business_name")
    .eq("id", input.trainerId)
    .single();

  const update: {
    plan?: PlanKey;
    landing_status?: LandingStatus;
    dashboard_access?: DashboardAccess;
    proximo_cobro?: string | null;
    ciudad?: string | null;
    business_name?: string;
    whatsapp?: string | null;
    pais?: string | null;
    especialidad?: string | null;
    instagram?: string | null;
    facebook?: string | null;
    biografia?: string | null;
    avatar_url?: string | null;
    notas_internas?: string | null;
    dominio_propio?: string | null;
  } = {};
  if (input.plan) update.plan = input.plan;
  if (input.landingStatus) update.landing_status = input.landingStatus;
  if (input.dashboardAccess) update.dashboard_access = input.dashboardAccess;
  if (input.proximoCobro !== undefined) update.proximo_cobro = input.proximoCobro || null;
  if (input.ciudad !== undefined) update.ciudad = input.ciudad || null;
  if (input.businessName !== undefined && input.businessName.trim()) update.business_name = input.businessName.trim();
  if (input.whatsapp !== undefined) update.whatsapp = input.whatsapp || null;
  if (input.pais !== undefined) update.pais = input.pais || null;
  if (input.especialidad !== undefined) update.especialidad = input.especialidad || null;
  if (input.instagram !== undefined) update.instagram = input.instagram || null;
  if (input.facebook !== undefined) update.facebook = input.facebook || null;
  if (input.biografia !== undefined) update.biografia = input.biografia || null;
  if (input.avatarUrl !== undefined) update.avatar_url = input.avatarUrl || null;
  if (input.notasInternas !== undefined) update.notas_internas = input.notasInternas || null;
  if (input.dominioPropio !== undefined) update.dominio_propio = input.dominioPropio || null;

  // Starter nunca tiene acceso a dashboard, sin importar lo que se intente guardar.
  if (update.plan === "starter" || (!input.plan && input.dashboardAccess)) {
    const effectivePlan = (update.plan as PlanKey | undefined) ?? (current?.plan as PlanKey | undefined);
    if (effectivePlan === "starter") {
      update.dashboard_access = "sin_acceso";
    }
  }

  if (Object.keys(update).length > 0) {
    const { error } = await supabase.from("trainers").update(update).eq("id", input.trainerId);
    if (error) return { ok: false, error: error.message };
  }

  const businessName = current?.business_name || "Un entrenador";

  // Cambio de plan — evento propio en el historial de actividad, más
  // relevante que un "cambio de estado" genérico.
  if (update.plan && update.plan !== current?.plan) {
    await logTrainerActivity(
      input.trainerId,
      "plan_cambiado",
      "Plan actualizado",
      `Cambió de ${planLabel((current?.plan as PlanKey) ?? null)} a ${planLabel(update.plan)}.`
    );
  }

  // Suspender/reactivar también es un evento propio (más claro que "estado_cambio").
  if (update.dashboard_access && update.dashboard_access !== current?.dashboard_access) {
    if (update.dashboard_access === "suspendido") {
      await logTrainerActivity(input.trainerId, "suspendido", "Entrenador suspendido");
    } else if (current?.dashboard_access === "suspendido") {
      await logTrainerActivity(input.trainerId, "reactivado", "Entrenador reactivado");
    }
  }

  // Notifica cambios de estado (landing/dashboard) — solo si el valor
  // realmente cambió respecto al que tenía antes.
  const changes: string[] = [];
  if (update.landing_status && update.landing_status !== current?.landing_status) {
    changes.push(`landing: ${landingStatusLabel(update.landing_status)}`);
  }
  if (update.dashboard_access && update.dashboard_access !== current?.dashboard_access) {
    changes.push(`dashboard: ${dashboardStatusLabel(update.dashboard_access)}`);
  }
  if (changes.length > 0) {
    await createNotification({
      type: "estado_cambio",
      title: `Cambio de estado: ${businessName}`,
      message: `${businessName} ahora tiene ${changes.join(" · ")}.`,
      link: "/panel-hakunna/entrenadores",
      trainerId: input.trainerId,
    });
    await logTrainerActivity(input.trainerId, "estado_cambiado", "Cambio de estado", changes.join(" · "));
  }

  // Edición de datos de perfil — un solo evento agregado, no uno por campo.
  const profileFieldsChanged =
    (input.businessName !== undefined && update.business_name && update.business_name !== current?.business_name) ||
    input.whatsapp !== undefined ||
    input.ciudad !== undefined ||
    input.pais !== undefined ||
    input.especialidad !== undefined ||
    input.instagram !== undefined ||
    input.facebook !== undefined ||
    input.biografia !== undefined ||
    input.avatarUrl !== undefined;
  if (profileFieldsChanged) {
    await logTrainerActivity(input.trainerId, "informacion_actualizada", "Información actualizada");
  }

  if (input.email && input.email.trim()) {
    const email = input.email.trim();
    const { error: authError } = await supabase.auth.admin.updateUserById(input.trainerId, { email });
    if (authError) return { ok: false, error: `No se pudo actualizar el correo: ${authError.message}` };

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ email })
      .eq("id", input.trainerId);
    if (profileError) return { ok: false, error: "No se pudo actualizar el correo del perfil." };
  }

  return { ok: true };
}

const MAX_AVATAR_BYTES = 3 * 1024 * 1024; // 3 MB
const ALLOWED_AVATAR_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

/**
 * Sube la foto de perfil de un entrenador al bucket público "avatars" y
 * guarda la URL resultante en trainers.avatar_url.
 */
export async function uploadTrainerAvatar(
  trainerId: string,
  formData: FormData
): Promise<AdminActionResult & { url?: string }> {
  await requireAdmin();

  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "No se recibió ninguna imagen." };
  }
  if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
    return { ok: false, error: "Formato no soportado. Usa JPG, PNG o WEBP." };
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return { ok: false, error: "La imagen pesa más de 3 MB." };
  }

  const supabase = getSupabaseAdmin();
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${trainerId}/${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, buffer, { contentType: file.type, upsert: true });
  if (uploadError) return { ok: false, error: uploadError.message };

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);

  const { error: dbError } = await supabase
    .from("trainers")
    .update({ avatar_url: data.publicUrl })
    .eq("id", trainerId);
  if (dbError) return { ok: false, error: dbError.message };

  await logTrainerActivity(trainerId, "informacion_actualizada", "Foto de perfil actualizada");

  return { ok: true, url: data.publicUrl };
}

/**
 * Elimina un entrenador de forma definitiva (trainers -> profiles -> usuario
 * de Auth, en ese orden por las foreign keys). Antes de borrar nada valida:
 * - Que no esté activo (debe suspenderse primero).
 * - Que no tenga un cobro vencido (saldo pendiente).
 * - Que no tenga clientes asociados (evita dejar datos huérfanos).
 * Cualquier otra relación que no hayamos previsto explícitamente (pagos,
 * suscripciones, etc.) la detiene el propio error de foreign key de Postgres,
 * que se traduce a un mensaje entendible en vez de dejarlo pasar tal cual.
 */
export async function deleteTrainer(trainerId: string): Promise<AdminActionResult> {
  await requireAdmin();
  const supabase = getSupabaseAdmin();

  const { data: trainer, error: fetchError } = await supabase
    .from("trainers")
    .select("business_name, plan, landing_status, dashboard_access, proximo_cobro")
    .eq("id", trainerId)
    .single();

  if (fetchError || !trainer) {
    return { ok: false, error: "No se encontró el entrenador." };
  }

  if (isActiveTrainer(trainer)) {
    return {
      ok: false,
      error: "No puedes eliminar un entrenador activo. Suspéndelo primero.",
    };
  }

  if (getPaymentStatus(trainer.proximo_cobro, false) === "vencido") {
    return {
      ok: false,
      error: "Este entrenador tiene un cobro vencido (saldo pendiente). Regulariza el pago antes de eliminarlo.",
    };
  }

  const { count: clientCount } = await supabase
    .from("clients")
    .select("id", { count: "exact", head: true })
    .eq("trainer_id", trainerId);

  if ((clientCount ?? 0) > 0) {
    return {
      ok: false,
      error: "Este entrenador tiene clientes asociados. Reasígnalos o elimínalos antes de continuar.",
    };
  }

  const { error: deleteTrainerError } = await supabase.from("trainers").delete().eq("id", trainerId);
  if (deleteTrainerError) {
    // Código 23503 = violación de llave foránea: todavía hay algo (pagos,
    // suscripciones, notificaciones) apuntando a este entrenador.
    if (deleteTrainerError.code === "23503") {
      return {
        ok: false,
        error: "Este entrenador todavía tiene registros relacionados (pagos, suscripciones u otros) que impiden eliminarlo.",
      };
    }
    return { ok: false, error: deleteTrainerError.message };
  }

  await supabase.from("profiles").delete().eq("id", trainerId);
  await supabase.auth.admin.deleteUser(trainerId);

  return { ok: true };
}
