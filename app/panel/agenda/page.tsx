import { redirect } from "next/navigation";
import { getCurrentTrainer } from "@/lib/trainer-auth";
import { getOwnClients } from "@/lib/trainer-clients-actions";
import { getOwnGoogleConnection } from "@/lib/calendar-connections-actions";
import { isGoogleCalendarConfigured } from "@/lib/google-calendar";
import { TrainerShell } from "@/components/trainer/trainer-shell";
import { TrainerAgendaManager } from "@/components/trainer/trainer-agenda-manager";

export default async function TrainerAgendaPage() {
  const trainer = await getCurrentTrainer();
  if (!trainer) redirect("/panel/login");

  const [clients, googleConnection] = await Promise.all([getOwnClients(), getOwnGoogleConnection()]);

  return (
    <TrainerShell active="agenda" trainer={trainer}>
      <TrainerAgendaManager
        trainer={trainer}
        clients={clients}
        googleConfigured={isGoogleCalendarConfigured()}
        googleConnected={googleConnection.connected}
        googleEmail={googleConnection.googleEmail}
      />
    </TrainerShell>
  );
}
