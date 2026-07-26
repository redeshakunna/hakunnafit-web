import { redirect } from "next/navigation";
import { Bot } from "lucide-react";
import { getCurrentTrainer } from "@/lib/trainer-auth";
import { TrainerShell } from "@/components/trainer/trainer-shell";
import { TrainerComingSoon } from "@/components/trainer/trainer-coming-soon";

export default async function TrainerHakaiPage() {
  const trainer = await getCurrentTrainer();
  if (!trainer) redirect("/panel/login");

  return (
    <TrainerShell active="hakai" trainer={trainer}>
      <TrainerComingSoon
        trainer={trainer}
        feature="HakAI"
        icon={Bot}
        title="HakAI"
        description="Tu asistente de IA para generar rutinas, planes nutricionales, recomendaciones y resúmenes de tus clientes."
      />
    </TrainerShell>
  );
}
