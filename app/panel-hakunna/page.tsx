import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getDashboardStats, listTrainers } from "@/lib/admin-actions";
import { AdminShell } from "@/components/admin/admin-shell";
import { DashboardHome } from "@/components/admin/dashboard-home";

export default async function PanelHakunnaPage() {
  const authed = await isAdminAuthenticated();
  if (!authed) {
    redirect("/panel-hakunna/login");
  }

  const [stats, trainers] = await Promise.all([getDashboardStats(), listTrainers()]);

  return (
    <AdminShell active="dashboard" badges={{ solicitudes: stats.newLeads || undefined }}>
      <DashboardHome stats={stats} trainers={trainers} />
    </AdminShell>
  );
}
