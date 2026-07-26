import { redirect } from "next/navigation";
import { Dumbbell } from "lucide-react";
import { getCurrentTrainer } from "@/lib/trainer-auth";
import { TrainerShell } from "@/components/trainer/trainer-shell";
import { TrainerComingSoon } from "@/components/trainer/trainer-coming-soon";

export default async function TrainerEntrenamientosPage() {
  const trainer = await getCurrentTrainer();
  if (!trainer) redirect("/panel/login");

  return (
    <TrainerShell active="entrenamientos" trainer={trainer}>
      <TrainerComingSoon
        trainer={trainer}
        feature="Rutinas"
        icon={Dumbbell}
        title="Entrenamientos"
        description="Rutinas, ejercicios, series, superseries, circuitos y descansos, con tu propia biblioteca y plantillas."
      />
    </TrainerShell>
  );
}
