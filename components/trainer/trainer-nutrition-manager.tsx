"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  Plus,
  Trash2,
  X,
  Utensils,
  Library,
  ArrowLeft,
  ShoppingBasket,
  Sparkles,
  ListChecks,
  PenLine,
  Loader2,
  Printer,
  Share2,
} from "lucide-react";
import type { TrainerRow } from "@/lib/admin-actions";
import type { ClientRow } from "@/lib/trainer-clients-actions";
import {
  getOwnClientMealPlans,
  createOwnMealPlan,
  updateOwnMealPlan,
  deleteOwnMealPlan,
  searchAlimentos,
  getAlimentosByIds,
  generateOwnMealPlanTemplate,
  generateOwnMealPlanWithAI,
  type MealPlanRow,
  type AlimentoRow,
} from "@/lib/trainer-nutrition-actions";
import {
  emptyNutritionDay,
  emptyMeal,
  emptyMealItem,
  MEAL_SLOTS,
  CATEGORIA_LABELS,
  CATEGORIA_OPTIONS,
  TIENDA_LABELS,
  OBJETIVO_OPTIONS,
  planAverageDayTotals,
  dayTotals,
  estimateMacroTarget,
  type NutritionDias,
  type NutritionDay,
  type Meal,
  type MealItem,
  type MealSlot,
  type AlimentoLite,
} from "@/lib/nutrition-types";
import { BranchHero } from "@/components/trainer/branch-hero";
import { ClientPicker } from "@/components/trainer/client-picker";
import { branchTheme } from "@/lib/branch-theme";
import { branchLabel } from "@/lib/catalog";
import { ACTIVIDAD_LABELS } from "@/lib/client-ui";
import { formatCop } from "@/lib/currency";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://hakunnafit.com";

function mealPlanShareUrl(shareToken: string): string {
  return `${SITE_URL}/plan/${shareToken}`;
}

function toLite(a: AlimentoRow): AlimentoLite {
  return {
    id: a.id,
    nombre: a.nombre,
    categoria: a.categoria,
    tiendas: a.tiendas,
    unidadReferencia: a.unidad_referencia,
    calorias: a.calorias,
    proteinaG: a.proteina_g,
    carbohidratosG: a.carbohidratos_g,
    grasaG: a.grasa_g,
    precioCop: a.precio_cop,
  };
}

export function TrainerNutritionManager({ trainer, clients }: { trainer: TrainerRow; clients: ClientRow[] }) {
  const theme = branchTheme(trainer.especialidad);
  const [selectedClientId, setSelectedClientId] = useState<string>(clients[0]?.id ?? "");
  const [plans, setPlans] = useState<MealPlanRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<MealPlanRow | "new" | null>(null);
  const [isPending, startTransition] = useTransition();

  // Flujo de creación en 3 modos (pedido explícito de Nando): al crear un
  // plan nuevo, primero se elige cómo arrancarlo — manual (vacío, como
  // antes), plantilla (reglas simples, gratis/instantáneo) o HAKAI (IA
  // real, 7 días). El resultado de plantilla/HAKAI solo pre-llena el editor
  // — sigue siendo el entrenador quien revisa y guarda.
  const [newPlanMode, setNewPlanMode] = useState<"closed" | "select" | "template" | "ia">("closed");
  const [pendingInitialDias, setPendingInitialDias] = useState<NutritionDias | null>(null);
  const [pendingBadge, setPendingBadge] = useState<string | null>(null);

  const selectedClient = clients.find((c) => c.id === selectedClientId) ?? null;

  useEffect(() => {
    if (!selectedClientId) {
      setPlans([]);
      return;
    }
    setLoading(true);
    getOwnClientMealPlans(selectedClientId)
      .then(setPlans)
      .finally(() => setLoading(false));
  }, [selectedClientId]);

  async function refresh() {
    if (!selectedClientId) return;
    const rows = await getOwnClientMealPlans(selectedClientId);
    setPlans(rows);
  }

  function handleDelete(p: MealPlanRow) {
    if (!confirm("¿Eliminar este plan de alimentación?")) return;
    startTransition(async () => {
      await deleteOwnMealPlan(p.id);
      await refresh();
    });
  }

  if (clients.length === 0) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-white/40">
        Primero necesitas registrar al menos un cliente en el módulo Clientes para poder armarle un plan de alimentación.
      </div>
    );
  }

  // Mismo patrón de pantalla completa que Entrenamientos (RoutineEditorScreen).
  if (editing && selectedClientId) {
    return (
      <MealPlanEditorScreen
        clientId={selectedClientId}
        client={selectedClient}
        plan={editing === "new" ? null : editing}
        initialDias={editing === "new" ? pendingInitialDias ?? undefined : undefined}
        generatedBadge={editing === "new" ? pendingBadge : null}
        onClose={() => {
          setEditing(null);
          setPendingInitialDias(null);
          setPendingBadge(null);
        }}
        onSaved={async () => {
          setEditing(null);
          setPendingInitialDias(null);
          setPendingBadge(null);
          await refresh();
        }}
      />
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <BranchHero
        theme={theme}
        eyebrow={branchLabel(trainer.especialidad)}
        title="Nutrición"
        subtitle="Planes de alimentación con productos reales de D1, Ara y Éxito — macros y costo semanal aproximado."
      />

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <ClientPicker clients={clients} selectedClientId={selectedClientId} onSelect={setSelectedClientId} />

        <button
          onClick={() => setNewPlanMode("select")}
          className="flex items-center gap-1.5 rounded-full bg-hf-blue px-4 py-2 text-xs font-bold text-black"
        >
          <Plus size={14} /> Nuevo plan
        </button>
      </div>

      {newPlanMode === "select" && (
        <NewPlanModeModal
          onClose={() => setNewPlanMode("closed")}
          onManual={() => {
            setNewPlanMode("closed");
            setPendingInitialDias(null);
            setPendingBadge(null);
            setEditing("new");
          }}
          onTemplate={() => setNewPlanMode("template")}
          onIA={() => setNewPlanMode("ia")}
        />
      )}

      {newPlanMode === "template" && selectedClientId && (
        <TemplateWizardModal
          clientId={selectedClientId}
          onClose={() => setNewPlanMode("closed")}
          onGenerated={(dias) => {
            setPendingInitialDias(dias);
            setPendingBadge("Generado desde plantilla — revisa y ajusta antes de guardar.");
            setNewPlanMode("closed");
            setEditing("new");
          }}
        />
      )}

      {newPlanMode === "ia" && selectedClientId && (
        <IAWizardModal
          clientId={selectedClientId}
          client={selectedClient}
          onClose={() => setNewPlanMode("closed")}
          onGenerated={(dias) => {
            setPendingInitialDias(dias);
            setPendingBadge("Generado por HAKAI — revisa alimentos y cantidades antes de guardar.");
            setNewPlanMode("closed");
            setEditing("new");
          }}
        />
      )}

      <div className="mt-4 space-y-3">
        {loading && <p className="text-xs text-white/40">Cargando...</p>}
        {!loading && plans.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-white/40">
            {selectedClient?.full_name ?? "Este cliente"} todavía no tiene plan de alimentación. Crea el primero.
          </div>
        )}
        {plans.map((p) => (
          <div key={p.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-white">
                  {p.comidas_por_dia} comidas/día
                  {p.objetivo ? ` · ${OBJETIVO_OPTIONS.find((o) => o.value === p.objetivo)?.label ?? p.objetivo}` : ""}
                </p>
                <p className="mt-0.5 text-xs text-white/40">{p.dias.length} días definidos</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => setEditing(p)}
                className="rounded-full border border-white/15 px-3 py-1.5 text-[11px] font-semibold text-white/70 hover:border-white/30 hover:text-white"
              >
                Editar
              </button>
              <a
                href={mealPlanShareUrl(p.share_token)}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 rounded-full border border-white/15 px-3 py-1.5 text-[11px] font-semibold text-white/70 hover:border-white/30 hover:text-white"
              >
                <Printer size={11} /> Ver / Imprimir
              </a>
              <button
                onClick={() => {
                  const nombre = selectedClient?.full_name?.split(" ")[0] ?? "";
                  const mensaje = `Hola ${nombre}, este es tu plan de alimentación 🍽️\n${mealPlanShareUrl(p.share_token)}`;
                  window.open(`https://wa.me/?text=${encodeURIComponent(mensaje)}`, "_blank");
                }}
                className="flex items-center gap-1 rounded-full border border-emerald-500/20 px-3 py-1.5 text-[11px] font-semibold text-emerald-400/80 hover:border-emerald-500/40 hover:text-emerald-400"
              >
                <Share2 size={11} /> WhatsApp
              </button>
              <button
                onClick={() => handleDelete(p)}
                disabled={isPending}
                className="ml-auto flex items-center gap-1 rounded-full border border-red-500/20 px-3 py-1.5 text-[11px] font-semibold text-red-400/80 hover:border-red-500/40 hover:text-red-400"
              >
                <Trash2 size={11} /> Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MealPlanEditorScreen({
  clientId,
  client,
  plan,
  initialDias,
  generatedBadge,
  onClose,
  onSaved,
}: {
  clientId: string;
  client: ClientRow | null;
  plan: MealPlanRow | null;
  initialDias?: NutritionDias;
  generatedBadge?: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [objetivo, setObjetivo] = useState(plan?.objetivo ?? "mantenimiento");
  const [notaPerfil, setNotaPerfil] = useState(plan?.nota_perfil ?? "");
  const [dias, setDias] = useState<NutritionDias>(
    plan?.dias?.length ? plan.dias : initialDias?.length ? initialDias : [emptyNutritionDay(1), emptyNutritionDay(2)]
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Cache de alimentos referenciados en el plan (para mostrar nombre/macros
  // sin volver a pedirlos cada vez que se re-renderiza) — mismo patrón que
  // getExercisesByIds en Entrenamientos.
  const [alimentosById, setAlimentosById] = useState<Map<string, AlimentoLite>>(new Map());

  const referencedIds = useMemo(() => {
    const ids = new Set<string>();
    dias.forEach((d) => d.comidas.forEach((m) => m.items.forEach((i) => i.alimentoId && ids.add(i.alimentoId))));
    return Array.from(ids);
  }, [dias]);

  useEffect(() => {
    const missing = referencedIds.filter((id) => !alimentosById.has(id));
    if (missing.length === 0) return;
    getAlimentosByIds(missing).then((rows) => {
      setAlimentosById((prev) => {
        const next = new Map(prev);
        rows.forEach((r) => next.set(r.id, toLite(r)));
        return next;
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [referencedIds]);

  const comidasPorDia = Math.max(1, ...dias.map((d) => d.comidas.length), 0);
  const avgDay = planAverageDayTotals(dias, alimentosById);
  const target = estimateMacroTarget(client?.peso_actual, client?.actividad, objetivo);
  const weeklyCost = avgDay.costoCop * 7;
  const monthlyCost = avgDay.costoCop * 30;

  function addDay() {
    setDias([...dias, emptyNutritionDay(dias.length + 1)]);
  }

  function removeDay(index: number) {
    setDias(dias.filter((_, i) => i !== index));
  }

  function updateDay(index: number, patch: Partial<NutritionDay>) {
    setDias(dias.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = plan
        ? await updateOwnMealPlan(plan.id, { comidasPorDia, objetivo, notaPerfil, dias })
        : await createOwnMealPlan({ clientId, comidasPorDia, objetivo, notaPerfil, dias });
      if (!res.ok) return setError(res.error ?? "No se pudo guardar el plan de alimentación.");
      onSaved();
    });
  }

  return (
    <div className="mx-auto max-w-2xl">
      <button onClick={onClose} className="flex items-center gap-1.5 text-xs font-semibold text-white/50 hover:text-white">
        <ArrowLeft size={14} /> Volver a Nutrición
      </button>

      <h1 className="mt-4 text-xl font-bold text-white">
        {plan ? "Editar plan de alimentación" : "Nuevo plan de alimentación"} — {client?.full_name ?? ""}
      </h1>

      {generatedBadge && (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-hf-blue/30 bg-hf-blue/10 px-3.5 py-2.5">
          <Sparkles size={14} className="shrink-0 text-hf-blue" />
          <p className="text-xs text-white/80">{generatedBadge}</p>
        </div>
      )}

      {/* Resumen de macros: objetivo estimado (regla simple sobre peso/actividad,
          no IA) vs lo que realmente arma el entrenador día a día, más el costo
          semanal/mensual aproximado con precios reales de D1/Ara/Éxito. */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MacroCard label="Calorías/día" value={Math.round(avgDay.calorias)} target={target?.calorias} unit="kcal" />
        <MacroCard label="Proteína/día" value={Math.round(avgDay.proteinaG)} target={target?.proteinaG} unit="g" />
        <MacroCard label="Carbohidratos/día" value={Math.round(avgDay.carbohidratosG)} target={target?.carbohidratosG} unit="g" />
        <MacroCard label="Grasa/día" value={Math.round(avgDay.grasaG)} target={target?.grasaG} unit="g" />
      </div>
      {!client?.peso_actual && (
        <p className="mt-2 text-[11px] text-white/30">
          Registra el peso del cliente en su ficha para ver un objetivo de macros estimado (regla simple, no IA).
        </p>
      )}

      <div className="mt-3 flex items-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
        <ShoppingBasket size={16} className="shrink-0 text-emerald-400" />
        <p className="text-xs text-white/70">
          Costo aproximado con precios de D1/Ara/Éxito: <b className="text-emerald-400">{formatCop(weeklyCost)}</b>/semana ·{" "}
          {formatCop(monthlyCost)}/mes
        </p>
      </div>

      <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-white/50">Objetivo</span>
            <select value={objetivo} onChange={(e) => setObjetivo(e.target.value)} className="input">
              {OBJETIVO_OPTIONS.map((o) => (
                <option key={o.value} value={o.value} className="bg-[#0a0d16]">
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-white/50">Nota sobre el perfil (opcional)</span>
            <input value={notaPerfil ?? ""} onChange={(e) => setNotaPerfil(e.target.value)} className="input" />
          </label>
        </div>

        <div className="mt-5 space-y-3">
          {dias.map((day, dayIndex) => (
            <NutritionDayEditor
              key={dayIndex}
              day={day}
              alimentosById={alimentosById}
              onChange={(patch) => updateDay(dayIndex, patch)}
              onRemove={() => removeDay(dayIndex)}
              onAlimentoResolved={(a) =>
                setAlimentosById((prev) => {
                  const next = new Map(prev);
                  next.set(a.id, a);
                  return next;
                })
              }
            />
          ))}
          <button
            onClick={addDay}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/15 py-2 text-xs font-semibold text-white/50 hover:border-white/30 hover:text-white"
          >
            <Plus size={13} /> Agregar día
          </button>
        </div>

        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold text-white/70">
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={isPending}
            className="rounded-full bg-hf-blue px-4 py-2 text-xs font-bold text-black disabled:opacity-40"
          >
            {isPending ? "Guardando..." : "Guardar plan"}
          </button>
        </div>

        <style jsx global>{`
          .input {
            width: 100%;
            border-radius: 0.75rem;
            border: 1px solid rgba(255, 255, 255, 0.1);
            background: rgba(255, 255, 255, 0.03);
            padding: 0.5rem 0.75rem;
            font-size: 0.8rem;
            color: white;
            outline: none;
          }
          .input:focus {
            border-color: rgba(255, 255, 255, 0.3);
          }
        `}</style>
      </div>
    </div>
  );
}

function MacroCard({ label, value, target, unit }: { label: string; value: number; target?: number; unit: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-white/40">{label}</p>
      <p className="mt-1 text-base font-bold text-white">
        {value} <span className="text-xs font-normal text-white/40">{unit}</span>
      </p>
      {target !== undefined && <p className="mt-0.5 text-[10px] text-white/30">Objetivo estimado: {target}</p>}
    </div>
  );
}

function NutritionDayEditor({
  day,
  alimentosById,
  onChange,
  onRemove,
  onAlimentoResolved,
}: {
  day: NutritionDay;
  alimentosById: Map<string, AlimentoLite>;
  onChange: (patch: Partial<NutritionDay>) => void;
  onRemove: () => void;
  onAlimentoResolved: (a: AlimentoLite) => void;
}) {
  const totals = dayTotals(day, alimentosById);
  const usedSlots = new Set(day.comidas.map((c) => c.slot));
  const availableSlots = MEAL_SLOTS.filter((s) => !usedSlots.has(s.value));

  function updateMeal(index: number, patch: Partial<Meal>) {
    onChange({ comidas: day.comidas.map((c, i) => (i === index ? { ...c, ...patch } : c)) });
  }

  function removeMeal(index: number) {
    onChange({ comidas: day.comidas.filter((_, i) => i !== index) });
  }

  function addMeal(slot: MealSlot) {
    onChange({ comidas: [...day.comidas, emptyMeal(slot)] });
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-center gap-2">
        <input
          value={day.nombre}
          onChange={(e) => onChange({ nombre: e.target.value })}
          className="input flex-1 !py-1.5 !text-xs font-semibold"
        />
        <span className="whitespace-nowrap rounded-full bg-white/5 px-2 py-1 text-[10px] text-white/50">
          {Math.round(totals.calorias)} kcal
        </span>
        <button onClick={onRemove} className="text-white/30 hover:text-red-400">
          <Trash2 size={14} />
        </button>
      </div>

      <div className="mt-3 space-y-2">
        {day.comidas.map((meal, mealIndex) => (
          <MealEditor
            key={meal.slot}
            meal={meal}
            alimentosById={alimentosById}
            onChange={(patch) => updateMeal(mealIndex, patch)}
            onRemove={() => removeMeal(mealIndex)}
            onAlimentoResolved={onAlimentoResolved}
          />
        ))}
      </div>

      {availableSlots.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {availableSlots.map((s) => (
            <button
              key={s.value}
              onClick={() => addMeal(s.value)}
              className="flex items-center gap-1 rounded-full border border-dashed border-white/15 px-2.5 py-1 text-[10px] font-semibold text-white/40 hover:border-white/30 hover:text-white"
            >
              <Plus size={10} /> {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MealEditor({
  meal,
  alimentosById,
  onChange,
  onRemove,
  onAlimentoResolved,
}: {
  meal: Meal;
  alimentosById: Map<string, AlimentoLite>;
  onChange: (patch: Partial<Meal>) => void;
  onRemove: () => void;
  onAlimentoResolved: (a: AlimentoLite) => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const label = MEAL_SLOTS.find((s) => s.value === meal.slot)?.label ?? meal.slot;

  function updateItem(index: number, patch: Partial<MealItem>) {
    onChange({ items: meal.items.map((it, i) => (i === index ? { ...it, ...patch } : it)) });
  }

  function removeItem(index: number) {
    onChange({ items: meal.items.filter((_, i) => i !== index) });
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-white/70">{label}</span>
        <button onClick={onRemove} className="text-[10px] text-white/30 hover:text-red-400">
          Quitar comida
        </button>
      </div>

      <div className="mt-2 space-y-1.5">
        {meal.items.map((item, itemIndex) => {
          const alimento = item.alimentoId ? alimentosById.get(item.alimentoId) : null;
          return (
            <div key={itemIndex} className="flex items-center gap-2 rounded-lg bg-white/[0.02] px-2 py-1.5">
              <div className="min-w-0 flex-1">
                {item.alimentoId ? (
                  <>
                    <p className="truncate text-xs text-white">{alimento?.nombre ?? "Cargando..."}</p>
                    {alimento && (
                      <p className="text-[10px] text-white/30">
                        {alimento.unidadReferencia} · {Math.round(alimento.calorias * item.cantidad)} kcal
                        {alimento.precioCop ? ` · ${formatCop(alimento.precioCop * item.cantidad)}` : ""}
                      </p>
                    )}
                  </>
                ) : (
                  <input
                    value={item.nombreLibre ?? ""}
                    onChange={(e) => updateItem(itemIndex, { nombreLibre: e.target.value })}
                    placeholder="Alimento libre (fuera de la biblioteca)"
                    className="input !py-1 !text-xs"
                  />
                )}
              </div>
              <input
                type="number"
                min={0.25}
                step={0.25}
                value={item.cantidad}
                onChange={(e) => updateItem(itemIndex, { cantidad: parseFloat(e.target.value) || 1 })}
                className="input !w-16 !py-1 !text-center !text-xs"
                title="Cantidad (múltiplo de la porción de referencia)"
              />
              <button onClick={() => removeItem(itemIndex)} className="text-white/30 hover:text-red-400">
                <X size={13} />
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-2 flex gap-2">
        <button
          onClick={() => setPickerOpen(true)}
          className="flex items-center gap-1 rounded-full border border-white/15 px-2.5 py-1 text-[10px] font-semibold text-white/60 hover:border-hf-blue/40 hover:text-hf-blue"
        >
          <Library size={11} /> Ver biblioteca
        </button>
        <button
          onClick={() => onChange({ items: [...meal.items, emptyMealItem()] })}
          className="flex items-center gap-1 rounded-full border border-dashed border-white/15 px-2.5 py-1 text-[10px] font-semibold text-white/40 hover:border-white/30 hover:text-white"
        >
          <Plus size={11} /> Alimento libre
        </button>
      </div>

      {pickerOpen && (
        <AlimentoPickerModal
          onSelect={(a) => {
            onAlimentoResolved(toLite(a));
            onChange({ items: [...meal.items, { alimentoId: a.id, nombreLibre: null, cantidad: 1, notas: null }] });
            setPickerOpen(false);
          }}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </div>
  );
}

function AlimentoPickerModal({ onSelect, onClose }: { onSelect: (a: AlimentoRow) => void; onClose: () => void }) {
  const [all, setAll] = useState<AlimentoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [categoria, setCategoria] = useState("");
  const [tienda, setTienda] = useState("");

  useEffect(() => {
    searchAlimentos().then((rows) => {
      setAll(rows);
      setLoading(false);
    });
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter((a) => {
      if (q && !a.nombre.toLowerCase().includes(q)) return false;
      if (categoria && a.categoria !== categoria) return false;
      if (tienda && !a.tiendas.includes(tienda)) return false;
      return true;
    });
  }, [all, query, categoria, tienda]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0a0d16]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h2 className="text-sm font-bold text-white">Biblioteca de alimentos</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-white/10 px-5 py-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre..."
            className="input min-w-[160px] flex-1 !py-1.5 !text-xs"
          />
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)} className="input !w-auto !py-1.5 !text-xs">
            <option value="" className="bg-[#0a0d16]">
              Todas las categorías
            </option>
            {CATEGORIA_OPTIONS.map((o) => (
              <option key={o.value} value={o.value} className="bg-[#0a0d16]">
                {o.label}
              </option>
            ))}
          </select>
          <select value={tienda} onChange={(e) => setTienda(e.target.value)} className="input !w-auto !py-1.5 !text-xs">
            <option value="" className="bg-[#0a0d16]">
              Cualquier tienda
            </option>
            {Object.entries(TIENDA_LABELS).map(([value, label]) => (
              <option key={value} value={value} className="bg-[#0a0d16]">
                {label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading && <p className="text-xs text-white/40">Cargando biblioteca...</p>}
          {!loading && filtered.length === 0 && <p className="text-xs text-white/40">Sin resultados con esos filtros.</p>}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {filtered.map((a) => (
              <button
                key={a.id}
                onClick={() => onSelect(a)}
                className="flex flex-col gap-1.5 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-left hover:border-hf-blue/40 hover:bg-white/5"
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="text-xs font-semibold text-white">{a.nombre}</span>
                  {a.precio_cop != null && (
                    <span className="whitespace-nowrap text-[10px] font-semibold text-emerald-400">{formatCop(a.precio_cop)}</span>
                  )}
                </span>
                <span className="text-[10px] text-white/40">
                  {a.unidad_referencia} · {a.calorias} kcal · {CATEGORIA_LABELS[a.categoria] ?? a.categoria}
                </span>
                <span className="flex flex-wrap gap-1">
                  {a.tiendas.map((t) => (
                    <span key={t} className="rounded-full bg-white/5 px-1.5 py-0.5 text-[9px] text-white/50">
                      {TIENDA_LABELS[t] ?? t}
                    </span>
                  ))}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-white/10 px-5 py-2.5 text-center text-[11px] text-white/30">
          {filtered.length} de {all.length} alimentos
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modo de creación — primer paso al crear un plan nuevo (pedido explícito de
// Nando): el entrenador elige cómo arrancar antes de ver el editor.
// ---------------------------------------------------------------------------

const TIENDAS_REALES = ["d1", "ara", "exito"] as const;

function NewPlanModeModal({
  onClose,
  onManual,
  onTemplate,
  onIA,
}: {
  onClose: () => void;
  onManual: () => void;
  onTemplate: () => void;
  onIA: () => void;
}) {
  const options = [
    {
      icon: Sparkles,
      title: "Generar con HAKAI",
      desc: "HAKAI arma un plan de 7 días adaptado al cliente (objetivo, restricciones, presupuesto). Tú revisas y ajustas antes de guardar.",
      onClick: onIA,
      accent: true,
    },
    {
      icon: ListChecks,
      title: "Usar plantilla",
      desc: "Genera 3 días automáticamente según el objetivo elegido — reglas simples, instantáneo, sin IA.",
      onClick: onTemplate,
      accent: false,
    },
    {
      icon: PenLine,
      title: "Crear manual",
      desc: "Arma el plan tú mismo desde cero, comida por comida.",
      onClick: onManual,
      accent: false,
    },
  ];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0a0d16] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">¿Cómo quieres crear este plan?</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {options.map((opt) => (
            <button
              key={opt.title}
              onClick={opt.onClick}
              className={`flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition-colors ${
                opt.accent
                  ? "border-hf-blue/40 bg-hf-blue/10 hover:border-hf-blue/60"
                  : "border-white/10 bg-white/[0.02] hover:border-white/25"
              }`}
            >
              <div
                className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                  opt.accent ? "bg-hf-blue/20 text-hf-blue" : "bg-white/5 text-white/60"
                }`}
              >
                <opt.icon size={15} />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">{opt.title}</p>
                <p className="mt-0.5 text-xs text-white/50">{opt.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Plantilla — reglas simples sobre la biblioteca real (sin IA), 3 días.
// ---------------------------------------------------------------------------

function TemplateWizardModal({
  clientId,
  onClose,
  onGenerated,
}: {
  clientId: string;
  onClose: () => void;
  onGenerated: (dias: NutritionDias) => void;
}) {
  const [objetivo, setObjetivo] = useState("mantenimiento");
  const [comidasPorDia, setComidasPorDia] = useState(3);
  const [tiendas, setTiendas] = useState<string[]>([...TIENDAS_REALES]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleTienda(t: string) {
    setTiendas((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  function submit() {
    setError(null);
    setLoading(true);
    generateOwnMealPlanTemplate({ clientId, objetivo, comidasPorDia, tiendas })
      .then((res) => {
        if (!res.ok || !res.dias) {
          setError(res.error ?? "No se pudo generar la plantilla.");
          setLoading(false);
          return;
        }
        onGenerated(res.dias);
      })
      .catch(() => {
        setError("No se pudo generar la plantilla. Intenta de nuevo.");
        setLoading(false);
      });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0a0d16] p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 text-sm font-bold text-white">
            <ListChecks size={15} /> Plantilla de 3 días
          </h2>
          <button onClick={onClose} className="text-white/40 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-white/50">Objetivo</span>
            <select
              value={objetivo}
              onChange={(e) => setObjetivo(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white outline-none focus:border-white/30"
            >
              {OBJETIVO_OPTIONS.map((o) => (
                <option key={o.value} value={o.value} className="bg-[#0a0d16]">
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-white/50">Comidas por día</span>
            <select
              value={comidasPorDia}
              onChange={(e) => setComidasPorDia(Number(e.target.value))}
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white outline-none focus:border-white/30"
            >
              <option value={3} className="bg-[#0a0d16]">3 (desayuno, almuerzo, cena)</option>
              <option value={4} className="bg-[#0a0d16]">4 (+ media tarde)</option>
              <option value={5} className="bg-[#0a0d16]">5 (+ media mañana)</option>
            </select>
          </label>

          <div>
            <span className="text-[11px] font-semibold text-white/50">Tiendas</span>
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {TIENDAS_REALES.map((t) => (
                <button
                  key={t}
                  onClick={() => toggleTienda(t)}
                  className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${
                    tiendas.includes(t) ? "border-hf-blue/50 bg-hf-blue/15 text-hf-blue" : "border-white/10 text-white/40"
                  }`}
                >
                  {TIENDA_LABELS[t] ?? t}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-red-400">{error}</p>}

          <button
            onClick={submit}
            disabled={loading || tiendas.length === 0}
            className="flex w-full items-center justify-center gap-1.5 rounded-full bg-hf-blue py-2.5 text-xs font-bold text-black disabled:opacity-40"
          >
            {loading ? (
              <>
                <Loader2 size={13} className="animate-spin" /> Generando...
              </>
            ) : (
              "Generar plantilla"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// HAKAI — llamada real al asistente de IA de HakunnaFit, 7 días, respetando objetivo/restricciones/
// presupuesto opcional. Ver generateOwnMealPlanWithAI en
// trainer-nutrition-actions.ts para el detalle de la validación defensiva.
// ---------------------------------------------------------------------------

function IAWizardModal({
  clientId,
  client,
  onClose,
  onGenerated,
}: {
  clientId: string;
  client: ClientRow | null;
  onClose: () => void;
  onGenerated: (dias: NutritionDias) => void;
}) {
  const [objetivo, setObjetivo] = useState("mantenimiento");
  const [comidasPorDia, setComidasPorDia] = useState(4);
  const [tiendas, setTiendas] = useState<string[]>([...TIENDAS_REALES]);
  const [restricciones, setRestricciones] = useState("");
  const [presupuesto, setPresupuesto] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleTienda(t: string) {
    setTiendas((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
  }

  function submit() {
    setError(null);
    setLoading(true);
    generateOwnMealPlanWithAI({
      clientId,
      objetivo,
      comidasPorDia,
      tiendas,
      restricciones: restricciones.trim() || null,
      presupuestoSemanalCop: presupuesto.trim() ? Number(presupuesto) : null,
    })
      .then((res) => {
        if (!res.ok || !res.dias) {
          setError(res.error ?? "HAKAI no pudo generar el plan.");
          setLoading(false);
          return;
        }
        onGenerated(res.dias);
      })
      .catch(() => {
        setError("HAKAI no pudo generar el plan. Intenta de nuevo.");
        setLoading(false);
      });
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={loading ? undefined : onClose}>
      <div
        className="max-h-[88vh] w-full max-w-md overflow-y-auto rounded-2xl border border-white/10 bg-[#0a0d16] p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-1.5 text-sm font-bold text-white">
            <Sparkles size={15} className="text-hf-blue" /> Generar con HAKAI
          </h2>
          {!loading && (
            <button onClick={onClose} className="text-white/40 hover:text-white">
              <X size={18} />
            </button>
          )}
        </div>

        {client && (
          <p className="mt-1.5 text-[11px] text-white/40">
            {client.full_name}
            {client.peso_actual ? ` · ${client.peso_actual} kg` : " · sin peso registrado"}
            {client.actividad ? ` · actividad ${ACTIVIDAD_LABELS[client.actividad] ?? client.actividad}` : ""}
          </p>
        )}

        {loading ? (
          <div className="mt-8 flex flex-col items-center gap-3 py-6 text-center">
            <Loader2 size={22} className="animate-spin text-hf-blue" />
            <p className="text-xs text-white/60">HAKAI está armando el plan de 7 días... puede tardar unos segundos.</p>
          </div>
        ) : (
          <div className="mt-4 space-y-3">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-white/50">Objetivo</span>
              <select
                value={objetivo}
                onChange={(e) => setObjetivo(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white outline-none focus:border-white/30"
              >
                {OBJETIVO_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value} className="bg-[#0a0d16]">
                    {o.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-white/50">Comidas por día</span>
              <select
                value={comidasPorDia}
                onChange={(e) => setComidasPorDia(Number(e.target.value))}
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white outline-none focus:border-white/30"
              >
                <option value={3} className="bg-[#0a0d16]">3 (desayuno, almuerzo, cena)</option>
                <option value={4} className="bg-[#0a0d16]">4 (+ media tarde)</option>
                <option value={5} className="bg-[#0a0d16]">5 (+ media mañana)</option>
              </select>
            </label>

            <div>
              <span className="text-[11px] font-semibold text-white/50">Tiendas</span>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {TIENDAS_REALES.map((t) => (
                  <button
                    key={t}
                    onClick={() => toggleTienda(t)}
                    className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${
                      tiendas.includes(t) ? "border-hf-blue/50 bg-hf-blue/15 text-hf-blue" : "border-white/10 text-white/40"
                    }`}
                  >
                    {TIENDA_LABELS[t] ?? t}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-white/50">Restricciones / alergias / no le gusta (opcional)</span>
              <input
                value={restricciones}
                onChange={(e) => setRestricciones(e.target.value)}
                placeholder="Ej: intolerante a la lactosa, no come pescado..."
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white outline-none focus:border-white/30"
              />
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-white/50">Presupuesto semanal máximo en COP (opcional)</span>
              <input
                type="number"
                min={0}
                value={presupuesto}
                onChange={(e) => setPresupuesto(e.target.value)}
                placeholder="Ej: 80000"
                className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white outline-none focus:border-white/30"
              />
            </label>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <button
              onClick={submit}
              disabled={tiendas.length === 0}
              className="flex w-full items-center justify-center gap-1.5 rounded-full bg-hf-blue py-2.5 text-xs font-bold text-black disabled:opacity-40"
            >
              <Sparkles size={13} /> Generar con HAKAI
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// Icono reservado para cuando este módulo se muestre en listas fuera del
// panel (ej. resumen de módulos activos) — evita el warning de import no
// usado si Utensils deja de usarse en el header en algún refactor futuro.
export const NUTRITION_ICON = Utensils;
