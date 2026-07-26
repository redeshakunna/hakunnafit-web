import { redirect } from "next/navigation";
import { getCurrentTrainer } from "@/lib/trainer-auth";
import { canEditLanding } from "@/lib/admin-helpers";
import { TrainerShell } from "@/components/trainer/trainer-shell";
import { TrainerColorsForm } from "@/components/trainer/trainer-colors-form";
import { TrainerEditorSplit } from "@/components/trainer/trainer-editor-split";
import { LandingLocked } from "@/components/trainer/landing-locked";

export default async function TrainerColoresPage() {
  const trainer = await getCurrentTrainer();
  if (!trainer) redirect("/panel/login");

  return (
    <TrainerShell active="colores" trainer={trainer}>
      {canEditLanding(trainer) ? (
        <TrainerEditorSplit trainer={trainer}>
          <TrainerColorsForm trainer={trainer} />
        </TrainerEditorSplit>
      ) : (
        <LandingLocked />
      )}
    </TrainerShell>
  );
}
