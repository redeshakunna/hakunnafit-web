import { NextRequest, NextResponse } from "next/server";
import { syncPendingAppointmentRsvps } from "@/lib/trainer-agenda-actions";

// Vercel Cron llama aquí una vez al día (ver vercel.json) para revisar el
// RSVP de Google Calendar de todas las citas 'pendiente' de la plataforma y
// pasarlas a 'confirmada' si el cliente ya aceptó la invitación. El plan
// Hobby de Vercel no permite crons más frecuentes que 1 vez al día — el
// botón "Sincronizar" de la Agenda (resyncOwnAgendaToGoogle) cubre el caso
// de querer una confirmación al instante sin esperar a este cron. Protegido
// con CRON_SECRET igual que /api/cron/cobros-por-vencer.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
  }

  try {
    const result = await syncPendingAppointmentRsvps();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    return NextResponse.json({ ok: false, error: (err as Error).message }, { status: 500 });
  }
}
