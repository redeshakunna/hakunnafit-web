import { notFound, redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getLeadForRevision } from "@/lib/admin-actions";
import { AdminShell } from "@/components/admin/admin-shell";
import { RevisionEntrenadorView } from "@/components/admin/revision-entrenador-view";

export default async function RevisionEntrenadorPage({ params }: { params: { leadId: string } }) {
  const authed = await isAdminAuthenticated();
  if (!authed) redirect("/panel-hakunna/login");

  const data = await getLeadForRevision(params.leadId);
  if (!data) notFound();

  return (
    <AdminShell active="solicitudes">
      <RevisionEntrenadorView lead={data.lead} trainer={data.trainer} />
    </AdminShell>
  );
}
