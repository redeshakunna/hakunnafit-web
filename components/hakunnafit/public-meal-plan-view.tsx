"use client";

// Vista pública e imprimible de un plan de alimentación — /plan/[token].
// Sin sesión, sin edición: el entrenador comparte este link por WhatsApp (o
// lo abre él mismo para imprimir) y el cliente lo ve tal cual, con marca del
// entrenador (logo + colores, mismo patrón --hf-primary/secondary/tertiary
// que las landings Starter y /mi-cuenta, ver brandColorVars).
//
// Diseño pensado para dos lecturas distintas del mismo HTML:
//  - En pantalla: tabs para navegar día por día (igual que MealPlanSection
//    en /mi-cuenta), fondo oscuro consistente con el resto de la app.
//  - Al imprimir (@media print más abajo): TODOS los días se muestran de
//    corrido (no solo el que está activo en pantalla) sobre fondo blanco —
//    lo que se manda a imprimir debe ser el plan completo de la semana, no
//    solo el día que se estaba mirando quand se dio click en Imprimir.

import { useMemo, useState, type CSSProperties } from "react";
import { Printer, Share2, ShoppingBasket, Flame } from "lucide-react";
import {
  MEAL_SLOTS,
  OBJETIVO_LABELS,
  dayTotals,
  buildShoppingList,
  CATEGORIA_LABELS,
  type AlimentoLite,
  type NutritionDias,
} from "@/lib/nutrition-types";
import { formatCop } from "@/lib/currency";

interface Props {
  clientFirstName: string;
  comidasPorDia: number;
  objetivo: string | null;
  dias: NutritionDias;
  trainer: {
    businessName: string;
    logoUrl: string | null;
    colorPrimario: string;
    colorSecundario: string;
    colorTerciario: string;
  };
  alimentos: AlimentoLite[];
  shareUrl: string;
}

export function PublicMealPlanView({ clientFirstName, objetivo, dias, trainer, alimentos, shareUrl }: Props) {
  const [activeIndex, setActiveIndex] = useState(0);
  const alimentosById = useMemo(() => new Map(alimentos.map((a) => [a.id, a])), [alimentos]);
  const shoppingList = useMemo(() => buildShoppingList(dias, alimentosById), [dias, alimentosById]);
  const shoppingByCategoria = useMemo(() => {
    const map = new Map<string, typeof shoppingList>();
    for (const item of shoppingList) {
      const list = map.get(item.categoria) ?? [];
      list.push(item);
      map.set(item.categoria, list);
    }
    return map;
  }, [shoppingList]);

  const weekCostCop = dias.reduce((acc, d) => acc + dayTotals(d, alimentosById).costoCop, 0);

  const brandVars: CSSProperties = {
    ["--hf-primary" as string]: trainer.colorPrimario,
    ["--hf-secondary" as string]: trainer.colorSecundario,
    ["--hf-tertiary" as string]: trainer.colorTerciario,
  };

  function handleShareWhatsapp() {
    const mensaje = `Hola ${clientFirstName}, este es tu plan de alimentación 🍽️\n${shareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(mensaje)}`, "_blank");
  }

  return (
    <div style={brandVars} className="plan-print-root min-h-screen bg-hf-black text-white">
      <style>{`
        @media print {
          .plan-print-root { background: #fff !important; color: #111 !important; min-height: 0 !important; }
          .no-print { display: none !important; }
          .print-only-block { display: block !important; }
          .day-panel { display: block !important; break-inside: avoid; page-break-inside: avoid; margin-bottom: 20px; }
          .plan-card { border: 1px solid #ddd !important; background: #fff !important; }
          .plan-card * { color: #111 !important; }
          .plan-muted { color: #555 !important; }
        }
      `}</style>

      <div className="mx-auto max-w-3xl px-5 py-8">
        <header className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {trainer.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={trainer.logoUrl} alt={trainer.businessName} className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <div
                className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-black"
                style={{ background: "var(--hf-primary)" }}
              >
                {trainer.businessName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-sm font-bold">{trainer.businessName}</p>
              <p className="text-xs text-white/50 plan-muted">Plan de alimentación de {clientFirstName}</p>
            </div>
          </div>
          <div className="no-print flex gap-2">
            <button
              onClick={handleShareWhatsapp}
              className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white hover:bg-white/10"
            >
              <Share2 size={14} /> WhatsApp
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-black"
              style={{ background: "var(--hf-primary)" }}
            >
              <Printer size={14} /> Imprimir
            </button>
          </div>
        </header>

        {objetivo && (
          <p className="mt-4 inline-block rounded-full bg-white/5 px-3 py-1 text-xs font-semibold text-white/70 plan-muted">
            Objetivo: {OBJETIVO_LABELS[objetivo] ?? objetivo}
          </p>
        )}

        {/* Tabs solo en pantalla — al imprimir se muestran todos los días (ver .day-panel en @media print) */}
        <div className="no-print mt-4 flex gap-1.5 overflow-x-auto pb-1">
          {dias.map((day, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              className="shrink-0 rounded-xl border px-3.5 py-2 text-xs font-bold transition-colors"
              style={
                i === activeIndex
                  ? { background: "var(--hf-primary)", borderColor: "transparent", color: "#000" }
                  : { borderColor: "rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.02)", color: "#fff" }
              }
            >
              {day.nombre}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-4">
          {dias.map((day, i) => {
            const totals = dayTotals(day, alimentosById);
            return (
              <div key={i} className={`day-panel ${i === activeIndex ? "" : "hidden print:block"}`}>
                <div className="plan-card rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold">{day.nombre}</p>
                    {totals.calorias > 0 && (
                      <span className="flex items-center gap-1 text-xs font-semibold text-white/60 plan-muted">
                        <Flame size={12} /> {Math.round(totals.calorias)} kcal
                      </span>
                    )}
                  </div>
                  <div className="mt-3 space-y-2">
                    {day.comidas.map((meal, j) => {
                      const slotLabel = MEAL_SLOTS.find((s) => s.value === meal.slot)?.label ?? meal.slot;
                      if (meal.items.length === 0) return null;
                      return (
                        <div key={j} className="rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5 plan-card">
                          <p className="text-xs font-bold text-white/70 plan-muted">{slotLabel}</p>
                          <div className="mt-1.5 space-y-1">
                            {meal.items.map((item, k) => {
                              const alimento = item.alimentoId ? alimentosById.get(item.alimentoId) : null;
                              const label = alimento?.nombre ?? item.nombreLibre?.trim() ?? "Alimento";
                              return (
                                <div key={k} className="flex items-center justify-between gap-2 text-xs">
                                  <span className="min-w-0 truncate text-white/80">
                                    {label}
                                    {item.cantidad !== 1 ? ` × ${item.cantidad}` : ""}
                                  </span>
                                  {alimento && (
                                    <span className="shrink-0 text-white/40 plan-muted">
                                      {Math.round(alimento.calorias * item.cantidad)} kcal
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Lista de mercado — agregada de todo el plan, siempre visible (pantalla e impresión) */}
        {shoppingList.length > 0 && (
          <div className="plan-card mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center gap-2">
              <ShoppingBasket size={16} style={{ color: "var(--hf-primary)" }} />
              <p className="text-sm font-bold">Lista de mercado de la semana</p>
            </div>
            <p className="mt-1 text-[11px] text-white/40 plan-muted">
              Cantidades aproximadas para cubrir todo el plan. Precios de referencia D1 / Ara / Éxito.
            </p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              {Array.from(shoppingByCategoria.entries()).map(([categoria, items]) => (
                <div key={categoria}>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-white/40 plan-muted">
                    {CATEGORIA_LABELS[categoria] ?? categoria}
                  </p>
                  <div className="mt-1.5 space-y-1">
                    {items.map((item) => (
                      <div key={item.alimentoId} className="flex items-center justify-between gap-2 text-xs">
                        <span className="text-white/80">{item.nombre}</span>
                        <span className="shrink-0 font-semibold" style={{ color: "var(--hf-primary)" }}>
                          {item.display}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {weekCostCop > 0 && (
              <p className="mt-4 border-t border-white/10 pt-3 text-xs text-white/60 plan-muted">
                Costo estimado de la semana: <b style={{ color: "var(--hf-primary)" }}>{formatCop(weekCostCop)}</b>
              </p>
            )}
          </div>
        )}

        <p className="no-print mt-6 text-center text-[11px] text-white/30">
          Plan armado por {trainer.businessName} en HakunnaFit — no editable desde este link.
        </p>
      </div>
    </div>
  );
}
