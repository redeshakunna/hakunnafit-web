import { redirect } from "next/navigation";
import { getCurrentTrainer } from "@/lib/trainer-auth";
import { canEditLanding } from "@/lib/admin-helpers";
import { TrainerShell } from "@/components/trainer/trainer-shell";
import { TrainerBrandForm } from "@/components/trainer/trainer-brand-form";
import { TrainerEditorSplit } from "@/components/trainer/trainer-editor-split";
import { LandingLocked } from "@/components/trainer/landing-locked";

export default async function TrainerMarcaPage() {
  const trainer = await getCurrentTrainer();
  if (!trainer) redirect("/panel/login");

  return (
    <TrainerShell active="marca" trainer={trainer}>
      {canEditLanding(trainer) ? (
        <TrainerEditorSplit trainer={trainer}>
          <TrainerBrandForm trainer={trainer} />
        </TrainerEditorSplit>
      ) : (
        <LandingLocked />
      )}
    </TrainerShell>
  );
}
