import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { listLeads } from "@/lib/admin-actions";
import { getPlanPrices } from "@/lib/plan-settings-actions";
import { AdminShell } from "@/components/admin/admin-shell";
import { SolicitudesView } from "@/components/admin/solicitudes-view";

export default async function SolicitudesPage() {
  const authed = await isAdminAuthenticated();
  if (!authed) redirect("/panel/login");

  const [leads, planPrices] = await Promise.all([listLeads(), getPlanPrices()]);

  return (
    <AdminShell active="solicitudes" badges={{ solicitudes: leads.filter((l) => l.estado === "solicitud_recibida").length || undefined }}>
      <SolicitudesView initialLeads={leads} planPrices={planPrices} />
    </AdminShell>
  );
}
