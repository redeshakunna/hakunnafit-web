import { redirect } from "next/navigation";
import { getCurrentTrainer } from "@/lib/trainer-auth";
import { getOwnClients, getOwnNextEvaluationByClient } from "@/lib/trainer-clients-actions";
import { getOwnClientIdsWithRoutine } from "@/lib/trainer-routines-actions";
import { hasFeature, minPlanForFeature } from "@/lib/admin-helpers";
import { planLabel } from "@/lib/catalog";
import { TrainerShell } from "@/components/trainer/trainer-shell";
import { TrainerClientsManager } from "@/components/trainer/trainer-clients-manager";

export default async function TrainerClientesPage() {
  const trainer = await getCurrentTrainer();
  if (!trainer) redirect("/panel/login");

  const unlocked = hasFeature(trainer.plan, "Clientes");
  const [clients, nextEvalByClient, clientIdsWithRoutine] = unlocked
    ? await Promise.all([getOwnClients(), getOwnNextEvaluationByClient(), getOwnClientIdsWithRoutine()])
    : [[], {}, []];

  return (
    <TrainerShell active="clientes" trainer={trainer}>
      {unlocked ? (
        <TrainerClientsManager
          trainer={trainer}
          initialClients={clients}
          nextEvalByClient={nextEvalByClient}
          clientIdsWithRoutine={clientIdsWithRoutine}
        />
      ) : (
        <div className="mx-auto max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
          <p className="text-sm font-semibold text-white">Clientes no está incluido en tu plan</p>
          <p className="mt-2 text-xs text-white/50">
            Disponible desde plan {planLabel(minPlanForFeature("Clientes"))}.
          </p>
        </div>
      )}
    </TrainerShell>
  );
}
