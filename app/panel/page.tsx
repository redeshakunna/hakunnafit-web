import { redirect } from "next/navigation";
import { getCurrentTrainer } from "@/lib/trainer-auth";
import { getOwnClientStats, getOwnRecentActivity } from "@/lib/trainer-actions";
import { getOwnRecentClients, getOwnUpcomingEvaluations } from "@/lib/trainer-clients-actions";
import { getOwnClientIdsWithRoutine } from "@/lib/trainer-routines-actions";
import { TrainerShell } from "@/components/trainer/trainer-shell";
import { TrainerDashboardHome } from "@/components/trainer/trainer-dashboard-home";

export default async function TrainerPanelHomePage() {
  const trainer = await getCurrentTrainer();
  if (!trainer) redirect("/panel/login");

  const [clientStats, recentClients, recentActivity, upcomingEvaluations, clientIdsWithRoutine] = await Promise.all([
    getOwnClientStats(),
    getOwnRecentClients(5),
    getOwnRecentActivity(6),
    getOwnUpcomingEvaluations(5),
    getOwnClientIdsWithRoutine(),
  ]);

  return (
    <TrainerShell active="resumen" trainer={trainer}>
      <TrainerDashboardHome
        trainer={trainer}
        clientStats={clientStats}
        recentClients={recentClients}
        recentActivity={recentActivity}
        upcomingEvaluations={upcomingEvaluations}
        routinesAssignedCount={clientIdsWithRoutine.length}
      />
    </TrainerShell>
  );
}
