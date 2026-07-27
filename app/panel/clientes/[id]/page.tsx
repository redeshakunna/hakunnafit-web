import { redirect, notFound } from "next/navigation";
import { getCurrentTrainer } from "@/lib/trainer-auth";
import {
  getOwnClient,
  getOwnClientMeasurements,
  getOwnClientEvaluations,
} from "@/lib/trainer-clients-actions";
import { getOwnClientRoutines } from "@/lib/trainer-routines-actions";
import { hasFeature } from "@/lib/admin-helpers";
import { TrainerShell } from "@/components/trainer/trainer-shell";
import { TrainerClientDetail } from "@/components/trainer/trainer-client-detail";

export default async function ClienteDetailPage({ params }: { params: { id: string } }) {
  const trainer = await getCurrentTrainer();
  if (!trainer) redirect("/panel/login");
  if (!hasFeature(trainer.plan, "Clientes")) redirect("/panel/clientes");

  const client = await getOwnClient(params.id);
  if (!client) notFound();

  const [measurements, evaluations, routines] = await Promise.all([
    getOwnClientMeasurements(client.id),
    getOwnClientEvaluations(client.id),
    getOwnClientRoutines(client.id),
  ]);

  return (
    <TrainerShell active="clientes" trainer={trainer}>
      <TrainerClientDetail
        trainer={trainer}
        client={client}
        initialMeasurements={measurements}
        initialEvaluations={evaluations}
        routines={routines}
      />
    </TrainerShell>
  );
}
