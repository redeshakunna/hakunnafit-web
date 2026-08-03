import { NextRequest, NextResponse } from "next/server";
import { checkAndLockOverdueTrainers } from "@/lib/subscription-lifecycle";

// Vercel Cron llama aquí una vez al día (ver vercel.json) para revisar todos
// los entrenadores con dashboard_access = "activo" cuyo proximo_cobro ya
// venció y bloquearles el panel automáticamente (dashboard_access =
// "bloqueado") — ver lib/subscription-lifecycle.ts para el detalle completo
// del ciclo de vida (trial de 15 días, bloqueo automático, reactivación por
// webhook de Wompi). Protegido con CRON_SECRET igual que los demás crons.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
  }

  try {
    const result = await checkAndLockOverdueTrainers();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
