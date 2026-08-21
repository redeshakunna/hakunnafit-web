"use client";

// Vista pública e imprimible de un plan de alimentación — /plan/[token].
// Sin sesión, sin edición: el entrenador comparte este link por WhatsApp (o
// lo abre él mismo para imprimir) y el cliente lo ve tal cual.
//
// Rediseño pedido por Nando con referencia visual: un "informe" tipo
// documento (fondo blanco, encabezado con foto/datos del entrenador, resumen
// del plan, dona de macros, beneficios, tabla por día y lista de mercado),
// no la vista tipo app oscura que había antes. Se ve igual en pantalla y al
// imprimir — ya no hace falta un tema oscuro que se voltea a blanco solo al
// imprimir, todo el componente vive en el mismo estilo "documento" siempre.
//
// Los colores de marca del entrenador (--hf-primary/secondary/tertiary, el
// mismo patrón que landings Starter y /mi-cuenta) se usan en los acentos: la
// dona de macros, los totales de calorías y el costo estimado — así el
// informe se siente del entrenador, no genérico.

import { useMemo, type CSSProperties } from "react";
import {
  Printer,
  Share2,
  ShoppingBasket,
  Phone,
  Mail,
  Instagram,
  Target,
  CalendarDays,
  Utensils,
  Zap,
  HeartPulse,
  Sparkles,
  Brain,
  Beef,
  Milk,
  Wheat,
  Sprout,
  Apple,
  Carrot,
  Droplet,
  type LucideIcon,
} from "lucide-react";
import {
  MEAL_SLOTS,
  OBJETIVO_LABELS,
  dayTotals,
  mealTotals,
  planAverageDayTotals,
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
    avatarUrl: string | null;
    whatsappPublico: string | null;
    instagram: string | null;
    emailPublico: string | null;
    colorPrimario: string;
    colorSecundario: string;
    colorTerciario: string;
  };
  alimentos: AlimentoLite[];
  shareUrl: string;
}

// Hora de referencia por tiempo de comida — el modelo no guarda horarios
// reales (un plan no está atado a horas fijas, ver nutrition-types.ts), pero
// mostrar una hora aproximada hace la tabla mucho más legible/imprimible,
// igual que en la referencia visual. Son horas típicas, no configurables.
const MEAL_HOURS: Record<string, string> = {
  desayuno: "07:00 AM",
  media_manana: "10:00 AM",
  almuerzo: "01:00 PM",
  media_tarde: "04:30 PM",
  cena: "07:30 PM",
};

const CATEGORIA_ICONS: Record<string, LucideIcon> = {
  proteina: Beef,
  lacteo: Milk,
  carbohidrato: Wheat,
  legumbre: Sprout,
  fruta: Apple,
  verdura: Carrot,
  grasa: Droplet,
};

const BENEFICIOS: { icon: LucideIcon; label: string }[] = [
  { icon: Zap, label: "Energía estable durante el día" },
  { icon: HeartPulse, label: "Mejora de la composición corporal" },
  { icon: Sparkles, label: "Hábitos saludables y sostenibles" },
  { icon: Brain, label: "Rendimiento físico y mental óptimo" },
];

export function PublicMealPlanView({
  clientFirstName,
  comidasPorDia,
  objetivo,
  dias,
  trainer,
  alimentos,
  shareUrl,
}: Props) {
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
  const diasConContenido = dias.filter((d) => d.comidas.some((m) => m.items.length > 0));
  const avg = useMemo(() => planAverageDayTotals(dias, alimentosById), [dias, alimentosById]);

  // % de macros sobre calorías totales (proteína/carbos = 4 kcal/g, grasa = 9
  // kcal/g) — la grasa se calcula por resta para que las 3 sumen 100% exacto
  // en pantalla, en vez de arrastrar error de redondeo en las 3.
  const kcalProteina = avg.proteinaG * 4;
  const kcalCarbos = avg.carbohidratosG * 4;
  const kcalGrasa = avg.grasaG * 9;
  const kcalMacrosTotal = kcalProteina + kcalCarbos + kcalGrasa;
  const pctProteina = kcalMacrosTotal > 0 ? Math.round((kcalProteina / kcalMacrosTotal) * 100) : 0;
  const pctCarbos = kcalMacrosTotal > 0 ? Math.round((kcalCarbos / kcalMacrosTotal) * 100) : 0;
  const pctGrasa = kcalMacrosTotal > 0 ? Math.max(0, 100 - pctProteina - pctCarbos) : 0;

  const brandVars: CSSProperties = {
    ["--hf-primary" as string]: trainer.colorPrimario,
    ["--hf-secondary" as string]: trainer.colorSecundario,
    ["--hf-tertiary" as string]: trainer.colorTerciario,
  };

  function handleShareWhatsapp() {
    const mensaje = `Hola ${clientFirstName}, este es tu plan de alimentación 🍽️\n${shareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(mensaje)}`, "_blank");
  }

  // Circunferencia de la dona de macros (SVG, sin librería de charts).
  const R = 60;
  const CIRC = 2 * Math.PI * R;
  const segProteina = (pctProteina / 100) * CIRC;
  const segCarbos = (pctCarbos / 100) * CIRC;
  const segGrasa = Math.max(CIRC - segProteina - segCarbos, 0);

  return (
    <div style={brandVars} className="min-h-screen bg-[#f4f5f7] py-6 text-neutral-900 print:bg-white print:py-0">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .plan-sheet { box-shadow: none !important; border: none !important; }
          .plan-day { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>

      <div className="plan-sheet mx-auto max-w-4xl rounded-3xl border border-neutral-200 bg-white p-6 shadow-xl shadow-black/5 sm:p-10 print:max-w-none print:rounded-none">
        {/* Header */}
        <header className="flex flex-col gap-6 border-b border-neutral-100 pb-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {trainer.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={trainer.avatarUrl}
                alt={trainer.businessName}
                className="h-20 w-20 shrink-0 rounded-2xl object-cover"
              />
            ) : (
              <div
                className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl text-xl font-black text-white"
                style={{ background: "var(--hf-primary)" }}
              >
                {trainer.businessName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--hf-primary)" }}>
                Entrenador Personal
              </p>
              <p className="text-xl font-black leading-tight text-neutral-900">{trainer.businessName}</p>
              <div className="mt-1.5 space-y-0.5">
                {trainer.whatsappPublico && (
                  <p className="flex items-center gap-1.5 text-[11px] text-neutral-500">
                    <Phone size={11} /> {trainer.whatsappPublico}
                  </p>
                )}
                {trainer.emailPublico && (
                  <p className="flex items-center gap-1.5 text-[11px] text-neutral-500">
                    <Mail size={11} /> {trainer.emailPublico}
                  </p>
                )}
                {trainer.instagram && (
                  <p className="flex items-center gap-1.5 text-[11px] text-neutral-500">
                    <Instagram size={11} /> @{trainer.instagram.replace(/^@/, "")}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="sm:text-right">
            <p className="text-3xl font-black leading-none tracking-tight text-neutral-900 sm:text-4xl">
              PLAN
              <br />
              <span style={{ color: "var(--hf-primary)" }}>NUTRICIONAL</span>
            </p>
            <p className="mt-3 text-[11px] font-bold uppercase tracking-wider text-neutral-400">Personalizado para</p>
            <p
              className="mt-0.5 font-serif text-2xl italic text-neutral-800"
              style={{ fontFamily: "'Brush Script MT', cursive" }}
            >
              {clientFirstName}
            </p>
          </div>
        </header>

        <div className="no-print mt-4 flex justify-end gap-2">
          <button
            onClick={handleShareWhatsapp}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-50"
          >
            <Share2 size={14} /> WhatsApp
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white"
            style={{ background: "var(--hf-primary)" }}
          >
            <Printer size={14} /> Imprimir
          </button>
        </div>

        {/* Resumen del plan + macros */}
        <section className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-neutral-800">
              <Target size={16} style={{ color: "var(--hf-primary)" }} /> Resumen del plan
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-400">Objetivo</p>
                <p className="mt-1 text-sm font-bold leading-tight text-neutral-900">
                  {objetivo ? (OBJETIVO_LABELS[objetivo] ?? objetivo).split(" (")[0] : "Sin definir"}
                </p>
              </div>
              <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-400">Calorías promedio</p>
                <p className="mt-1 text-lg font-black leading-tight" style={{ color: "var(--hf-primary)" }}>
                  {Math.round(avg.calorias).toLocaleString("es-CO")}
                  <span className="ml-1 text-[10px] font-bold text-neutral-400">KCAL/DÍA</span>
                </p>
              </div>
              <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-3">
                <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-neutral-400">
                  <CalendarDays size={11} /> Duración
                </p>
                <p className="mt-1 text-lg font-black leading-tight text-neutral-900">
                  {dias.length} <span className="text-[10px] font-bold text-neutral-400">DÍAS</span>
                </p>
              </div>
              <div className="rounded-2xl border border-neutral-100 bg-neutral-50 p-3">
                <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-neutral-400">
                  <Utensils size={11} /> Comidas al día
                </p>
                <p className="mt-1 text-lg font-black leading-tight text-neutral-900">{comidasPorDia}</p>
              </div>
            </div>
          </div>

          {kcalMacrosTotal > 0 && (
            <div>
              <p className="text-sm font-black uppercase tracking-wide text-neutral-800">
                Distribución de macronutrientes <span className="font-medium normal-case text-neutral-400">(promedio)</span>
              </p>
              <div className="mt-3 flex items-center gap-5">
                <svg viewBox="0 0 140 140" className="h-28 w-28 shrink-0 -rotate-90">
                  <circle cx="70" cy="70" r={R} fill="none" stroke="#f0f0f2" strokeWidth="16" />
                  <circle
                    cx="70"
                    cy="70"
                    r={R}
                    fill="none"
                    stroke="var(--hf-primary)"
                    strokeWidth="16"
                    strokeDasharray={`${segProteina} ${CIRC - segProteina}`}
                    strokeLinecap="butt"
                  />
                  <circle
                    cx="70"
                    cy="70"
                    r={R}
                    fill="none"
                    stroke="var(--hf-secondary)"
                    strokeWidth="16"
                    strokeDasharray={`${segCarbos} ${CIRC - segCarbos}`}
                    strokeDashoffset={-segProteina}
                    strokeLinecap="butt"
                  />
                  <circle
                    cx="70"
                    cy="70"
                    r={R}
                    fill="none"
                    stroke="var(--hf-tertiary)"
                    strokeWidth="16"
                    strokeDasharray={`${segGrasa} ${CIRC - segGrasa}`}
                    strokeDashoffset={-(segProteina + segCarbos)}
                    strokeLinecap="butt"
                  />
                  <text x="70" y="66" textAnchor="middle" style={{ transform: "rotate(90deg)", transformOrigin: "70px 70px" }}>
                    <tspan x="70" dy="0" fontSize="20" fontWeight="900" fill="#111">
                      {Math.round(avg.calorias).toLocaleString("es-CO")}
                    </tspan>
                    <tspan x="70" dy="16" fontSize="9" fontWeight="700" fill="#999">
                      KCAL
                    </tspan>
                  </text>
                </svg>
                <div className="space-y-1.5 text-xs">
                  <p className="flex items-center gap-1.5 font-semibold text-neutral-700">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--hf-primary)" }} />
                    Proteínas <span className="ml-auto font-black">{pctProteina}%</span>
                    <span className="text-neutral-400">{Math.round(avg.proteinaG)} g</span>
                  </p>
                  <p className="flex items-center gap-1.5 font-semibold text-neutral-700">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--hf-secondary)" }} />
                    Carbohidratos <span className="ml-auto font-black">{pctCarbos}%</span>
                    <span className="text-neutral-400">{Math.round(avg.carbohidratosG)} g</span>
                  </p>
                  <p className="flex items-center gap-1.5 font-semibold text-neutral-700">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: "var(--hf-tertiary)" }} />
                    Grasas <span className="ml-auto font-black">{pctGrasa}%</span>
                    <span className="text-neutral-400">{Math.round(avg.grasaG)} g</span>
                  </p>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Beneficios */}
        <section className="mt-8 grid grid-cols-2 gap-4 border-t border-neutral-100 pt-6 sm:grid-cols-4">
          {BENEFICIOS.map(({ icon: Icon, label }) => (
            <div key={label} className="flex flex-col items-center gap-2 text-center">
              <span
                className="flex h-10 w-10 items-center justify-center rounded-full border-2"
                style={{ borderColor: "var(--hf-primary)", color: "var(--hf-primary)" }}
              >
                <Icon size={16} />
              </span>
              <p className="text-[11px] font-semibold leading-tight text-neutral-600">{label}</p>
            </div>
          ))}
        </section>

        {/* Días */}
        {diasConContenido.length > 0 && (
          <div className="no-print mt-8 flex flex-wrap gap-1.5 border-t border-neutral-100 pt-4">
            {diasConContenido.map((day, i) => (
              <a
                key={i}
                href={`#dia-${i}`}
                className="rounded-full border border-neutral-200 px-3 py-1 text-[11px] font-bold text-neutral-600 hover:border-neutral-400"
              >
                {day.nombre}
              </a>
            ))}
          </div>
        )}

        <div className="mt-4 space-y-8">
          {diasConContenido.map((day, i) => {
            const totals = dayTotals(day, alimentosById);
            return (
              <section key={i} id={`dia-${i}`} className="plan-day">
                <div
                  className="flex items-baseline justify-between border-b-2 pb-2"
                  style={{ borderColor: "var(--hf-primary)" }}
                >
                  <h2 className="text-base font-black uppercase tracking-wide text-neutral-900">{day.nombre}</h2>
                  {totals.calorias > 0 && (
                    <p className="text-[11px] font-bold uppercase text-neutral-400">
                      Total del día:{" "}
                      <span className="text-sm font-black" style={{ color: "var(--hf-primary)" }}>
                        {Math.round(totals.calorias)} KCAL
                      </span>
                    </p>
                  )}
                </div>

                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[620px] border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-neutral-200 text-left text-[10px] font-bold uppercase tracking-wide text-neutral-400">
                        <th className="w-[12%] py-2 pr-2">Hora</th>
                        <th className="w-[15%] py-2 pr-2">Comida</th>
                        <th className="py-2 pr-2">Alimentos</th>
                        <th className="w-[20%] py-2 pr-2">Cantidad</th>
                        <th className="w-[15%] py-2 text-right">Calorías</th>
                      </tr>
                    </thead>
                    <tbody>
                      {day.comidas.map((meal, j) => {
                        if (meal.items.length === 0) return null;
                        const slotLabel = MEAL_SLOTS.find((s) => s.value === meal.slot)?.label ?? meal.slot;
                        const mealTotal = mealTotals(meal, alimentosById).calorias;
                        return (
                          <tr key={j} className="border-b border-neutral-100 align-top">
                            <td className="py-3 pr-2 font-semibold text-neutral-500">
                              {MEAL_HOURS[meal.slot] ?? "—"}
                            </td>
                            <td className="py-3 pr-2 font-bold text-neutral-800">{slotLabel}</td>
                            <td className="py-3 pr-2">
                              {meal.items.map((item, k) => {
                                const alimento = item.alimentoId ? alimentosById.get(item.alimentoId) : null;
                                const label = alimento?.nombre ?? item.nombreLibre?.trim() ?? "Alimento";
                                return (
                                  <p key={k} className="leading-relaxed text-neutral-700">
                                    {label}
                                  </p>
                                );
                              })}
                            </td>
                            <td className="py-3 pr-2">
                              {meal.items.map((item, k) => {
                                const alimento = item.alimentoId ? alimentosById.get(item.alimentoId) : null;
                                return (
                                  <p key={k} className="leading-relaxed text-neutral-500">
                                    {alimento ? alimento.unidadReferencia : "—"}
                                    {item.cantidad !== 1 ? ` × ${item.cantidad}` : ""}
                                  </p>
                                );
                              })}
                            </td>
                            <td className="py-3 text-right">
                              {meal.items.map((item, k) => {
                                const alimento = item.alimentoId ? alimentosById.get(item.alimentoId) : null;
                                if (!alimento) return <p key={k}>—</p>;
                                return (
                                  <p key={k} className="leading-relaxed text-neutral-400">
                                    {Math.round(alimento.calorias * item.cantidad)} kcal
                                  </p>
                                );
                              })}
                              {mealTotal > 0 && (
                                <p className="mt-0.5 font-black" style={{ color: "var(--hf-primary)" }}>
                                  {Math.round(mealTotal)} kcal
                                </p>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            );
          })}
        </div>

        {/* Lista de mercado */}
        {shoppingList.length > 0 && (
          <section className="mt-10 border-t border-neutral-100 pt-6">
            <p className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-neutral-800">
              <ShoppingBasket size={16} style={{ color: "var(--hf-primary)" }} /> Lista inteligente de mercado
            </p>
            <p className="mt-1 text-[11px] text-neutral-400">
              Cantidades aproximadas para {dias.length} días. Precios de referencia D1 / Ara / Éxito.
            </p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from(shoppingByCategoria.entries()).map(([categoria, items]) => {
                const Icon = CATEGORIA_ICONS[categoria] ?? ShoppingBasket;
                return (
                  <div key={categoria} className="rounded-2xl border border-neutral-100 bg-neutral-50 p-3.5">
                    <p className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide text-neutral-700">
                      <Icon size={13} style={{ color: "var(--hf-primary)" }} /> {CATEGORIA_LABELS[categoria] ?? categoria}
                    </p>
                    <div className="mt-2 space-y-1">
                      {items.map((item) => (
                        <div key={item.alimentoId} className="flex items-center justify-between gap-2 text-xs">
                          <span className="text-neutral-600">{item.nombre}</span>
                          <span className="shrink-0 font-bold text-neutral-800">{item.display}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {weekCostCop > 0 && (
              <div
                className="mt-5 flex items-center justify-between rounded-2xl px-5 py-3.5 text-white"
                style={{ background: "var(--hf-primary)" }}
              >
                <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide">
                  <ShoppingBasket size={14} /> Costo estimado {dias.length === 7 ? "de la semana" : `de ${dias.length} días`}
                </span>
                <span className="text-lg font-black">{formatCop(weekCostCop)}</span>
              </div>
            )}
          </section>
        )}

        <footer className="mt-10 flex items-center justify-between border-t border-neutral-100 pt-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/images/LogoHorizontal-trasnparente.png" alt="HakunnaFit" className="h-6 w-auto opacity-70" />
          <p className="text-[10px] text-neutral-400">
            Plan creado por {trainer.businessName} con tecnología HakunnaFit
          </p>
        </footer>
      </div>
    </div>
  );
}
