import { Clock } from "lucide-react";

export function LandingLocked() {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-amber-500/30 bg-amber-500/10 p-6 text-center">
      <Clock size={22} className="mx-auto text-amber-400" />
      <p className="mt-3 text-sm font-semibold text-amber-400">Tu landing está en diseño</p>
      <p className="mt-1 text-xs text-white/60">
        Nuestro equipo está diseñando tu landing a la medida. Vas a poder editar esta sección en cuanto quede
        publicada.
      </p>
    </div>
  );
}
