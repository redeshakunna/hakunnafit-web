"use server";

import { getSupabaseAdmin } from "./supabase-admin";
import { isAdminAuthenticated } from "./admin-auth";
import { sendAdminEmail, renderNotificationEmail, sendLeadEmail, renderLeadEmail } from "./email";
import { PLAN_PRICE_COP, planLabel, type PlanKey } from "./catalog";
import { buildWompiCheckoutUrl } from "./wompi";
import { getPlanPrices } from "./plan-settings-actions";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://hakunnafit.com";

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
  dedupeKey?: string | null;
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
      dedupe_key: input.dedupeKey ?? null,
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

// Tres avisos por ciclo de cobro: 5 días antes, 3 días antes y el mismo día.
// Cada uno se deduplica por su propio dedupe_key (trainer + fecha de cobro +
// umbral), así que se envían los tres sin pisarse entre sí, y si el admin
// cambia proximo_cobro (nuevo ciclo), los tres se vuelven a disparar solos.
const REMINDER_THRESHOLDS = [5, 3, 0] as const;

function whenLabel(daysUntil: number): string {
  if (daysUntil === 0) return "hoy";
  if (daysUntil === 1) return "mañana";
  return `en ${daysUntil} días`;
}

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
 * Revisa entrenadores con próximo cobro cercano y crea hasta 3 notificaciones
 * por ciclo: 5 días antes, 3 días antes y el mismo día. Cada una se
 * deduplica por su propio dedupe_key (trainer + fecha de cobro + umbral), y
 * cada una avisa tanto a Nando (in-app + correo) como al entrenador (correo
 * directo a su cuenta, recordándole que pague). Se llama tanto desde
 * listNotifications() (así funciona con solo abrir el panel) como desde el
 * cron /api/cron/cobros-por-vencer (para que llegue aunque nadie abra el
 * panel ese día).
 */
export async function syncUpcomingChargeNotifications(): Promise<void> {
  const supabase = getSupabaseAdmin();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString().slice(0, 10);

  const maxThreshold = Math.max(...REMINDER_THRESHOLDS);
  const limitDate = new Date(today);
  limitDate.setDate(limitDate.getDate() + maxThreshold);
  const limitIso = limitDate.toISOString().slice(0, 10);

  const { data: trainers } = await supabase
    .from("trainers")
    .select("id, business_name, plan, proximo_cobro, lead_id")
    .not("proximo_cobro", "is", null)
    .gte("proximo_cobro", todayIso)
    .lte("proximo_cobro", limitIso);

  if (!trainers || trainers.length === 0) return;

  const trainerIds = trainers.map((t) => t.id);
  const leadIds = trainers.map((t) => t.lead_id).filter((id): id is string => !!id);

  const [{ data: profiles }, { data: leads }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email")
      .in("id", trainerIds.length ? trainerIds : ["00000000-0000-0000-0000-000000000000"]),
    leadIds.length
      ? supabase.from("hakunnafit_leads").select("id, pasarela_interes").in("id", leadIds)
      : Promise.resolve({ data: [] as { id: string; pasarela_interes: string | null }[] }),
  ]);

  const emailByTrainerId = new Map((profiles ?? []).map((p) => [p.id, p.email]));
  const pasarelaByLeadId = new Map((leads ?? []).map((l) => [l.id, l.pasarela_interes]));
  const planPrices = await getPlanPrices();

  for (const t of trainers) {
    if (!t.proximo_cobro) continue;

    const cobroDate = new Date(`${t.proximo_cobro}T00:00:00`);
    const daysUntil = Math.round((cobroDate.getTime() - today.getTime()) / 86_400_000);

    const threshold = REMINDER_THRESHOLDS.find((d) => d === daysUntil);
    if (threshold === undefined) continue;

    const dedupeKey = `cobro:${t.id}:${t.proximo_cobro}:${threshold}`;
    const { data: existing } = await supabase
      .from("notifications")
      .select("id")
      .eq("dedupe_key", dedupeKey)
      .limit(1);
    if (existing && existing.length > 0) continue;

    const plan = t.plan as PlanKey | null;
    const planPrice = plan ? PLAN_PRICE_COP[plan] : null;
    const planTxt = plan ? planLabel(plan) : "sin plan definido";
    const priceTxt = planPrice ? formatCop(planPrice) : "monto no definido";
    const monthTxt = formatBillingMonth(t.proximo_cobro);
    const pasarelaRaw = t.lead_id ? pasarelaByLeadId.get(t.lead_id) : null;
    const pasarelaTxt = pasarelaRaw ? PASARELA_LABELS[pasarelaRaw] ?? pasarelaRaw : "no indicada";
    const whenTxt = whenLabel(threshold);
    const trainerEmail = emailByTrainerId.get(t.id);

    // Link de pago de Wompi (pago único, no auto-recurrente — ver
    // generatePaymentLink en admin-actions.ts para la misma lógica aplicada
    // a solicitudes). Se recalcula siempre a partir de la referencia
    // determinística, así que si el entrenador no paga, el mismo link sigue
    // sirviendo para los 3 avisos del ciclo.
    let paymentUrl: string | null = null;
    if (plan && trainerEmail) {
      try {
        paymentUrl = buildWompiCheckoutUrl({
          reference: `hf-trainer-${t.id}-${t.proximo_cobro}`,
          amountInCents: planPrices[plan].monthlyCop * 100,
          redirectUrl: `${SITE_URL}/pago-recibido`,
          buyerEmail: trainerEmail,
          buyerName: t.business_name,
        });
      } catch {
        paymentUrl = null;
      }
    }

    await createNotification({
      type: "cobro_por_vencer",
      title: threshold === 0 ? `Cobro vence hoy: ${t.business_name}` : `Cobro próximo a vencer (${whenTxt}): ${t.business_name}`,
      message: `${t.business_name} (plan ${planTxt}, ${priceTxt}/mes) tiene su próximo cobro ${whenTxt} — ${monthTxt}. Pasarela preferida: ${pasarelaTxt}.${
        paymentUrl ? ` Link de pago: ${paymentUrl}` : ""
      }`,
      link: "/panel-hakunna/entrenadores",
      trainerId: t.id,
      dedupeKey,
    });

    if (trainerEmail) {
      await sendLeadEmail({
        to: trainerEmail,
        subject: threshold === 0 ? "Tu pago del plan vence hoy" : `Tu pago del plan vence ${whenTxt}`,
        html: renderLeadEmail({
          nombre: t.business_name,
          title: threshold === 0 ? "Tu pago del plan vence hoy" : `Tu pago del plan vence ${whenTxt}`,
          message: `Tu próximo pago del plan ${planTxt} (${priceTxt}) está programado para el ${monthTxt}.${
            paymentUrl
              ? " Puedes pagarlo ahora mismo con el botón de abajo."
              : " Escríbenos para coordinar el pago y evitar que se suspenda tu acceso."
          }`,
          ctaLabel: paymentUrl ? "Pagar ahora" : undefined,
          ctaUrl: paymentUrl ?? undefined,
          color: "#F5A623",
        }),
      }).catch(() => {});
    }
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
