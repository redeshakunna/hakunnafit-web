// Helpers puros (sin "use server") de facturación del cliente final al
// entrenador — viven fuera de client-billing-actions.ts a propósito, mismo
// motivo que lib/agenda-whatsapp.ts: un archivo "use server" exige que TODO
// export sea una server action async, y esto es solo cálculo de fechas/texto
// sin tocar la base de datos ni cookies (romper esa regla es justo lo que
// causó el "Build Error: Server actions must be async functions" del
// task #360).

import type { DatosCobro, PlanOfrecido } from "./admin-actions";

export interface BillingSnapshot {
  plan_precio_cop: number;
  fecha_inicio_facturacion: string;
  proximo_cobro_cliente: string;
}

export function addOneMonth(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00`);
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().slice(0, 10);
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Arranca el ciclo de cobro de un cliente NUEVO: precio congelado del plan
 * elegido, fecha de inicio = hoy, primer cobro = hoy + 1 mes. Si el plan no
 * existe en planesOfrecidos o no tiene precio fijo (precioCop null = "a
 * cotizar"), no devuelve nada — el entrenador completa el precio a mano
 * desde la ficha (setClientBilling) y ahí arranca el ciclo.
 */
export function computeBillingSnapshotOnPlanChoice(
  planElegido: string | null | undefined,
  planesOfrecidos: PlanOfrecido[]
): BillingSnapshot | null {
  if (!planElegido) return null;
  const plan = planesOfrecidos.find((p) => p.nombre === planElegido);
  if (!plan || plan.precioCop == null) return null;
  const start = todayIso();
  return {
    plan_precio_cop: plan.precioCop,
    fecha_inicio_facturacion: start,
    proximo_cobro_cliente: addOneMonth(start),
  };
}

/**
 * Para un cliente que YA tiene el ciclo de cobro arrancado (proximo_cobro_cliente
 * definido) y cambia de plan: solo actualiza el precio si el plan nuevo
 * coincide con uno con precio fijo, sin tocar las fechas — cambiar de plan no
 * debería reiniciar el ciclo de cobro a mitad de mes.
 */
export function computePriceOnlyOnPlanChange(
  planElegido: string | null | undefined,
  planesOfrecidos: PlanOfrecido[]
): number | null {
  if (!planElegido) return null;
  const plan = planesOfrecidos.find((p) => p.nombre === planElegido);
  return plan?.precioCop ?? null;
}

// ---------------------------------------------------------------------------
// Mensaje de WhatsApp del recordatorio de cobro — el entrenador siempre
// confirma el envío a mano, nunca se manda nada automático.
// ---------------------------------------------------------------------------

function formatCop(n: number): string {
  return `$${new Intl.NumberFormat("es-CO").format(n)} COP`;
}

function formatFecha(isoDate: string): string {
  const d = new Date(`${isoDate}T00:00:00`);
  return d.toLocaleDateString("es-CO", { day: "numeric", month: "long" });
}

export function buildClientPaymentWhatsappLink(input: {
  clientFullName: string;
  clientWhatsapp: string;
  montoCop: number;
  fechaCobro: string;
  datosCobro: DatosCobro | null;
}): string {
  const digits = input.clientWhatsapp.replace(/\D/g, "");
  const lineas = [
    `Hola ${input.clientFullName}! Te recuerdo el pago de tu mensualidad:`,
    "",
    `💰 Valor: ${formatCop(input.montoCop)}`,
    `📅 Fecha: ${formatFecha(input.fechaCobro)}`,
    "",
  ];

  const d = input.datosCobro;
  if (d?.banco || d?.numeroCuenta) {
    lineas.push(
      `🏦 ${d.banco ?? "Cuenta"}${d.tipoCuenta ? ` (${d.tipoCuenta === "ahorros" ? "Ahorros" : "Corriente"})` : ""}: ${d.numeroCuenta ?? ""}`
    );
  }
  if (d?.llaveBreB) lineas.push(`🔑 Llave: ${d.llaveBreB}`);
  if (d?.nequi) lineas.push(`📱 Nequi: ${d.nequi}`);
  if (d?.titular) lineas.push(`👤 A nombre de: ${d.titular}`);
  lineas.push("", "¡Me avisas cuando la hagas para confirmarte! 💪");

  return `https://wa.me/${digits}?text=${encodeURIComponent(lineas.join("\n"))}`;
}
