import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { AdminShell } from "@/components/admin/admin-shell";
import { Sparkles } from "lucide-react";

export default async function ProximamentePage() {
  const authed = await isAdminAuthenticated();
  if (!authed) redirect("/panel-hakunna/login");

  return (
    <AdminShell active="proximamente">
      <div className="flex h-full min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-white/5 text-hf-fuchsia">
          <Sparkles size={24} />
        </div>
        <h1 className="mt-5 text-lg font-bold text-white">Próximamente</h1>
        <p className="mt-2 max-w-sm text-sm text-white/50">
          Esta sección está planeada para la siguiente fase de la plataforma, cuando esté lista la
          migración al dashboard multi-entrenador.
        </p>
      </div>
    </AdminShell>
  );
}
