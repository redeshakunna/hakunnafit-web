import { getClientCalendarConnectSession } from "@/lib/calendar-connections-actions";
import { CalendarConnectScreen } from "@/components/hakunnafit/calendar-connect-screen";

export const revalidate = 0;

// Destino del link que el entrenador genera y envía por WhatsApp (ver
// generateClientCalendarConnectLink en lib/calendar-connections-actions.ts).
// Sin sesión: el token identifica al cliente, igual que onboarding_token
// identifica una solicitud en /onboarding/[token].
export default async function CalendarConnectPage({ params }: { params: { token: string } }) {
  const session = await getClientCalendarConnectSession(params.token);

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-hf-black px-4">
        <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
          <p className="text-lg font-bold text-white">Este enlace ya no es válido</p>
          <p className="mt-2 text-sm text-white/50">
            Puede haber vencido o ya fue usado. Pídele a tu entrenador que te comparta uno nuevo.
          </p>
        </div>
      </div>
    );
  }

  return <CalendarConnectScreen token={params.token} session={session} />;
}
