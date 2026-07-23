import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { listLeads } from "@/lib/admin-actions";
import { AdminShell } from "@/components/admin/admin-shell";
import { SolicitudesView } from "@/components/admin/solicitudes-view";

export default async function SolicitudesPage() {
  const authed = await isAdminAuthenticated();
  if (!authed) redirect("/panel-hakunna/login");

  const leads = await listLeads();

  return (
    <AdminShell active="solicitudes" badges={{ solicitudes: leads.filter((l) => l.estado === "nuevo").length || undefined }}>
      <SolicitudesView initialLeads={leads} />
    </AdminShell>
  );
}
