import { getProposalByToken } from "@/lib/public-session-proposal-actions";
import { SessionApprovalScreen } from "@/components/hakunnafit/session-approval-screen";

export const revalidate = 0;

// Destino del link que el correo "propuesta-sesiones-creada" le manda al
// cliente (ver proposeSessionPlan en lib/session-proposals-actions.ts). Sin
// sesión: el token identifica la propuesta, mismo patrón que
// /agenda/conectar/[token] identifica al cliente por token.
export default async function SessionApprovalPage({ params }: { params: { token: string } }) {
  const proposal = await getProposalByToken(params.token);

  if (!proposal) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-hf-black px-4">
        <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
          <p className="text-lg font-bold text-white">Este enlace ya no es válido</p>
          <p className="mt-2 text-sm text-white/50">
            Puede haber vencido o ya no existe. Pídele a tu entrenador que te comparta uno nuevo.
          </p>
        </div>
      </div>
    );
  }

  return <SessionApprovalScreen token={params.token} initialProposal={proposal} />;
}
