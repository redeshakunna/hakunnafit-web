import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { listTrainers } from "@/lib/admin-actions";
import { AdminShell } from "@/components/admin/admin-shell";
import { LandingsView } from "@/components/admin/landings-view";

export default async function LandingsPage() {
  const authed = await isAdminAuthenticated();
  if (!authed) redirect("/panel-hakunna/login");

  const trainers = await listTrainers();

  return (
    <AdminShell active="landings">
      <LandingsView initialTrainers={trainers} />
    </AdminShell>
  );
}
