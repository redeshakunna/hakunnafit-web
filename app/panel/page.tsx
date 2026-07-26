import { redirect } from "next/navigation";
import { getCurrentTrainer } from "@/lib/trainer-auth";
import { TrainerShell } from "@/components/trainer/trainer-shell";
import { TrainerDashboardHome } from "@/components/trainer/trainer-dashboard-home";

export default async function TrainerPanelHomePage() {
  const trainer = await getCurrentTrainer();
  if (!trainer) redirect("/panel/login");

  return (
    <TrainerShell active="resumen" trainer={trainer}>
      <TrainerDashboardHome trainer={trainer} />
    </TrainerShell>
  );
}
