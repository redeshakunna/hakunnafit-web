import { redirect } from "next/navigation";
import { getCurrentTrainer } from "@/lib/trainer-auth";
import { canEditLanding } from "@/lib/admin-helpers";
import { TrainerShell } from "@/components/trainer/trainer-shell";
import { TrainerPhotosForm } from "@/components/trainer/trainer-photos-form";
import { TrainerEditorSplit } from "@/components/trainer/trainer-editor-split";
import { LandingLocked } from "@/components/trainer/landing-locked";

export default async function TrainerFotosPage() {
  const trainer = await getCurrentTrainer();
  if (!trainer) redirect("/panel/login");

  return (
    <TrainerShell active="fotos" trainer={trainer}>
      {canEditLanding(trainer) ? (
        <TrainerEditorSplit trainer={trainer}>
          <TrainerPhotosForm trainer={trainer} />
        </TrainerEditorSplit>
      ) : (
        <LandingLocked />
      )}
    </TrainerShell>
  );
}
