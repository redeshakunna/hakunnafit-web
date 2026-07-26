import type { TrainerRow } from "./admin-actions";

/**
 * Un entrenador cuenta como "activo" (para KPIs e ingresos) si:
 * - Starter: su landing ya está publicada (no tiene dashboard, así que ese es su indicador de uso real).
 * - Pro/Elite: su acceso al dashboard está activo.
 */
export function isActiveTrainer(t: Pick<TrainerRow, "plan" | "landing_status" | "dashboard_access">) {
  if (t.plan === "starter") return t.landing_status === "publicada";
  return t.dashboard_access === "activo";
}

/**
 * Un entrenador cuenta como "suspendido" (para mostrarlo así en Estado de
 * pago y para bloquear su eliminación) según la misma señal por plan que ya
 * usa isActiveTrainer: Starter se controla por landing_status, Pro/Elite por
 * dashboard_access.
 */
export function isSuspendedTrainer(t: Pick<TrainerRow, "plan" | "landing_status" | "dashboard_access">) {
  if (t.plan === "starter") return t.landing_status === "suspendida";
  return t.dashboard_access === "suspendido";
}

export type PaymentStatus = "al_dia" | "proximo_vencer" | "vencido" | "sin_datos" | "suspendido";

export function getPaymentStatus(proximoCobro: string | null, isSuspended: boolean): PaymentStatus {
  if (isSuspended) return "suspendido";
  if (!proximoCobro) return "sin_datos";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(proximoCobro);
  const in7Days = new Date(today);
  in7Days.setDate(in7Days.getDate() + 7);
  if (date < today) return "vencido";
  if (date <= in7Days) return "proximo_vencer";
  return "al_dia";
}

/**
 * ¿El propio entrenador puede editar su landing (textos/fotos/logo/colores)
 * desde su panel de autoservicio?
 * - Starter: sí, en cuanto se crea (su landing se publica sola al activarse).
 * - Pro/Elite: no hasta que Nando termine el diseño manual y la landing quede
 *   "publicada" — antes de eso cualquier cambio del entrenador se perdería
 *   con el próximo ajuste de diseño de Nando.
 */
export function canEditLanding(t: Pick<TrainerRow, "plan" | "landing_status">): boolean {
  if (t.plan === "starter") return true;
  return t.landing_status === "publicada";
}

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  al_dia: "Al día",
  proximo_vencer: "Próximo a vencer",
  vencido: "Vencido",
  sin_datos: "Sin datos",
  suspendido: "Suspendido",
};
