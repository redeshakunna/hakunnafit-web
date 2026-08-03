import { getClientPortalData } from "@/lib/client-portal-actions";
import { ClientPortalView } from "@/components/client-portal/client-portal-view";

export const revalidate = 0;

// Portal del cliente final — link permanente y sin login que el entrenador
// comparte desde la ficha del cliente (/panel/clientes/[id]). Mismo patrón de
// página pública validada por token que /agenda/aprobar/[token] y
// /agenda/conectar/[token], pero acá el token no expira: es "la cuenta" del
// cliente, no una acción puntual.
export default async function ClientPortalPage({ params }: { params: { token: string } }) {
  const data = await getClientPortalData(params.token);

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-hf-black px-4">
        <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
          <p className="text-lg font-bold text-white">Este enlace no es válido</p>
          <p className="mt-2 text-sm text-white/50">Pídele a tu entrenador que te comparta tu link de nuevo.</p>
        </div>
      </div>
    );
  }

  return <ClientPortalView token={params.token} initialData={data} />;
}
