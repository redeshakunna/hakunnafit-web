import { notFound, redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { listTrainers } from "@/lib/admin-actions";
import { AdminShell } from "@/components/admin/admin-shell";
import { LandingEditorView } from "@/components/admin/landing-editor-view";

export default async function LandingEditorPage({ params }: { params: { id: string } }) {
  const authed = await isAdminAuthenticated();
  if (!authed) redirect("/panel/login");

  const trainers = await listTrainers();
  const trainer = trainers.find((t) => t.id === params.id);
  if (!trainer) notFound();

  return (
    <AdminShell active="landings">
      <LandingEditorView initialTrainer={trainer} />
    </AdminShell>
  );
}
