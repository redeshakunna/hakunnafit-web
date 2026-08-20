import { redirect } from "next/navigation";
import { Utensils } from "lucide-react";
import { getCurrentTrainer } from "@/lib/trainer-auth";
import { getOwnClients } from "@/lib/trainer-clients-actions";
import { hasFeature } from "@/lib/admin-helpers";
import { TrainerShell } from "@/components/trainer/trainer-shell";
import { TrainerComingSoon } from "@/components/trainer/trainer-coming-soon";
import { TrainerNutritionManager } from "@/components/trainer/trainer-nutrition-manager";

export default async function TrainerNutricionPage() {
  const trainer = await getCurrentTrainer();
  if (!trainer) redirect("/panel/login");

  // Nutrición es exclusivo de planes Pro/Elite (PLAN_FEATURES en catalog.ts) —
  // Starter ve el mismo bloqueo "Disponible desde plan Pro" que ya usan el
  // resto de módulos por plan, sin lógica nueva.
  if (!hasFeature(trainer.plan, "Nutrición")) {
    return (
      <TrainerShell active="nutricion" trainer={trainer}>
        <TrainerComingSoon
          trainer={trainer}
          feature="Nutrición"
          icon={Utensils}
          title="Nutrición"
          description="Planes de alimentación armados con productos reales de D1, Ara y Éxito: macros, calorías y costo semanal estimado para cada cliente."
        />
      </TrainerShell>
    );
  }

  const clients = await getOwnClients();

  return (
    <TrainerShell active="nutricion" trainer={trainer}>
      <TrainerNutritionManager trainer={trainer} clients={clients} />
    </TrainerShell>
  );
}
