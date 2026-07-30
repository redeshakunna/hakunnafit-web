import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { listTrainers } from "@/lib/admin-actions";
import { AdminShell } from "@/components/admin/admin-shell";
import { EntrenadoresView } from "@/components/admin/entrenadores-view";

export default async function EntrenadoresPage() {
  const authed = await isAdminAuthenticated();
  if (!authed) redirect("/panel/login");

  const trainers = await listTrainers();

  return (
    <AdminShell active="entrenadores">
      <EntrenadoresView initialTrainers={trainers} />
    </AdminShell>
  );
}
