import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getPlanPrices } from "@/lib/plan-settings-actions";
import { AdminShell } from "@/components/admin/admin-shell";
import { ConfiguracionView } from "@/components/admin/configuracion-view";

export default async function ConfiguracionPage() {
  const authed = await isAdminAuthenticated();
  if (!authed) redirect("/panel-hakunna/login");

  const prices = await getPlanPrices();

  return (
    <AdminShell active="configuracion">
      <ConfiguracionView initialPrices={prices} />
    </AdminShell>
  );
}
