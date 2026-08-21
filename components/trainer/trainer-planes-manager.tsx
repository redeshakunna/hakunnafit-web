"use client";

// Mi Sitio Web → Planes / Paquetes. Vivía antes en Mi Negocio (Operación),
// pero eso mezclaba "estado de mi cuenta" con "contenido de mi landing" —
// estos planes con precio real son justamente lo que se muestra en la
// sección "Planes" de la página pública (ver starter-templates), además de
// seguir alimentando el selector de plan que ve el cliente final en el
// formulario público de /registro y en el modal "Nuevo cliente". Por eso,
// a diferencia de "servicios" (que sí pasa por el ciclo de
// borrador/publicar de Mi Sitio Web), esto se sigue guardando al instante:
// es el mismo dato operativo de siempre, solo que editado desde el lugar
// correcto. Un plan sin precio se trata como "Personalizado" (a cotizar
// directo).

import { useState } from "react";
import { Plus, Trash2, Check, Loader2, ClipboardList } from "lucide-react";
import type { PlanOfrecido } from "@/lib/admin-actions";
import { updateOwnPlanesOfrecidos } from "@/lib/trainer-actions";
import { formatCop } from "@/lib/currency";

const EMPTY_PLAN: PlanOfrecido = { nombre: "", incluye: "", precioCop: null };

export function TrainerPlanesManager({
  initialPlanes,
  onChange,
}: {
  initialPlanes: PlanOfrecido[];
  onChange?: (planes: PlanOfrecido[]) => void;
}) {
  const [planes, setPlanes] = useState<PlanOfrecido[]>(initialPlanes.length ? initialPlanes : [{ ...EMPTY_PLAN }]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updatePlan(index: number, patch: Partial<PlanOfrecido>) {
    setSaved(false);
    setPlanes((prev) => {
      const next = prev.map((p, i) => (i === index ? { ...p, ...patch } : p));
      onChange?.(next);
      return next;
    });
  }

  function addPlan() {
    setSaved(false);
    setPlanes((prev) => {
      const next = [...prev, { ...EMPTY_PLAN }];
      onChange?.(next);
      return next;
    });
  }

  function removePlan(index: number) {
    setSaved(false);
    setPlanes((prev) => {
      const next = prev.filter((_, i) => i !== index);
      onChange?.(next);
      return next;
    });
  }

  async function handleSave() {
    setError(null);
    const clean = planes.filter((p) => p.nombre.trim());
    setSaving(true);
    const res = await updateOwnPlanesOfrecidos(clean);
    setSaving(false);
    if (!res.ok) {
      setError(res.error ?? "No se pudieron guardar los planes.");
      return;
    }
    setPlanes(clean.length ? clean : [{ ...EMPTY_PLAN }]);
    onChange?.(clean);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="mt-8">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex items-center gap-2 text-white/50">
          <ClipboardList size={16} />
          <p className="text-xs font-semibold uppercase tracking-wide">Planes / Paquetes</p>
        </div>
        <p className="mt-1 text-xs text-white/40">
          Los planes que le vendes a tus clientes — nombre, qué incluye y precio. Déjalo sin precio para que quede
          como &quot;Personalizado&quot;. Se muestran como tarjetas de precio en tu landing (sección &quot;Planes&quot;,
          activable arriba) y tus clientes también eligen entre estos al registrarse.
        </p>

        <div className="mt-4 space-y-3">
          {planes.map((p, i) => (
            <div key={i} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1.2fr_1fr_auto]">
                <input
                  value={p.nombre}
                  onChange={(e) => updatePlan(i, { nombre: e.target.value })}
                  placeholder="Nombre del plan (ej. Plan Fuerza)"
                  className="h-10 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-sm text-white outline-none focus:border-hf-blue"
                />
                <input
                  type="number"
                  min={0}
                  step="1000"
                  value={p.precioCop ?? ""}
                  onChange={(e) =>
                    updatePlan(i, { precioCop: e.target.value === "" ? null : Number(e.target.value) })
                  }
                  placeholder="Precio COP (vacío = personalizado)"
                  className="h-10 rounded-lg border border-white/10 bg-white/[0.03] px-3 text-sm text-white outline-none focus:border-hf-blue"
                />
                <button
                  onClick={() => removePlan(i)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/10 text-white/40 hover:border-red-500/40 hover:text-red-400 sm:w-10"
                  title="Quitar plan"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <textarea
                value={p.incluye}
                onChange={(e) => updatePlan(i, { incluye: e.target.value })}
                rows={2}
                placeholder="¿Qué incluye? Ej. 3 rutinas/semana, seguimiento semanal, plan nutricional..."
                className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white outline-none focus:border-hf-blue"
              />
              <p className="mt-1.5 text-[11px] text-white/30">
                {p.precioCop != null ? formatCop(p.precioCop) : "Personalizado (a cotizar)"}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <button
            onClick={addPlan}
            className="flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/5"
          >
            <Plus size={13} /> Agregar plan
          </button>

          <div className="flex items-center gap-3">
            {error && <p className="text-xs text-red-400">{error}</p>}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-full bg-hf-blue px-4 py-2 text-xs font-bold text-black disabled:opacity-60"
            >
              {saving ? (
                <Loader2 size={13} className="animate-spin" />
              ) : saved ? (
                <Check size={13} />
              ) : null}
              {saving ? "Guardando..." : saved ? "Guardado" : "Guardar planes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
