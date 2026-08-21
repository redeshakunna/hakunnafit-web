import { getMealPlanByShareToken } from "@/lib/public-nutrition-actions";
import { PublicMealPlanView } from "@/components/hakunnafit/public-meal-plan-view";

export const revalidate = 0;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://hakunnafit.com";

// Destino del link que el entrenador comparte por WhatsApp (o abre él mismo
// para imprimir) desde el módulo Nutrición y desde la ficha del cliente. Sin
// sesión: el token identifica el plan, mismo patrón que
// /agenda/aprobar/[token].
export default async function PublicMealPlanPage({ params }: { params: { token: string } }) {
  const plan = await getMealPlanByShareToken(params.token);

  if (!plan) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-hf-black px-4">
        <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
          <p className="text-lg font-bold text-white">Este plan ya no está disponible</p>
          <p className="mt-2 text-sm text-white/50">
            Puede que el link sea incorrecto. Pídele a tu entrenador que te comparta uno nuevo.
          </p>
        </div>
      </div>
    );
  }

  return (
    <PublicMealPlanView
      clientFirstName={plan.clientFirstName}
      comidasPorDia={plan.comidasPorDia}
      objetivo={plan.objetivo}
      dias={plan.dias}
      trainer={plan.trainer}
      alimentos={plan.alimentos}
      shareUrl={`${SITE_URL}/plan/${params.token}`}
    />
  );
}
