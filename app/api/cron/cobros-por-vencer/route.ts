import { NextRequest, NextResponse } from "next/server";
import { syncUpcomingChargeNotifications } from "@/lib/notifications";
import { syncClientPaymentReminders } from "@/lib/client-billing-actions";

// Vercel Cron llama aquí todos los días (ver vercel.json) para revisar
// entrenadores con próximo cobro cercano y generar notificación (in-app +
// correo si RESEND_API_KEY está configurada). Protegido con CRON_SECRET:
// Vercel Cron manda automáticamente el header
// "Authorization: Bearer <CRON_SECRET>" cuando esa env var existe.
//
// También dispara los recordatorios de cobro del cliente final al
// entrenador (syncClientPaymentReminders) — mismo cron, no uno nuevo, para
// no chocar con el límite de cron jobs de los planes gratis/hobby de
// Vercel. Un fallo de una de las dos no debe tumbar la otra.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
  }

  const results = await Promise.allSettled([syncUpcomingChargeNotifications(), syncClientPaymentReminders()]);
  const errors = results.filter((r): r is PromiseRejectedResult => r.status === "rejected").map((r) => (r.reason as Error).message);

  if (errors.length > 0) {
    return NextResponse.json({ ok: false, error: errors.join(" | ") }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
