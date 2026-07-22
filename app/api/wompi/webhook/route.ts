import { NextRequest, NextResponse } from "next/server";
import { getSupabase } from "@/lib/supabase";
import { verifyWompiEventSignature } from "@/lib/wompi";

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
