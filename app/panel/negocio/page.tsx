import { redirect } from "next/navigation";
import { getCurrentTrainer } from "@/lib/trainer-auth";
import { getOwnClientStats } from "@/lib/trainer-actions";
import { getPlanPrices } from "@/lib/plan-settings-actions";
import { TrainerShell } from "@/components/trainer/trainer-shell";
import { TrainerBusinessOverview } from "@/components/trainer/trainer-business-overview";

export default async function TrainerNegocioPage() {
  const trainer = await getCurrentTrainer();
  if (!trainer) redirect("/panel/login");

  const [planPrices, clientStats] = await Promise.all([getPlanPrices(), getOwnClientStats()]);

  return (
    <TrainerShell active="negocio" trainer={trainer}>
      <TrainerBusinessOverview trainer={trainer} planPrices={planPrices} clientStats={clientStats} />
    </TrainerShell>
  );
}
