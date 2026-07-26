import { redirect } from "next/navigation";
import { Utensils } from "lucide-react";
import { getCurrentTrainer } from "@/lib/trainer-auth";
import { TrainerShell } from "@/components/trainer/trainer-shell";
import { TrainerComingSoon } from "@/components/trainer/trainer-coming-soon";

export default async function TrainerNutricionPage() {
  const trainer = await getCurrentTrainer();
  if (!trainer) redirect("/panel/login");

  return (
    <TrainerShell active="nutricion" trainer={trainer}>
      <TrainerComingSoon
        trainer={trainer}
        feature="Nutrición"
        icon={Utensils}
        title="Nutrición"
        description="Planes de alimentación, macros, calorías, recetas y sustituciones, con exportación a PDF para tus clientes."
      />
    </TrainerShell>
  );
}
