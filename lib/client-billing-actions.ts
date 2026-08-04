"use server";

// Facturación del cliente final al entrenador (mensualidad de su plan de
// entrenamiento) — transferencia bancaria directa, sin pasarela: el
// entrenador configura sus datos de cobro una vez (cuenta/llave Bre-B/Nequi)
// en Mi Negocio → Cobros, y desde ahí el sistema arma el mensaje de
// recordatorio con monto y fecha para que se lo mande al cliente por
// WhatsApp (ver buildClientPaymentWhatsappLink en lib/client-billing.ts). La
// confirmación de que el pago llegó siempre la hace el entrenador a mano
// ("Marcar como pagado") — no hay forma de verificar una transferencia
// bancaria directa desde acá.
//
// El precio se toma de trainers.planes_ofrecidos (el mismo catálogo que ya
// alimenta el selector de plan al dar de alta un cliente), pero se congela
// en clients.plan_precio_cop al momento de elegir el plan — si el entrenador
// sube el precio del plan después, no le cambia el cobro a los clientes que
// ya venían pagando el valor anterior.

import { getSupabaseAdmin } from "./supabase-admin";
import { requireTrainer } from "./trainer-auth";
import { assertOwnClient } from "./trainer-clients-actions";
import { addOneMonth, todayIso, buildClientPaymentWhatsappLink } from "./client-billing";
import type { AdminActionResult, DatosCobro } from "./admin-actions";
import type { Json } from "./database.types";

// ---------------------------------------------------------------------------
// Datos de cobro del entrenador (Mi Negocio → Cobros)
// ---------------------------------------------------------------------------

export async function updateOwnPaymentSettings(input: DatosCobro): Promise<AdminActionResult> {
  const trainer = await requireTrainer();
  const supabase = getSupabaseAdmin();

  const clean: DatosCobro = {
    titular: input.titular?.trim() || null,
    banco: input.banco?.trim() || null,
    tipoCuenta: input.tipoCuenta || null,
    numeroCuenta: input.numeroCuenta?.trim() || null,
    llaveBreB: input.llaveBreB?.trim() || null,
    nequi: input.nequi?.trim() || null,
  };

  const { error } = await supabase
    .from("trainers")
    .update({ datos_cobro: clean as unknown as Json })
    .eq("id", trainer.id);
  if (error) return { ok: false, error: error.message };

  await supabase
    .from("trainer_activity")
    .insert({ trainer_id: trainer.id, type: "informacion_actualizada", title: "Entrenador actualizó sus datos de cobro" });

  return { ok: true };
}

// ---------------------------------------------------------------------------
// Ficha del cliente: editar facturación a mano, marcar pagado, historial
// ---------------------------------------------------------------------------

export interface SetClientBillingInput {
  planPrecioCop?: number | null;
  fechaInicioFacturacion?: string | null;
  compromisoMesesMinimo?: number | null;
}

/**
 * Edición manual de los datos de facturación desde la ficha del cliente —
 * cubre el caso "a cotizar" (el plan no tiene precio fijo, el entrenador lo
 * define él mismo) y el ajuste de la fecha de inicio si el cliente en
 * realidad arrancó en otra fecha que la de alta en el sistema. Si todavía no
 * hay próximo cobro calculado, lo arranca a partir de la fecha de inicio.
 */
export async function setClientBilling(clientId: string, input: SetClientBillingInput): Promise<AdminActionResult> {
  await assertOwnClient(clientId);
  const supabase = getSupabaseAdmin();

  const { data: current } = await supabase
    .from("clients")
    .select("fecha_inicio_facturacion, proximo_cobro_cliente")
    .eq("id", clientId)
    .maybeSingle();

  const update: {
    plan_precio_cop?: number | null;
    fecha_inicio_facturacion?: string | null;
    proximo_cobro_cliente?: string | null;
    compromiso_meses_minimo?: number;
  } = {};

  if (input.planPrecioCop !== undefined) update.plan_precio_cop = input.planPrecioCop;
  if (input.compromisoMesesMinimo !== undefined && input.compromisoMesesMinimo !== null) {
    update.compromiso_meses_minimo = input.compromisoMesesMinimo;
  }

  if (input.fechaInicioFacturacion !== undefined) {
    const nuevaFecha = input.fechaInicioFacturacion;
    update.fecha_inicio_facturacion = nuevaFecha;
    // Si aún no había próximo cobro (primera vez que se define un precio/fecha),
    // o si se está corriendo la fecha de inicio, el próximo cobro se recalcula
    // a un mes de esa fecha — así arranca (o se realinea) el ciclo.
    if (nuevaFecha && (!current?.proximo_cobro_cliente || current.fecha_inicio_facturacion !== nuevaFecha)) {
      update.proximo_cobro_cliente = addOneMonth(nuevaFecha);
    }
  } else if (!current?.proximo_cobro_cliente && input.planPrecioCop && current?.fecha_inicio_facturacion) {
    // Se completó el precio (caso "a cotizar") sobre una fecha de inicio que
    // ya existía — arranca el ciclo ahora que hay monto.
    update.proximo_cobro_cliente = addOneMonth(current.fecha_inicio_facturacion);
  }

  if (Object.keys(update).length === 0) return { ok: true };

  const { error } = await supabase.from("clients").update(update).eq("id", clientId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export interface ClientPaymentRow {
  id: string;
  monto_cop: number;
  periodo_cubierto: string;
  pagado_en: string;
}

export async function getOwnClientPayments(clientId: string): Promise<ClientPaymentRow[]> {
  await assertOwnClient(clientId);
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("client_payments")
    .select("id, monto_cop, periodo_cubierto, pagado_en")
    .eq("client_id", clientId)
    .order("pagado_en", { ascending: false });
  return data ?? [];
}

/**
 * El entrenador confirma que le llegó la transferencia — registra el pago en
 * el historial, avanza el próximo cobro un mes y suma un mes al contador de
 * meses pagados (informativo, para ver el avance contra el compromiso
 * mínimo).
 */
export async function markClientPaymentReceived(clientId: string): Promise<AdminActionResult> {
  const { trainerId } = await assertOwnClient(clientId);
  const supabase = getSupabaseAdmin();

  const { data: client } = await supabase
    .from("clients")
    .select("plan_precio_cop, proximo_cobro_cliente, fecha_inicio_facturacion, meses_pagados")
    .eq("id", clientId)
    .maybeSingle();

  if (!client) return { ok: false, error: "Cliente no encontrado." };
  if (!client.plan_precio_cop) {
    return { ok: false, error: "Este cliente todavía no tiene un valor de plan definido — configúralo antes de marcar el pago." };
  }

  const periodoCubierto = client.proximo_cobro_cliente ?? client.fecha_inicio_facturacion ?? todayIso();

  const { error: insertError } = await supabase.from("client_payments").insert({
    client_id: clientId,
    trainer_id: trainerId,
    monto_cop: client.plan_precio_cop,
    periodo_cubierto: periodoCubierto,
  });
  if (insertError) return { ok: false, error: insertError.message };

  const { error: updateError } = await supabase
    .from("clients")
    .update({
      proximo_cobro_cliente: addOneMonth(periodoCubierto),
      meses_pagados: (client.meses_pagados ?? 0) + 1,
    })
    .eq("id", clientId);
  if (updateError) return { ok: false, error: updateError.message };

  return { ok: true };
}

// ---------------------------------------------------------------------------
// Recordatorios automáticos de cobro (5/3/0 días antes) — mismo patrón que
// syncUpcomingChargeNotifications() en lib/notifications.ts (el cobro de
// HakunnaFit al entrenador), pero para la mensualidad del cliente final al
// entrenador: en vez de la tabla `notifications` (esa alimenta la campanita
// de Nando en /panel-hakunna, gateada por sesión de admin), esto escribe en
// `trainer_activity` — la campanita del propio entrenador. Se llama desde el
// mismo cron /api/cron/cobros-por-vencer que ya corre a diario, para no
// sumar un cron nuevo (los planes gratis/hobby de Vercel limitan cuántos se
// pueden programar).
// ---------------------------------------------------------------------------

const REMINDER_THRESHOLDS = [5, 3, 0] as const;

export async function syncClientPaymentReminders(): Promise<void> {
  const supabase = getSupabaseAdmin();

  const today = todayIso();
  const maxThreshold = Math.max(...REMINDER_THRESHOLDS);
  const limitDate = new Date(`${today}T00:00:00`);
  limitDate.setDate(limitDate.getDate() + maxThreshold);
  const limitIso = limitDate.toISOString().slice(0, 10);

  const { data: clients } = await supabase
    .from("clients")
    .select("id, trainer_id, full_name, whatsapp, plan_precio_cop, proximo_cobro_cliente")
    .eq("status", "activo")
    .not("proximo_cobro_cliente", "is", null)
    .not("plan_precio_cop", "is", null)
    .not("whatsapp", "is", null)
    .gte("proximo_cobro_cliente", today)
    .lte("proximo_cobro_cliente", limitIso);

  if (!clients || clients.length === 0) return;

  const trainerIds = Array.from(new Set(clients.map((c) => c.trainer_id)));
  const { data: trainers } = await supabase.from("trainers").select("id, datos_cobro").in("id", trainerIds);
  const datosCobroByTrainerId = new Map((trainers ?? []).map((t) => [t.id, t.datos_cobro as unknown as DatosCobro | null]));

  const todayDate = new Date(`${today}T00:00:00`);

  for (const c of clients) {
    if (!c.proximo_cobro_cliente || !c.plan_precio_cop || !c.whatsapp) continue;

    const cobroDate = new Date(`${c.proximo_cobro_cliente}T00:00:00`);
    const daysUntil = Math.round((cobroDate.getTime() - todayDate.getTime()) / 86_400_000);
    const threshold = REMINDER_THRESHOLDS.find((d) => d === daysUntil);
    if (threshold === undefined) continue;

    const dedupeKey = `cobro-cliente:${c.id}:${c.proximo_cobro_cliente}:${threshold}`;
    const { data: existing } = await supabase.from("trainer_activity").select("id").eq("dedupe_key", dedupeKey).limit(1);
    if (existing && existing.length > 0) continue;

    const whatsappLink = buildClientPaymentWhatsappLink({
      clientFullName: c.full_name,
      clientWhatsapp: c.whatsapp,
      montoCop: c.plan_precio_cop,
      fechaCobro: c.proximo_cobro_cliente,
      datosCobro: datosCobroByTrainerId.get(c.trainer_id) ?? null,
    });

    const whenTxt = threshold === 0 ? "hoy" : `en ${threshold} días`;

    await supabase.from("trainer_activity").insert({
      trainer_id: c.trainer_id,
      type: "cobro_cliente_proximo",
      title: threshold === 0 ? `Cobro de ${c.full_name} vence hoy` : `Cobro de ${c.full_name} próximo a vencer (${whenTxt})`,
      description: "Toca para abrir WhatsApp con el recordatorio ya armado.",
      link: whatsappLink,
      dedupe_key: dedupeKey,
    });
  }
}
