import { redirect } from "next/navigation";
import { getCurrentTrainer } from "@/lib/trainer-auth";
import { getOwnClients } from "@/lib/trainer-clients-actions";
import { TrainerShell } from "@/components/trainer/trainer-shell";
import { TrainerRoutinesManager } from "@/components/trainer/trainer-routines-manager";

export default async function TrainerEntrenamientosPage() {
  const trainer = await getCurrentTrainer();
  if (!trainer) redirect("/panel/login");

  const clients = await getOwnClients();

  return (
    <TrainerShell active="entrenamientos" trainer={trainer}>
      <TrainerRoutinesManager trainer={trainer} clients={clients} />
    </TrainerShell>
  );
}
