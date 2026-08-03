"use server";

import { randomBytes } from "crypto";
import { getSupabaseAdmin } from "./supabase-admin";
import { isAdminAuthenticated } from "./admin-auth";
import {
  PLAN_PRICE_COP,
  TRIAL_DAYS,
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
import { sendLeadEmail, renderLeadEmail } from "./email";
import { buildWompiCheckoutUrl } from "./wompi";
import { getPlanPrices } from "./plan-settings-actions";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://hakunnafit.com";
// El enlace de onboarding vence a los 7 días — suficiente para que el
// entrenador lo complete con calma, sin quedar abierto indefinidamente.
const ONBOARDING_TOKEN_TTL_DAYS = 7;

function generateOnboardingToken(): string {
  return randomBytes(18).toString("base64url").slice(0, 24);
}

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
  landing_template: string | null;
  biografia: string | null;
  instagram: string | null;
  facebook: string | null;
  avatar_url: string | null;
  email_publico: string | null;
  onboarding_token: string | null;
  onboarding_token_expires_at: string | null;
  onboarding_token_used_at: string | null;
  revision_notas: string | null;
  pago_estado: string;
  pago_referencia: string | null;
  pago_wompi_transaction_id: string | null;
  pago_monto_cop: number | null;
  pago_ciclo: string | null;
  created_at: string;
}

// Un par de fotos de la sección "antes y después" de la landing Starter.
// "nombre" es opcional: se muestra como pie de foto ("María González") y el
// admin puede editarlo, incluso cuando las fotos son de stock (mientras el
// entrenador no tenga fotos reales de clientes).
export type TransformacionPar = {
  antes: string;
  despues: string;
  nombre?: string | null;
};

// Estadística corta tipo "+8 Años de experiencia" que aparece en la franja de
// cifras de los modelos Impacto/Claro. Editable por el admin; si no hay
// ninguna guardada, la landing muestra un set genérico por defecto.
export type Estadistica = {
  valor: string;
  etiqueta: string;
};

// Testimonio de un cliente (texto + nombre + calificación en estrellas,
// 1 a 5). Los avatares se muestran con iniciales, no fotos de stock, para no
// atribuir una cara real a una cita de ejemplo mientras el admin no haya
// cargado testimonios reales.
export type Testimonio = {
  texto: string;
  nombre: string;
  estrellas: number;
};

// Plan/paquete que el entrenador vende a SUS clientes (distinto de los
// planes Starter/Pro/Elite de Hakunna Fit) — se define en Mi Negocio →
// Operación y se guarda al instante (no tiene ciclo de borrador/publicar
// como los "servicios" de Mi Sitio Web, porque esto alimenta el selector de
// plan de los formularios de alta de cliente, no la landing). precioCop en
// null significa "personalizado" (a cotizar directo con el entrenador).
export type PlanOfrecido = {
  nombre: string;
  incluye: string;
  precioCop: number | null;
};

export interface TrainerRow {
  id: string;
  business_name: string;
  whatsapp: string | null;
  whatsapp_publico: string | null;
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
  landing_template: string | null;
  mostrar_transformaciones: boolean;
  transformaciones: TransformacionPar[] | null;
  updated_at: string;
  email_publico: string | null;
  foto2_url: string | null;
  foto3_url: string | null;
  foto4_url: string | null;
  servicios: { titulo: string; descripcion: string; tipo: "directo" | "personalizado" }[] | null;
  estadisticas: Estadistica[] | null;
  testimonios: Testimonio[] | null;
  tagline: string | null;
  onboarding_step: string | null;
  onboarding_completed_at: string | null;
  logo_url: string | null;
  color_primario: string;
  color_secundario: string;
  color_terciario: string;
  banner_url: string | null;
  secciones_activas: Record<string, boolean>;
  preguntas_frecuentes: { pregunta: string; respuesta: string }[] | null;
  landing_draft: Record<string, unknown> | null;
  landing_draft_updated_at: string | null;
  landing_published_at: string | null;
  planes_ofrecidos: PlanOfrecido[];
  contrato_inicio: string | null;
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
  const newLeads = leads.filter((l) => l.estado === "solicitud_recibida").length;
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
  landingTemplate?: string | null;
  biografia?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  emailPublico?: string | null;
  avatarUrl?: string | null;
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
    landing_template?: string | null;
    biografia?: string | null;
    instagram?: string | null;
    facebook?: string | null;
    email_publico?: string | null;
    avatar_url?: string | null;
  } = {};
  if (input.nombre !== undefined && input.nombre.trim()) update.nombre = input.nombre.trim();
  if (input.negocio !== undefined) update.negocio = input.negocio || null;
  if (input.email !== undefined && input.email.trim()) update.email = input.email.trim();
  if (input.whatsapp !== undefined) update.whatsapp = input.whatsapp || null;
  if (input.ciudad !== undefined) update.ciudad = input.ciudad || null;
  if (input.plan !== undefined) update.plan = input.plan;
  if (input.mensaje !== undefined) update.mensaje = input.mensaje || null;
  if (input.landingTemplate !== undefined) update.landing_template = input.landingTemplate || null;
  if (input.biografia !== undefined) update.biografia = input.biografia || null;
  if (input.instagram !== undefined) update.instagram = input.instagram || null;
  if (input.facebook !== undefined) update.facebook = input.facebook || null;
  if (input.emailPublico !== undefined) update.email_publico = input.emailPublico || null;
  if (input.avatarUrl !== undefined) update.avatar_url = input.avatarUrl || null;

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
  landingTemplate?: string | null;
  especialidad?: string | null;
  metodoActual?: string | null;
  pasarelaInteres?: string | null;
  tieneDominio?: string | null;
  tieneLogo?: string | null;
  interesTienda?: string | null;
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
      supabase.from("hakunnafit_leads").select("subdominio_propuesto").neq("estado", "entrenador_creado"),
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
    estado: "solicitud_recibida",
    fuente: "manual",
    landing_template: input.plan === "starter" ? input.landingTemplate ?? null : null,
    especialidad: input.especialidad ?? null,
    metodo_actual: input.plan === "pro" ? input.metodoActual ?? null : null,
    pasarela_interes: input.plan === "pro" ? input.pasarelaInteres ?? null : null,
    tiene_dominio: input.plan === "elite" ? input.tieneDominio ?? null : null,
    tiene_logo: input.plan === "elite" ? input.tieneLogo ?? null : null,
    interes_tienda: input.plan === "elite" ? input.interesTienda ?? null : null,
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
 * - Marca el lead como "entrenador_creado".
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
    landing_template: plan === "starter" ? lead.landing_template : null,
    // Si Nando ya alcanzó a cargar esto en Solicitudes mientras hablaba con
    // el lead, la landing queda lista de una vez al aprobar en vez de
    // arrancar vacía.
    biografia: lead.biografia || null,
    instagram: lead.instagram || null,
    facebook: lead.facebook || null,
    avatar_url: lead.avatar_url || null,
    email_publico: lead.email_publico || null,
  });

  if (trainerError) {
    return { ok: false, error: "No se pudo crear el registro del entrenador." };
  }

  await supabase.from("hakunnafit_leads").update({ estado: "entrenador_creado" }).eq("id", lead.id);

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

export type PagoCiclo = "mensual" | "semestral" | "anual";

/**
 * Genera el link de pago de Wompi para que el entrenador le pague a Hakunna
 * Fit el plan que solicitó (esto es aparte de lo que sus propios clientes le
 * paguen a él). El monto sale de plan_settings (editable en
 * /panel-hakunna/configuracion), nunca se toma del cliente. La referencia
 * incluye un timestamp para que cada intento sea único — si el primer link
 * se vence o el pago es rechazado, generar uno nuevo no choca con el
 * anterior. Aprobar la solicitud queda bloqueado hasta que el webhook de
 * Wompi confirme pago_estado = "pagado" (ver approveSolicitud).
 */
export async function generatePaymentLink(
  leadId: string,
  ciclo: PagoCiclo
): Promise<AdminActionResult & { url?: string }> {
  await requireAdmin();
  const supabase = getSupabaseAdmin();

  const { data: lead, error: leadError } = await supabase
    .from("hakunnafit_leads")
    .select("id, nombre, email, plan")
    .eq("id", leadId)
    .single();
  if (leadError || !lead) return { ok: false, error: "No se encontró la solicitud." };
  if (!lead.plan) return { ok: false, error: "Esta solicitud no tiene un plan asignado." };

  const prices = await getPlanPrices();
  const planPrice = prices[lead.plan as PlanKey];
  const amount =
    ciclo === "mensual" ? planPrice.monthlyCop : ciclo === "semestral" ? planPrice.semesterCop : planPrice.annualCop;

  const reference = `hf-lead-${lead.id}-${Date.now()}`;

  let url: string;
  try {
    url = buildWompiCheckoutUrl({
      reference,
      amountInCents: amount * 100,
      redirectUrl: `${SITE_URL}/pago-recibido`,
      buyerEmail: lead.email,
      buyerName: lead.nombre,
    });
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }

  const { error } = await supabase
    .from("hakunnafit_leads")
    .update({
      pago_estado: "pendiente",
      pago_referencia: reference,
      pago_monto_cop: amount,
      pago_ciclo: ciclo,
      pago_wompi_transaction_id: null,
    })
    .eq("id", lead.id);
  if (error) return { ok: false, error: error.message };

  return { ok: true, url };
}

/**
 * Reconstruye el link de pago ya generado para una solicitud (a partir de la
 * referencia y el monto guardados) sin tener que crear uno nuevo — la URL de
 * Wompi es determinística (misma referencia + monto + llaves = misma firma),
 * así que no hace falta guardar la URL completa en la base de datos.
 */
export async function getPaymentLinkUrl(leadId: string): Promise<AdminActionResult & { url?: string }> {
  await requireAdmin();
  const supabase = getSupabaseAdmin();

  const { data: lead, error } = await supabase
    .from("hakunnafit_leads")
    .select("id, nombre, email, pago_referencia, pago_monto_cop")
    .eq("id", leadId)
    .single();
  if (error || !lead) return { ok: false, error: "No se encontró la solicitud." };
  if (!lead.pago_referencia || !lead.pago_monto_cop) {
    return { ok: false, error: "Todavía no se ha generado un link de pago para esta solicitud." };
  }

  try {
    const url = buildWompiCheckoutUrl({
      reference: lead.pago_referencia,
      amountInCents: lead.pago_monto_cop * 100,
      redirectUrl: `${SITE_URL}/pago-recibido`,
      buyerEmail: lead.email,
      buyerName: lead.nombre,
    });
    return { ok: true, url };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

const CICLO_LABELS: Record<PagoCiclo, string> = {
  mensual: "mensual",
  semestral: "semestral (6 meses)",
  anual: "anual",
};

/**
 * Reenvía el link de pago ya generado por correo al solicitante (además de
 * "Copiar link" y "Enviar por WhatsApp"). Usa la misma referencia y monto
 * guardados — no genera un link nuevo.
 */
export async function sendPaymentLinkEmail(leadId: string): Promise<AdminActionResult> {
  await requireAdmin();
  const supabase = getSupabaseAdmin();

  const { data: lead, error } = await supabase
    .from("hakunnafit_leads")
    .select("id, nombre, email, pago_referencia, pago_monto_cop, pago_ciclo")
    .eq("id", leadId)
    .single();
  if (error || !lead) return { ok: false, error: "No se encontró la solicitud." };
  if (!lead.pago_referencia || !lead.pago_monto_cop) {
    return { ok: false, error: "Todavía no se ha generado un link de pago para esta solicitud." };
  }

  let url: string;
  try {
    url = buildWompiCheckoutUrl({
      reference: lead.pago_referencia,
      amountInCents: lead.pago_monto_cop * 100,
      redirectUrl: `${SITE_URL}/pago-recibido`,
      buyerEmail: lead.email,
      buyerName: lead.nombre,
    });
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }

  const cicloTxt = lead.pago_ciclo ? CICLO_LABELS[lead.pago_ciclo as PagoCiclo] ?? lead.pago_ciclo : null;
  const montoTxt = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(
    lead.pago_monto_cop
  );

  await sendLeadEmail({
    to: lead.email,
    subject: "Completa el pago de tu plan en Hakunna Fit",
    html: renderLeadEmail({
      nombre: lead.nombre,
      title: "Completa el pago de tu plan",
      message: `Para activar tu plan, realiza el pago de ${montoTxt}${
        cicloTxt ? ` (${cicloTxt})` : ""
      } a través de este enlace seguro.`,
      ctaLabel: "Pagar ahora",
      ctaUrl: url,
      color: "#00C8FF",
    }),
  });

  return { ok: true };
}

/**
 * Aprueba una solicitud bajo el nuevo flujo guiado: crea la cuenta y el
 * registro de entrenador de una vez (igual que convertLeadToTrainer, para
 * reutilizar esa misma lógica de creación de usuario), pero en estado
 * "borrador" — sin publicar la landing ni dar acceso al dashboard todavía.
 * Genera el enlace de onboarding de un solo uso y lo envía por correo. El
 * entrenador completa su información en /onboarding/[token]; recién cuando
 * Nando revisa y confirma esa información (acción "Crear Entrenador",
 * pendiente de construir) se activa la landing/dashboard de verdad.
 */
export async function approveSolicitud(leadId: string): Promise<AdminActionResult> {
  await requireAdmin();
  const supabase = getSupabaseAdmin();

  const { data: lead, error: leadError } = await supabase
    .from("hakunnafit_leads")
    .select("*")
    .eq("id", leadId)
    .single();

  if (leadError || !lead) {
    return { ok: false, error: "No se encontró la solicitud." };
  }

  if (lead.estado === "entrenador_creado") {
    return { ok: false, error: "Esta solicitud ya tiene un entrenador creado." };
  }

  const plan = lead.plan as PlanKey | null;
  if (!plan) {
    return { ok: false, error: "Esta solicitud no tiene un plan asignado. Asígnalo antes de aprobar." };
  }

  // Antes se exigía lead.pago_estado === "pagado" para poder aprobar — se
  // quitó ese candado a propósito: ahora la cuenta se activa con 15 días de
  // prueba gratis (TRIAL_DAYS en catalog.ts) sin necesidad de cobrar primero;
  // el primer cobro real se genera solo al terminar el trial (ver
  // activarEntrenador, que fija proximo_cobro = hoy + TRIAL_DAYS). El estado
  // de pago del lead se sigue guardando por si el entrenador decide pagar
  // por adelantado, pero ya no bloquea la aprobación.

  // Si ya existe un entrenador borrador ligado a esta solicitud (ej: un
  // reintento tras un error a mitad de camino), lo reutilizamos en vez de
  // duplicarlo — así el botón "Aprobar" es seguro de volver a pulsar.
  const { data: existingTrainer } = await supabase
    .from("trainers")
    .select("id")
    .eq("lead_id", lead.id)
    .maybeSingle();

  let trainerId = existingTrainer?.id ?? null;

  if (!trainerId) {
    const { data: created, error: userError } = await supabase.auth.admin.createUser({
      email: lead.email,
      email_confirm: true,
      user_metadata: { full_name: lead.nombre },
    });

    if (userError || !created?.user) {
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
      trainerId = existingUser.id;
    } else {
      trainerId = created.user.id;
    }

    const { error: profileError } = await supabase.from("profiles").upsert({
      id: trainerId,
      role: "trainer",
      full_name: lead.nombre,
      email: lead.email,
    });
    if (profileError) return { ok: false, error: "No se pudo crear el perfil del entrenador." };

    const { data: existingTrainers } = await supabase.from("trainers").select("subdominio").neq("id", trainerId);
    const taken = new Set([
      ...RESERVED_SUBDOMAINS,
      ...(existingTrainers ?? []).map((t) => t.subdominio).filter((s): s is string => !!s),
    ]);
    const subdominio = firstAvailableSlug(lead.subdominio_propuesto || lead.nombre, taken);

    // Usamos upsert (no insert) porque el trigger on_auth_user_created ya
    // puede haber creado una fila stub en trainers (id, business_name por
    // defecto) justo al crear la cuenta de auth de arriba, si ese correo
    // está en trainer_allowlist (mecanismo del login antiguo). Un insert
    // plano chocaría con esa fila por la PK y fallaría con "No se pudo crear
    // el registro del entrenador" — bug real encontrado en la prueba de
    // flujo completo en producción.
    const { error: trainerError } = await supabase.from("trainers").upsert({
      id: trainerId,
      business_name: lead.nombre,
      whatsapp: lead.whatsapp,
      plan,
      // Borrador: la landing no se publica ni el dashboard se activa hasta
      // que Nando confirme la información al final del onboarding.
      landing_status: "pendiente",
      dashboard_access: "sin_acceso",
      lead_id: lead.id,
      ciudad: lead.ciudad || null,
      subdominio,
      especialidad: lead.especialidad || null,
      landing_template: plan === "starter" ? lead.landing_template : null,
      biografia: lead.biografia || null,
      instagram: lead.instagram || null,
      facebook: lead.facebook || null,
      avatar_url: lead.avatar_url || null,
      email_publico: lead.email_publico || null,
    });
    if (trainerError) return { ok: false, error: "No se pudo crear el registro del entrenador." };
  }

  const token = generateOnboardingToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + ONBOARDING_TOKEN_TTL_DAYS);

  const { error: updateError } = await supabase
    .from("hakunnafit_leads")
    .update({
      estado: "aprobada",
      onboarding_token: token,
      onboarding_token_expires_at: expiresAt.toISOString(),
      onboarding_token_used_at: null,
      revision_notas: null,
    })
    .eq("id", lead.id);
  if (updateError) return { ok: false, error: updateError.message };

  await sendOnboardingLinkEmail(lead.email, lead.nombre, token);

  await createNotification({
    type: "estado_cambio",
    title: `Solicitud aprobada: ${lead.nombre}`,
    message: `${lead.nombre} fue aprobado con el plan ${planLabel(plan)}. Se le envió el enlace de onboarding.`,
    link: "/panel-hakunna/solicitudes",
    leadId: lead.id,
    trainerId,
    sendEmail: false,
  });

  return { ok: true };
}

async function sendOnboardingLinkEmail(email: string, nombre: string, token: string): Promise<void> {
  const onboardingUrl = `${SITE_URL}/onboarding/${token}`;
  await sendLeadEmail({
    to: email,
    subject: "Tu solicitud en Hakunna Fit fue aprobada",
    html: renderLeadEmail({
      nombre,
      title: "Tu solicitud ha sido aprobada",
      message:
        "Ahora completa la información para comenzar a crear tu espacio en Hakunna Fit. El enlace es personal y vence en 7 días.",
      ctaLabel: "Completar mi información",
      ctaUrl: onboardingUrl,
    }),
  }).catch(() => {});
}

/**
 * Genera un nuevo enlace de onboarding para una solicitud ya aprobada (el
 * anterior queda invalidado) y lo reenvía por correo — para cuando el
 * entrenador lo perdió o el primero venció.
 */
export async function resendOnboardingLink(leadId: string): Promise<AdminActionResult> {
  await requireAdmin();
  const supabase = getSupabaseAdmin();

  const { data: lead, error: leadError } = await supabase
    .from("hakunnafit_leads")
    .select("*")
    .eq("id", leadId)
    .single();
  if (leadError || !lead) return { ok: false, error: "No se encontró la solicitud." };

  if (!["aprobada", "en_onboarding", "informacion_completada"].includes(lead.estado)) {
    return { ok: false, error: "Esta solicitud todavía no ha sido aprobada." };
  }

  const token = generateOnboardingToken();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + ONBOARDING_TOKEN_TTL_DAYS);

  const { error } = await supabase
    .from("hakunnafit_leads")
    .update({
      onboarding_token: token,
      onboarding_token_expires_at: expiresAt.toISOString(),
      onboarding_token_used_at: null,
    })
    .eq("id", lead.id);
  if (error) return { ok: false, error: error.message };

  await sendOnboardingLinkEmail(lead.email, lead.nombre, token);
  return { ok: true };
}

/**
 * Rechaza una solicitud — estado terminal, no dispara ningún correo
 * automático (Nando prefiere avisar personalmente cuando rechaza).
 */
export async function rejectSolicitud(leadId: string, motivo?: string): Promise<AdminActionResult> {
  await requireAdmin();
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("hakunnafit_leads")
    .update({ estado: "rechazada", revision_notas: motivo || null })
    .eq("id", leadId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Le pide al solicitante información adicional antes de decidir — envía un
 * correo con el mensaje que escriba Nando. No crea ninguna cuenta ni cambia
 * el plan; si la solicitud seguía en "solicitud_recibida" la pasa a
 * "en_revision" para que quede claro que ya se le dio seguimiento.
 */
export async function requestSolicitudInfo(leadId: string, mensaje: string): Promise<AdminActionResult> {
  await requireAdmin();
  const supabase = getSupabaseAdmin();

  const { data: lead, error: leadError } = await supabase
    .from("hakunnafit_leads")
    .select("nombre, email, estado")
    .eq("id", leadId)
    .single();
  if (leadError || !lead) return { ok: false, error: "No se encontró la solicitud." };

  if (lead.estado === "solicitud_recibida") {
    await supabase.from("hakunnafit_leads").update({ estado: "en_revision" }).eq("id", leadId);
  }

  await sendLeadEmail({
    to: lead.email,
    subject: "Necesitamos un poco más de información",
    html: renderLeadEmail({
      nombre: lead.nombre,
      title: "Nos falta un dato para continuar",
      message: mensaje,
      color: "#F5A623",
    }),
  }).catch(() => {});

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
  mostrarTransformaciones?: boolean;
  transformaciones?: TransformacionPar[] | null;
  emailPublico?: string | null;
  foto2Url?: string | null;
  foto3Url?: string | null;
  foto4Url?: string | null;
  servicios?: { titulo: string; descripcion: string; tipo: "directo" | "personalizado" }[] | null;
  landingTemplate?: string | null;
  estadisticas?: Estadistica[] | null;
  testimonios?: Testimonio[] | null;
  tagline?: string | null;
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
    mostrar_transformaciones?: boolean;
    transformaciones?: TransformacionPar[] | null;
    email_publico?: string | null;
    foto2_url?: string | null;
    foto3_url?: string | null;
    foto4_url?: string | null;
    servicios?: { titulo: string; descripcion: string; tipo: "directo" | "personalizado" }[] | null;
    landing_template?: string | null;
    estadisticas?: Estadistica[] | null;
    testimonios?: Testimonio[] | null;
    tagline?: string | null;
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
  if (input.mostrarTransformaciones !== undefined) update.mostrar_transformaciones = input.mostrarTransformaciones;
  if (input.transformaciones !== undefined) update.transformaciones = input.transformaciones;
  if (input.emailPublico !== undefined) update.email_publico = input.emailPublico || null;
  if (input.foto2Url !== undefined) update.foto2_url = input.foto2Url || null;
  if (input.foto3Url !== undefined) update.foto3_url = input.foto3Url || null;
  if (input.foto4Url !== undefined) update.foto4_url = input.foto4Url || null;
  if (input.servicios !== undefined) update.servicios = input.servicios;
  if (input.landingTemplate !== undefined) update.landing_template = input.landingTemplate || null;
  if (input.estadisticas !== undefined) update.estadisticas = input.estadisticas;
  if (input.testimonios !== undefined) update.testimonios = input.testimonios;
  if (input.tagline !== undefined) update.tagline = input.tagline || null;

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

export type PhotoSlot = "avatar_url" | "foto2_url" | "foto3_url" | "foto4_url";

/**
 * Igual que uploadTrainerAvatar pero genérica para cualquiera de las 4
 * fotos de perfil que puede tener un entrenador Starter (una por sección de
 * la landing: hero, sobre mí, y dos adicionales). Se guarda en el mismo
 * bucket público "avatars", solo cambia a qué columna se escribe la URL.
 */
export async function uploadTrainerPhoto(
  trainerId: string,
  slot: PhotoSlot,
  formData: FormData
): Promise<AdminActionResult & { url?: string }> {
  await requireAdmin();

  const file = formData.get("foto");
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
  const path = `${trainerId}/${slot}-${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, buffer, { contentType: file.type, upsert: true });
  if (uploadError) return { ok: false, error: uploadError.message };

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);

  const update: {
    avatar_url?: string;
    foto2_url?: string;
    foto3_url?: string;
    foto4_url?: string;
  } = {};
  if (slot === "avatar_url") update.avatar_url = data.publicUrl;
  else if (slot === "foto2_url") update.foto2_url = data.publicUrl;
  else if (slot === "foto3_url") update.foto3_url = data.publicUrl;
  else update.foto4_url = data.publicUrl;

  const { error: dbError } = await supabase.from("trainers").update(update).eq("id", trainerId);
  if (dbError) return { ok: false, error: dbError.message };

  await logTrainerActivity(trainerId, "informacion_actualizada", "Foto de la landing actualizada");

  return { ok: true, url: data.publicUrl };
}

/**
 * Sube una foto suelta para un par "antes"/"después" de la sección de
 * Transformaciones. A diferencia de uploadTrainerPhoto, no escribe ninguna
 * columna fija: solo sube el archivo y devuelve la URL pública, porque el
 * dato real vive dentro del array jsonb trainers.transformaciones y quien
 * llama (LandingEditorView / TransformacionesPanel) decide en qué posición
 * del array guardarla vía updateTrainer.
 */
export async function uploadTransformacionPhoto(
  trainerId: string,
  formData: FormData
): Promise<AdminActionResult & { url?: string }> {
  await requireAdmin();

  const file = formData.get("foto");
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
  const path = `${trainerId}/transformaciones/${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, buffer, { contentType: file.type, upsert: true });
  if (uploadError) return { ok: false, error: uploadError.message };

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);

  return { ok: true, url: data.publicUrl };
}

/**
 * Sube la foto de perfil de una solicitud (lead) — antes de que exista un
 * entrenador. Se usa desde Solicitudes para dejar la foto lista de una vez,
 * en vez de tener que volver a subirla después de aprobar. Se guarda en el
 * mismo bucket público "avatars"; al aprobar, convertLeadToTrainer copia esta
 * URL a trainers.avatar_url.
 */
export async function uploadLeadAvatar(
  leadId: string,
  formData: FormData
): Promise<AdminActionResult & { url?: string }> {
  await requireAdmin();

  const file = formData.get("foto");
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
  const path = `leads/${leadId}/${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, buffer, { contentType: file.type, upsert: true });
  if (uploadError) return { ok: false, error: uploadError.message };

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);

  const { error: dbError } = await supabase
    .from("hakunnafit_leads")
    .update({ avatar_url: data.publicUrl })
    .eq("id", leadId);
  if (dbError) return { ok: false, error: dbError.message };

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
    .select("business_name, plan, landing_status, dashboard_access, proximo_cobro, lead_id")
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

  // Si este entrenador venía de una solicitud, la solicitud queda marcada
  // "entrenador_creado" para siempre a menos que la regresemos — si no,
  // queda huérfana: no aparece ningún entrenador para editarla, pero tampoco
  // se puede volver a aprobar desde Solicitudes. Al eliminar el entrenador,
  // la regresamos a "en_revision" para que se pueda corregir y volver a
  // aprobar normalmente.
  if (trainer.lead_id) {
    await supabase.from("hakunnafit_leads").update({ estado: "en_revision" }).eq("id", trainer.lead_id);
  }

  return { ok: true };
}

/**
 * Carga todo lo necesario para la pantalla "Crear Entrenador": la solicitud
 * y el registro de entrenador en borrador que dejó approveSolicitud, ya con
 * todo lo que el propio entrenador llenó en el wizard de onboarding. Solo
 * tiene sentido para leads que ya pasaron por ahí (informacion_completada) o
 * que ya fueron creados (entrenador_creado, para poder revisar en modo
 * solo-lectura lo que se activó).
 */
export async function getLeadForRevision(
  leadId: string
): Promise<{ lead: LeadRow; trainer: TrainerRow } | null> {
  await requireAdmin();
  const supabase = getSupabaseAdmin();

  const { data: lead, error: leadError } = await supabase
    .from("hakunnafit_leads")
    .select("*")
    .eq("id", leadId)
    .single();
  if (leadError || !lead) return null;

  const { data: trainer, error: trainerError } = await supabase
    .from("trainers")
    .select("*")
    .eq("lead_id", leadId)
    .single();
  if (trainerError || !trainer) return null;

  return { lead: lead as LeadRow, trainer: trainer as TrainerRow };
}

/**
 * "Crear Entrenador" — el paso final del flujo guiado. Nando revisa en
 * /panel-hakunna/revision/[leadId] todo lo que el entrenador llenó en el
 * onboarding y, si está conforme, confirma aquí: recién en este momento se
 * activa de verdad la landing y (si el plan lo incluye) el dashboard —
 * approveSolicitud solo dejó la cuenta en borrador y submitOnboardingWizard
 * a propósito no tocó ninguno de estos dos.
 *
 * Starter: landing publicada, dashboard sigue sin acceso (su panel de
 * autoservicio todavía no existe — fase siguiente del roadmap).
 * Pro/Elite: dashboard activo de una vez (el diseño de su landing lo hace
 * Nando manualmente después, desde Administrar Landing) — landing queda
 * "pendiente" hasta que él la publique.
 *
 * También arranca aquí el ciclo comercial de la cuenta: sella
 * contrato_inicio = hoy y fija el primer proximo_cobro a TRIAL_DAYS (15)
 * días desde hoy — ese es el período de prueba gratis. Al vencer ese primer
 * proximo_cobro sin pago, el cron de lib/subscription-lifecycle.ts bloquea
 * el panel solo; si paga, el webhook de Wompi avanza proximo_cobro +1 mes
 * automáticamente (ver app/api/wompi/webhook/route.ts, rama "hf-trainer-").
 * No se hace antes en approveSolicitud porque en ese punto todavía no había
 * plan confirmado por completo ni fecha de activación real.
 */
export async function activarEntrenador(leadId: string): Promise<AdminActionResult> {
  await requireAdmin();
  const supabase = getSupabaseAdmin();

  const { data: lead, error: leadError } = await supabase
    .from("hakunnafit_leads")
    .select("*")
    .eq("id", leadId)
    .single();
  if (leadError || !lead) return { ok: false, error: "No se encontró la solicitud." };

  if (lead.estado === "entrenador_creado") {
    return { ok: false, error: "Este entrenador ya fue creado." };
  }
  if (lead.estado !== "informacion_completada") {
    return { ok: false, error: "Esta solicitud todavía no completó el onboarding." };
  }

  const { data: trainer, error: trainerError } = await supabase
    .from("trainers")
    .select("id, plan, business_name, subdominio, email_publico")
    .eq("lead_id", leadId)
    .single();
  if (trainerError || !trainer) {
    return { ok: false, error: "No se encontró el registro de entrenador para esta solicitud." };
  }

  const plan = trainer.plan as PlanKey | null;
  if (!plan) return { ok: false, error: "Este entrenador no tiene un plan asignado." };

  const hoy = new Date();
  const proximoCobro = new Date(hoy);
  proximoCobro.setDate(proximoCobro.getDate() + TRIAL_DAYS);

  const { error: updateError } = await supabase
    .from("trainers")
    .update({
      landing_status: plan === "starter" ? "publicada" : "pendiente",
      dashboard_access: plan === "starter" ? "sin_acceso" : "activo",
      proximo_cobro: proximoCobro.toISOString().slice(0, 10),
      contrato_inicio: hoy.toISOString().slice(0, 10),
    })
    .eq("id", trainer.id);
  if (updateError) return { ok: false, error: updateError.message };

  await supabase.from("hakunnafit_leads").update({ estado: "entrenador_creado" }).eq("id", leadId);

  const subdominioTxt = trainer.subdominio ? `${trainer.subdominio}.hakunnafit.com` : null;

  await createNotification({
    type: "entrenador_aprobado",
    title: `Entrenador creado: ${trainer.business_name}`,
    message: `${trainer.business_name} quedó activo con el plan ${planLabel(plan)}${
      subdominioTxt ? ` (${subdominioTxt})` : ""
    }.`,
    link: "/panel-hakunna/entrenadores",
    trainerId: trainer.id,
    leadId,
  });

  await logTrainerActivity(
    trainer.id,
    "cuenta_creada",
    "Entrenador creado",
    `Landing y acceso activados tras revisar el onboarding (plan ${planLabel(plan)}).`
  );

  const welcomeMessage =
    plan === "starter"
      ? `Tu landing ya está publicada${subdominioTxt ? ` en ${subdominioTxt}` : ""}. Crea tu contraseña para entrar a tu panel y editar textos, fotos, logo y colores cuando quieras.`
      : "Ya quedaste activo en Hakunna Fit. Nuestro equipo va a diseñar tu landing a la medida — en cuanto esté lista, crea tu contraseña para entrar a tu panel y ajustar textos, fotos, logo y colores.";

  // Genera un link de "crear contraseña" (recovery de Supabase Auth) para el
  // primer acceso al panel de autoservicio — este entrenador nunca tuvo
  // contraseña porque su cuenta se creó server-side (auth.admin.createUser)
  // sin una. Si falla, el correo sale igual sin el botón de acceso; el
  // entrenador puede pedir "olvidé mi contraseña" desde /panel/login más
  // adelante.
  let setPasswordUrl: string | undefined;
  try {
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: "recovery",
      email: lead.email,
      options: { redirectTo: `${SITE_URL}/auth/callback?next=/panel/set-password` },
    });
    if (!linkError) setPasswordUrl = linkData?.properties?.action_link;
  } catch {
    setPasswordUrl = undefined;
  }

  await sendLeadEmail({
    to: lead.email,
    subject: "Tu cuenta en Hakunna Fit ya está activa",
    html: renderLeadEmail({
      nombre: lead.nombre,
      title: "¡Tu cuenta ya está activa!",
      message: welcomeMessage,
      ctaLabel: setPasswordUrl ? "Crear mi contraseña" : undefined,
      ctaUrl: setPasswordUrl,
      color: "#00C8FF",
    }),
  }).catch(() => {});

  return { ok: true };
}
