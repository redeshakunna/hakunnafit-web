import { redirect } from "next/navigation";
import { CalendarDays } from "lucide-react";
import { getCurrentTrainer } from "@/lib/trainer-auth";
import { TrainerShell } from "@/components/trainer/trainer-shell";
import { TrainerComingSoon } from "@/components/trainer/trainer-coming-soon";

export default async function TrainerAgendaPage() {
  const trainer = await getCurrentTrainer();
  if (!trainer) redirect("/panel/login");

  return (
    <TrainerShell active="agenda" trainer={trainer}>
      <TrainerComingSoon
        trainer={trainer}
        feature="Agenda"
        icon={CalendarDays}
        title="Agenda"
        description="Citas, valoraciones, recordatorios, horarios, clases y seguimientos, todo sincronizado con tus clientes."
      />
    </TrainerShell>
  );
}
