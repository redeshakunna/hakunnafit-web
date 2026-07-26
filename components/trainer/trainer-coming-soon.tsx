import { Lock, Sparkles } from "lucide-react";
import type { TrainerRow } from "@/lib/admin-actions";
import { hasFeature, minPlanForFeature } from "@/lib/admin-helpers";
import { planLabel, type FeatureKey } from "@/lib/catalog";

/**
 * Estado vacío premium para los módulos que todavía no tienen funcionalidad
 * real detrás (Entrenamientos, Nutrición, Agenda, HakAI, Vista del Cliente).
 * A propósito NO se construyó ninguna pantalla con datos falsos para estos
 * módulos — mostrar rutinas o citas inventadas sería peor que no mostrar
 * nada. En vez de eso: si el plan del entrenador ya incluye la función, se
 * muestra "Muy pronto"; si no la incluye, se muestra el plan mínimo que la
 * desbloquea (mismo catálogo PLAN_FEATURES que usa el resto del panel).
 */
export function TrainerComingSoon({
  trainer,
  feature,
  icon: Icon,
  title,
  description,
}: {
  trainer: TrainerRow;
  feature: FeatureKey | null;
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  const included = !feature || hasFeature(trainer.plan, feature);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center rounded-2xl border border-white/10 bg-white/[0.03] p-10 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5">
        <Icon size={26} className="text-white/60" />
      </div>
      <h1 className="mt-5 text-lg font-bold text-white">{title}</h1>
      <p className="mt-2 text-sm text-white/50">{description}</p>

      {included ? (
        <span className="mt-5 flex items-center gap-1.5 rounded-full bg-hf-blue/10 px-3 py-1.5 text-xs font-semibold text-hf-blue">
          <Sparkles size={13} /> Muy pronto
        </span>
      ) : (
        <span className="mt-5 flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-white/40">
          <Lock size={13} /> Disponible desde plan {planLabel(minPlanForFeature(feature!))}
        </span>
      )}
    </div>
  );
}
