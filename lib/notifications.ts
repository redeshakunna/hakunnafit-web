"use server";

import { getSupabaseAdmin } from "./supabase-admin";
import { isAdminAuthenticated } from "./admin-auth";
import { sendAdminEmail, renderNotificationEmail } from "./email";
import { PLAN_PRICE_COP, planLabel, type PlanKey } from "./catalog";

export type NotificationType =
  | "lead_nuevo"
  | "entrenador_aprobado"
  | "estado_cambio"
  | "cobro_por_vencer";

export interface NotificationRow {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  trainer_id: string | null;
  lead_id: string | null;
  read: boolean;
  created_at: string;
}

export interface NotificationsResult {
  items: NotificationRow[];
  unreadCount: number;
}

async function requireAdmin() {
  const ok = await isAdminAuthenticated();
  if (!ok) throw new Error("No autorizado");
}

/**
 * Crea una notificación (in-app) y, si está configurado RESEND_API_KEY,
 * también envía un correo a Nando. No requiere sesión de admin porque se
 * llama desde flujos públicos (ej: cuando un visitante envía el formulario
 * del home) además de desde el panel.
 */
export async function createNotification(input: {
  type: NotificationType;
  title: string;
  message: string;
  link?: string | null;
  trainerId?: string | null;
  leadId?: string | null;
  sendEmail?: boolean;
}): Promise<void> {
  try {
    const supabase = getSupabaseAdmin();
    await supabase.from("notifications").insert({
      type: input.type,
      title: input.title,
      message: input.message,
      link: input.link ?? null,
      trainer_id: input.trainerId ?? null,
      lead_id: input.leadId ?? null,
    });
  } catch {
    // Una notificación fallida no debe romper el flujo principal (crear lead,
    // aprobar entrenador, etc.).
  }

  if (input.sendEmail !== false) {
    await sendAdminEmail({
      subject: input.title,
      html: renderNotificationEmail({
        type: input.type,
        title: input.title,
        message: input.message,
        link: input.link,
      }),
    }).catch(() => {});
  }
}

const UPCOMING_CHARGE_THRESHOLD_DAYS = 5;
// Ventana para evitar duplicados: si ya se avisó de este entrenador en los
// últimos 25 días, no se vuelve a crear otra notificación (el ciclo de cobro
// normalmente se renueva cada ~30 días).
const DEDUPE_WINDOW_DAYS = 25;

const PASARELA_LABELS: Record<string, string> = {
  wompi: "Wompi",
  stripe: "Stripe",
  mercado_pago: "Mercado Pago",
  aun_no_se: "Aún no definida",
};

function formatCop(n: number): string {
  return `$${new Intl.NumberFormat("es-CO").format(n)} COP`;
}

function formatBillingMonth(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00`);
  const label = d.toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/**
 * Revisa entrenadores con próximo cobro cercano y crea una notificación por
 * cada uno si no se avisó ya en este mismo ciclo (ventana de dedupe de 25
 * días). Se llama tanto desde listNotifications() (así funciona con solo
 * abrir el panel) como desde el cron /api/cron/cobros-por-vencer (para que
 * llegue aunque nadie abra el panel ese día).
 */
export async function syncUpcomingChargeNotifications(): Promise<void> {
  const supabase = getSupabaseAdmin();

  const limitDate = new Date();
  limitDate.setDate(limitDate.getDate() + UPCOMING_CHARGE_THRESHOLD_DAYS);
  const limitIso = limitDate.toISOString().slice(0, 10);

  const { data: trainers } = await supabase
    .from("trainers")
    .select("id, business_name, plan, proximo_cobro, lead_id")
    .not("proximo_cobro", "is", null)
    .lte("proximo_cobro", limitIso);

  if (!trainers || trainers.length === 0) return;

  const leadIds = trainers.map((t) => t.lead_id).filter((id): id is string => !!id);
  const { data: leads } = leadIds.length
    ? await supabase.from("hakunnafit_leads").select("id, pasarela_interes").in("id", leadIds)
    : { data: [] as { id: string; pasarela_interes: string | null }[] };
  const pasarelaByLeadId = new Map((leads ?? []).map((l) => [l.id, l.pasarela_interes]));

  const dedupeSince = new Date();
  dedupeSince.setDate(dedupeSince.getDate() - DEDUPE_WINDOW_DAYS);

  for (const t of trainers) {
    if (!t.proximo_cobro) continue;

    const { data: existing } = await supabase
      .from("notifications")
      .select("id")
      .eq("type", "cobro_por_vencer")
      .eq("trainer_id", t.id)
      .gte("created_at", dedupeSince.toISOString())
      .limit(1);

    if (existing && existing.length > 0) continue;

    const plan = t.plan as PlanKey | null;
    const planPrice = plan ? PLAN_PRICE_COP[plan] : null;
    const planTxt = plan ? planLabel(plan) : "sin plan definido";
    const priceTxt = planPrice ? formatCop(planPrice) : "monto no definido";
    const monthTxt = formatBillingMonth(t.proximo_cobro);
    const pasarelaRaw = t.lead_id ? pasarelaByLeadId.get(t.lead_id) : null;
    const pasarelaTxt = pasarelaRaw ? PASARELA_LABELS[pasarelaRaw] ?? pasarelaRaw : "no indicada";

    await createNotification({
      type: "cobro_por_vencer",
      title: "Cobro próximo a vencer",
      message: `${t.business_name} (plan ${planTxt}, ${priceTxt}/mes) tiene su próximo cobro el ${monthTxt}. Pasarela preferida: ${pasarelaTxt}.`,
      link: "/panel-hakunna/entrenadores",
      trainerId: t.id,
    });
  }
}

export async function listNotifications(limit = 20): Promise<NotificationsResult> {
  await requireAdmin();

  await syncUpcomingChargeNotifications().catch(() => {});

  const supabase = getSupabaseAdmin();
  const [{ data: items }, { count }] = await Promise.all([
    supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("read", false),
  ]);

  return {
    items: (items as NotificationRow[]) ?? [],
    unreadCount: count ?? 0,
  };
}

export async function markNotificationRead(id: string): Promise<void> {
  await requireAdmin();
  const supabase = getSupabaseAdmin();
  await supabase.from("notifications").update({ read: true }).eq("id", id);
}

export async function markAllNotificationsRead(): Promise<void> {
  await requireAdmin();
  const supabase = getSupabaseAdmin();
  await supabase.from("notifications").update({ read: true }).eq("read", false);
}
