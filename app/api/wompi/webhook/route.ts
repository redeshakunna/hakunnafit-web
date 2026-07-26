import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { verifyWompiEventSignature } from "@/lib/wompi";
import { createNotification } from "@/lib/notifications";

// Wompi envía aquí un POST cada vez que una transacción cambia de estado.
// Configura esta URL en el dashboard de Wompi: Configuración > Eventos ->
// https://<tu-dominio>/api/wompi/webhook
export async function POST(req: NextRequest) {
  let event: any;
  try {
    event = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  if (!event?.signature || !event?.data?.transaction) {
    return NextResponse.json({ error: "Evento con formato inesperado" }, { status: 400 });
  }

  try {
    const isValid = verifyWompiEventSignature({
      signature: event.signature,
      timestamp: event.timestamp,
      data: event.data,
    });
    if (!isValid) {
      return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
    }
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }

  const transaction = event.data.transaction as {
    id: string;
    reference: string;
    status: "APPROVED" | "DECLINED" | "VOIDED" | "ERROR" | "PENDING";
  };

  // Las solicitudes del flujo de adquisición (el entrenador pagándole a
  // Hakunna Fit su plan) usan referencias con el prefijo "hf-lead-" — ver
  // generatePaymentLink en lib/admin-actions.ts. Cualquier otra referencia
  // sigue siendo un pedido de la tienda de suplementos, como antes. Se usa
  // el cliente de servicio porque hakunnafit_leads solo tiene política de
  // RLS para INSERT público, no para UPDATE.
  if (transaction.reference.startsWith("hf-lead-")) {
    const pagoStatusMap: Record<string, string> = {
      APPROVED: "pagado",
      DECLINED: "rechazado",
      VOIDED: "rechazado",
      ERROR: "rechazado",
      PENDING: "en_proceso",
    };

    const admin = getSupabaseAdmin();
    const { data: updated, error: leadUpdateError } = await admin
      .from("hakunnafit_leads")
      .update({
        pago_estado: pagoStatusMap[transaction.status] ?? "pendiente",
        pago_wompi_transaction_id: transaction.id,
      })
      .eq("pago_referencia", transaction.reference)
      .select("id, nombre")
      .maybeSingle();

    if (leadUpdateError) {
      return NextResponse.json({ error: "No se pudo actualizar la solicitud" }, { status: 500 });
    }

    if (updated && transaction.status === "APPROVED") {
      await createNotification({
        type: "estado_cambio",
        title: `Pago confirmado: ${updated.nombre}`,
        message: `${updated.nombre} ya pagó su plan. Ya puedes aprobar su solicitud desde Solicitudes.`,
        link: "/panel-hakunna/solicitudes",
        leadId: updated.id,
      });
    }

    return NextResponse.json({ received: true });
  }

  // Cobro recurrente de un entrenador ya activo (recordatorios de 5/3/0 días
  // — ver syncUpcomingChargeNotifications en lib/notifications.ts). Es un
  // pago único por Wompi, no una suscripción con cobro automático: si queda
  // aprobado, solo avisamos a Nando para que actualice manualmente
  // proximo_cobro — se mantiene la decisión de dejar la renovación manual.
  if (transaction.reference.startsWith("hf-trainer-")) {
    if (transaction.status === "APPROVED") {
      const match = transaction.reference.match(/^hf-trainer-([0-9a-f-]{36})-/i);
      const trainerId = match?.[1] ?? null;

      if (trainerId) {
        const admin = getSupabaseAdmin();
        const { data: trainer } = await admin
          .from("trainers")
          .select("business_name")
          .eq("id", trainerId)
          .maybeSingle();

        await createNotification({
          type: "estado_cambio",
          title: `Pago de cobro recibido: ${trainer?.business_name ?? "Entrenador"}`,
          message: `${
            trainer?.business_name ?? "Un entrenador"
          } pagó su cobro por Wompi. Actualiza manualmente su próximo cobro desde Entrenadores.`,
          link: "/panel-hakunna/entrenadores",
          trainerId,
        });
      }
    }

    return NextResponse.json({ received: true });
  }

  const statusMap: Record<string, string> = {
    APPROVED: "aprobado",
    DECLINED: "declinado",
    VOIDED: "declinado",
    ERROR: "declinado",
    PENDING: "pendiente",
  };

  const supabase = getSupabase();
  const { error } = await supabase
    .from("orders")
    .update({
      status: (statusMap[transaction.status] ?? "pendiente") as any,
      wompi_transaction_id: transaction.id,
    })
    .eq("wompi_reference", transaction.reference);

  if (error) {
    return NextResponse.json({ error: "No se pudo actualizar el pedido" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
