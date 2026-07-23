import { NextRequest, NextResponse } from "next/server";
import { syncUpcomingChargeNotifications } from "@/lib/notifications";

// Vercel Cron llama aquí todos los días (ver vercel.json) para revisar
// entrenadores con próximo cobro cercano y generar notificación (in-app +
// correo si RESEND_API_KEY está configurada). Protegido con CRON_SECRET:
// Vercel Cron manda automáticamente el header
// "Authorization: Bearer <CRON_SECRET>" cuando esa env var existe.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
  }

  try {
    await syncUpcomingChargeNotifications();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
