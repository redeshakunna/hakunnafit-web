import { redirect } from "next/navigation";
import { getCurrentTrainer } from "@/lib/trainer-auth";
import { canEditLanding } from "@/lib/admin-helpers";
import { TrainerShell } from "@/components/trainer/trainer-shell";
import { TrainerContentForm } from "@/components/trainer/trainer-content-form";
import { LandingLocked } from "@/components/trainer/landing-locked";

export default async function TrainerContenidoPage() {
  const trainer = await getCurrentTrainer();
  if (!trainer) redirect("/panel/login");

  return (
    <TrainerShell active="contenido" trainer={trainer}>
      {canEditLanding(trainer) ? <TrainerContentForm trainer={trainer} /> : <LandingLocked />}
    </TrainerShell>
  );
}
