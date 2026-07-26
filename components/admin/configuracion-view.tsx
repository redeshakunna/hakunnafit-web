"use client";

import { useState, useTransition } from "react";
import { Check, Save } from "lucide-react";
import { updatePlanPrices, type PlanPrices } from "@/lib/plan-settings-actions";
import { PLANS, type PlanKey } from "@/lib/catalog";

const CYCLES: { key: keyof PlanPrices[PlanKey]; label: string; hint: string }[] = [
  { key: "monthlyCop", label: "Mensual", hint: "" },
  { key: "semesterCop", label: "6 meses", hint: "Ahorra 10%" },
  { key: "annualCop", label: "Anual", hint: "Ahorra 15% + 1 mes gratis" },
];

function formatCop(n: number): string {
  return new Intl.NumberFormat("es-CO").format(n);
}

export function ConfiguracionView({ initialPrices }: { initialPrices: PlanPrices }) {
  const [prices, setPrices] = useState(initialPrices);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function setValue(plan: PlanKey, cycle: keyof PlanPrices[PlanKey], value: string) {
    const n = Number(value.replace(/[^\d]/g, "")) || 0;
    setPrices((p) => ({ ...p, [plan]: { ...p[plan], [cycle]: n } }));
    setSaved(false);
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await updatePlanPrices(prices);
      if (!result.ok) {
        setError(result.error ?? "No se pudo guardar.");
        return;
      }
      setSaved(true);
    });
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-white">Configuración</h1>
      <p className="mt-1 text-sm text-white/50">
        Precios de cada plan por ciclo — se usan en la landing y para generar los links de pago en Solicitudes.
      </p>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {PLANS.map((p) => (
          <div key={p.key} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <p className="font-[family-name:var(--font-hf-heading)] text-sm font-bold uppercase tracking-wide text-white">
              {p.label}
            </p>
            <div className="mt-4 space-y-3">
              {CYCLES.map((c) => (
                <label key={c.key} className="block">
                  <span className="mb-1 flex items-baseline justify-between text-[11px] text-white/50">
                    <span>{c.label}</span>
                    {c.hint && <span className="text-emerald-400">{c.hint}</span>}
                  </span>
                  <div className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3">
                    <span className="text-xs text-white/40">$</span>
                    <input
                      value={formatCop(prices[p.key as PlanKey][c.key])}
                      onChange={(e) => setValue(p.key as PlanKey, c.key, e.target.value)}
                      inputMode="numeric"
                      className="h-9 w-full bg-transparent text-sm text-white focus:outline-none"
                    />
                    <span className="text-xs text-white/40">COP</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          disabled={isPending}
          onClick={handleSave}
          className="flex items-center gap-1.5 rounded-full px-6 py-2.5 text-xs font-semibold text-white disabled:opacity-60"
          style={{ background: "linear-gradient(90deg,#00C8FF,#6D2EFF,#FF2DB8)" }}
        >
          <Save size={13} />
          {isPending ? "Guardando..." : "Guardar cambios"}
        </button>
        {saved && !isPending && (
          <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
            <Check size={13} /> Guardado
          </span>
        )}
      </div>
    </div>
  );
}
