import { redirect } from "next/navigation";
import { ClientAccountDashboard } from "@/components/client-account/client-account-dashboard";
import { getOwnClientDashboardData } from "@/lib/client-account-actions";

export const revalidate = 0;

// Cuenta del cliente final con sesión real — reemplaza /mi-progreso/[token].
// middleware.ts ya exige sesión de Supabase para cualquier ruta bajo
// /mi-cuenta antes de que este componente se ejecute; el chequeo de acá es
// una segunda capa (por si acaso) y para resolver el caso raro de una
// sesión válida sin fila en "clients" (no debería pasar en la práctica).
export default async function MiCuentaPage() {
  const data = await getOwnClientDashboardData();
  if (!data) redirect("/");

  return <ClientAccountDashboard initialData={data} />;
}
