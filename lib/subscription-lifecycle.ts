"use server";

// Ciclo de vida de la suscripción de un entrenador — trial gratis, bloqueo
// automático por impago y consulta del propio entrenador sobre su estado.
//
// Resumen del flujo completo (ver también activarEntrenador en
// admin-actions.ts y la rama "hf-trainer-" del webhook de Wompi):
// 1. Nando aprueba/activa al entrenador sin exigir pago (ya no se bloquea
//    en approveSolicitud) — contrato_inicio = hoy, proximo_cobro = hoy +
//    TRIAL_DAYS (15 días de prueba gratis, dashboard_access = "activo").
// 2. Si al llegar proximo_cobro no hay pago, checkAndLockOverdueTrainers()
//    (cron diario) pone dashboard_access = "bloqueado" — el panel completo
//    se reemplaza por una pantalla de pago (ver TrainerAccessLocked).
// 3. Si el entrenador paga, el webhook de Wompi reactiva dashboard_access a
//    "activo" y avanza proximo_cobro +1 mes automáticamente.
// 4. dashboard_access = "suspendido" sigue siendo la palanca manual de
//    Nando (por motivos no necesariamente de pago) — este cron nunca la
//    toca, ni el webhook la reactiva sola.
//
// CONTRACT_MIN_MONTHS (6 meses) es solo informativo por ahora: no hay
// ninguna penalización ni bloqueo técnico si el entrenador deja de pagar
// antes de cumplirlo, solo se muestra la fecha de compromiso en Mi Negocio
// y en el editor de entrenador (admin-helpers.ts: contractCommittedUntil).

import { getSupabaseAdmin } from "./supabase-admin";
import { getSupabaseServerClient } from "./supabase-server";
import { requireTrainer } from "./trainer-auth";
import { isBlockedTrainer } from "./admin-helpers";
import { buildWompiCheckoutUrl } from "./wompi";
import { getPlanPrices } from "./plan-settings-actions";
import { planLabel, type PlanKey } from "./catalog";
import { createNotification } from "./notifications";
import { sendLeadEmail, renderLeadEmail } from "./email";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://hakunnafit.com";

/**
 * Revisa todos los entrenadores con dashboard_access = "activo" cuyo
 * proximo_cobro ya venció y los bloquea automáticamente — pensado para
 * correr una vez al día desde /api/cron/check-overdue-payments. Solo toca
 * entrenadores "activo" (nunca "suspendido", que es la palanca manual de
 * Nando, ni "sin_acceso", que es el estado normal de un plan Starter sin
 * dashboard).
 */
export async function checkAndLockOverdueTrainers(): Promise<{ blocked: number }> {
  const supabase = getSupabaseAdmin();
  const todayIso = new Date().toISOString().slice(0, 10);

  const { data: trainers } = await supabase
    .from("trainers")
    .select("id, business_name, plan, proximo_cobro")
    .eq("dashboard_access", "activo")
    .not("proximo_cobro", "is", null)
    .lt("proximo_cobro", todayIso);

  if (!trainers || trainers.length === 0) return { blocked: 0 };

  const trainerIds = trainers.map((t) => t.id);
  const { data: profiles } = await supabase.from("profiles").select("id, email").in("id", trainerIds);
  const emailByTrainerId = new Map((profiles ?? []).map((p) => [p.id, p.email]));
  const planPrices = await getPlanPrices();

  for (const t of trainers) {
    await supabase.from("trainers").update({ dashboard_access: "bloqueado" }).eq("id", t.id);

    const plan = t.plan as PlanKey | null;
    const trainerEmail = emailByTrainerId.get(t.id);
    const priceCop = plan ? planPrices[plan].monthlyCop : null;

    let paymentUrl: string | null = null;
    if (plan && trainerEmail && t.proximo_cobro && priceCop) {
      try {
        paymentUrl = buildWompiCheckoutUrl({
          reference: `hf-trainer-${t.id}-${t.proximo_cobro}`,
          amountInCents: priceCop * 100,
          redirectUrl: `${SITE_URL}/pago-recibido`,
          buyerEmail: trainerEmail,
          buyerName: t.business_name,
        });
      } catch {
        paymentUrl = null;
      }
    }

    await createNotification({
      type: "estado_cambio",
      title: `Panel bloqueado por impago: ${t.business_name}`,
      message: `${t.business_name} no pagó a tiempo (vencía el ${t.proximo_cobro}) y su panel quedó bloqueado automáticamente.${
        paymentUrl ? ` Link de pago: ${paymentUrl}` : ""
      }`,
      link: "/panel-hakunna/entrenadores",
      trainerId: t.id,
    });

    if (trainerEmail) {
      await sendLeadEmail({
        to: trainerEmail,
        subject: "Tu panel de HakunnaFit fue bloqueado por falta de pago",
        html: renderLeadEmail({
          nombre: t.business_name,
          title: "Tu panel quedó bloqueado",
          message: `No recibimos el pago de tu plan ${plan ? planLabel(plan) : ""} y tu panel quedó bloqueado. Paga ahora para recuperar el acceso de inmediato.`,
          ctaLabel: paymentUrl ? "Pagar ahora" : undefined,
          ctaUrl: paymentUrl ?? undefined,
          color: "#E5484D",
        }),
      }).catch(() => {});
    }
  }

  return { blocked: trainers.length };
}

export interface OwnAccessStatus {
  blocked: boolean;
  reason: "impago" | "suspendido" | null;
  amountCop: number | null;
  dueDate: string | null;
  paymentUrl: string | null;
}

/**
 * Estado de acceso del entrenador logueado — consumido por
 * TrainerAccessLocked para armar la pantalla de bloqueo total (monto
 * atrasado + link de pago cuando es por impago; mensaje genérico cuando es
 * suspensión manual de Nando).
 */
export async function getOwnAccessStatus(): Promise<OwnAccessStatus> {
  const trainer = await requireTrainer();

  if (!isBlockedTrainer(trainer)) {
    return { blocked: false, reason: null, amountCop: null, dueDate: null, paymentUrl: null };
  }

  if (trainer.dashboard_access === "suspendido") {
    return { blocked: true, reason: "suspendido", amountCop: null, dueDate: null, paymentUrl: null };
  }

  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const email = user?.email ?? null;

  let amountCop: number | null = null;
  let paymentUrl: string | null = null;
  if (trainer.plan && email && trainer.proximo_cobro) {
    const prices = await getPlanPrices();
    amountCop = prices[trainer.plan].monthlyCop;
    try {
      paymentUrl = buildWompiCheckoutUrl({
        reference: `hf-trainer-${trainer.id}-${trainer.proximo_cobro}`,
        amountInCents: amountCop * 100,
        redirectUrl: `${SITE_URL}/pago-recibido`,
        buyerEmail: email,
        buyerName: trainer.business_name,
      });
    } catch {
      paymentUrl = null;
    }
  }

  return { blocked: true, reason: "impago", amountCop, dueDate: trainer.proximo_cobro, paymentUrl };
}
