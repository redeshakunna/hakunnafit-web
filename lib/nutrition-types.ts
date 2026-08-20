// Forma del jsonb "dias" en meal_plans — mismo patrón que routine-types.ts
// para las rutinas: un plan es un array de días (no necesariamente ligado a
// un día calendario), cada uno con sus comidas, y cada comida con una lista
// de alimentos elegidos de la biblioteca compartida (tabla alimentos) o
// escritos libres cuando el entrenador necesita algo que no está ahí.

export type MealSlot = "desayuno" | "media_manana" | "almuerzo" | "media_tarde" | "cena";

export interface MealItem {
  // Referencia a alimentos.id cuando el alimento viene de la biblioteca.
  alimentoId: string | null;
  // Nombre libre cuando el entrenador escribe algo que no está en la
  // biblioteca (o cuando alimentoId es null) — mismo patrón que
  // FuerzaBlock.nombreLibre en routine-types.ts.
  nombreLibre: string | null;
  // Multiplicador de la unidad_referencia del alimento (2 = el doble de esa
  // porción). Para alimentos con nombreLibre, es solo informativo.
  cantidad: number;
  notas: string | null;
}

export interface Meal {
  slot: MealSlot;
  items: MealItem[];
}

export interface NutritionDay {
  nombre: string;
  comidas: Meal[];
}

export type NutritionDias = NutritionDay[];

export const MEAL_SLOTS: { value: MealSlot; label: string }[] = [
  { value: "desayuno", label: "Desayuno" },
  { value: "media_manana", label: "Media mañana" },
  { value: "almuerzo", label: "Almuerzo" },
  { value: "media_tarde", label: "Media tarde" },
  { value: "cena", label: "Cena" },
];

export function emptyMealItem(): MealItem {
  return { alimentoId: null, nombreLibre: "", cantidad: 1, notas: null };
}

export function emptyMeal(slot: MealSlot): Meal {
  return { slot, items: [] };
}

// Solo incluye por defecto las 3 comidas principales — media_manana y
// media_tarde se agregan manualmente desde el editor si el plan las necesita,
// para no saturar de comidas vacías un plan de 3 tiempos.
export function emptyNutritionDay(index: number): NutritionDay {
  return {
    nombre: `Día ${index}`,
    comidas: (["desayuno", "almuerzo", "cena"] as MealSlot[]).map(emptyMeal),
  };
}

export const CATEGORIA_LABELS: Record<string, string> = {
  proteina: "Proteína",
  lacteo: "Lácteo",
  carbohidrato: "Carbohidrato",
  legumbre: "Legumbre",
  fruta: "Fruta",
  verdura: "Verdura",
  grasa: "Grasa saludable",
};

export const CATEGORIA_OPTIONS = Object.entries(CATEGORIA_LABELS).map(([value, label]) => ({ value, label }));

export const TIENDA_LABELS: Record<string, string> = {
  d1: "D1",
  ara: "Ara",
  exito: "Éxito",
  generico: "Genérico",
};

export const OBJETIVO_LABELS: Record<string, string> = {
  deficit: "Déficit calórico (bajar de peso)",
  mantenimiento: "Mantenimiento",
  superavit: "Superávit calórico (subir de peso)",
};

export const OBJETIVO_OPTIONS = Object.entries(OBJETIVO_LABELS).map(([value, label]) => ({ value, label }));

// ---------------------------------------------------------------------------
// Macros de un item/comida/día, calculados a partir de la biblioteca de
// alimentos — pura aritmética sobre datos reales, igual que lib/imc.ts (ver
// el comentario de ese archivo: esto es justo lo que después va a leer el
// prompt de HAKAI real para generar/ajustar planes, cuando exista).
// ---------------------------------------------------------------------------

export interface AlimentoLite {
  id: string;
  nombre: string;
  categoria: string;
  tiendas: string[];
  unidadReferencia: string;
  calorias: number;
  proteinaG: number;
  carbohidratosG: number;
  grasaG: number;
  precioCop: number | null;
}

export interface MacroTotals {
  calorias: number;
  proteinaG: number;
  carbohidratosG: number;
  grasaG: number;
  costoCop: number;
}

const EMPTY_TOTALS: MacroTotals = { calorias: 0, proteinaG: 0, carbohidratosG: 0, grasaG: 0, costoCop: 0 };

export function sumTotals(a: MacroTotals, b: MacroTotals): MacroTotals {
  return {
    calorias: a.calorias + b.calorias,
    proteinaG: a.proteinaG + b.proteinaG,
    carbohidratosG: a.carbohidratosG + b.carbohidratosG,
    grasaG: a.grasaG + b.grasaG,
    costoCop: a.costoCop + b.costoCop,
  };
}

export function itemTotals(item: MealItem, alimentosById: Map<string, AlimentoLite>): MacroTotals {
  if (!item.alimentoId) return EMPTY_TOTALS;
  const alimento = alimentosById.get(item.alimentoId);
  if (!alimento) return EMPTY_TOTALS;
  const cantidad = item.cantidad || 0;
  return {
    calorias: alimento.calorias * cantidad,
    proteinaG: alimento.proteinaG * cantidad,
    carbohidratosG: alimento.carbohidratosG * cantidad,
    grasaG: alimento.grasaG * cantidad,
    costoCop: (alimento.precioCop ?? 0) * cantidad,
  };
}

export function mealTotals(meal: Meal, alimentosById: Map<string, AlimentoLite>): MacroTotals {
  return meal.items.reduce((acc, item) => sumTotals(acc, itemTotals(item, alimentosById)), EMPTY_TOTALS);
}

export function dayTotals(day: NutritionDay, alimentosById: Map<string, AlimentoLite>): MacroTotals {
  return day.comidas.reduce((acc, meal) => sumTotals(acc, mealTotals(meal, alimentosById)), EMPTY_TOTALS);
}

// Promedio diario del plan completo — se usa "días con al menos una comida
// con contenido" en vez de todos los días guardados, así un día vacío que el
// entrenador todavía no llenó no diluye el promedio hacia abajo.
export function planAverageDayTotals(dias: NutritionDias, alimentosById: Map<string, AlimentoLite>): MacroTotals {
  const withContent = dias.filter((d) => d.comidas.some((m) => m.items.length > 0));
  if (withContent.length === 0) return EMPTY_TOTALS;
  const total = withContent.reduce((acc, d) => sumTotals(acc, dayTotals(d, alimentosById)), EMPTY_TOTALS);
  const n = withContent.length;
  return {
    calorias: total.calorias / n,
    proteinaG: total.proteinaG / n,
    carbohidratosG: total.carbohidratosG / n,
    grasaG: total.grasaG / n,
    costoCop: total.costoCop / n,
  };
}

// ---------------------------------------------------------------------------
// Estimación de calorías/macros objetivo por cliente — regla simple sobre
// datos reales (peso + nivel de actividad + objetivo), no IA todavía. Mismo
// criterio que lib/imc.ts: cálculo determinístico, sin modelo, con margen
// para que HAKAI real lo reemplace después leyendo estos mismos datos.
// Los factores kcal/kg son los que se usan típicamente en coaching
// (rango 26-38 kcal/kg según actividad), no una fórmula médica exacta — por
// eso el resultado se rotula siempre como "estimado" en la UI.
// ---------------------------------------------------------------------------

const KCAL_POR_KG_SEGUN_ACTIVIDAD: Record<string, number> = {
  sedentario: 26,
  ligero: 28,
  moderado: 31,
  activo: 34,
  muy_activo: 38,
};

export interface MacroTarget {
  calorias: number;
  proteinaG: number;
  carbohidratosG: number;
  grasaG: number;
}

export function estimateMacroTarget(
  pesoKg: number | null | undefined,
  actividad: string | null | undefined,
  objetivo: string | null | undefined
): MacroTarget | null {
  if (!pesoKg || pesoKg <= 0) return null;
  const kcalPorKg = KCAL_POR_KG_SEGUN_ACTIVIDAD[actividad ?? ""] ?? KCAL_POR_KG_SEGUN_ACTIVIDAD.moderado;
  let calorias = pesoKg * kcalPorKg;
  if (objetivo === "deficit") calorias *= 0.8;
  if (objetivo === "superavit") calorias *= 1.15;

  const proteinaG = pesoKg * 1.8;
  const grasaG = pesoKg * 0.8;
  const caloriasRestantes = Math.max(calorias - proteinaG * 4 - grasaG * 9, 0);
  const carbohidratosG = caloriasRestantes / 4;

  return {
    calorias: Math.round(calorias),
    proteinaG: Math.round(proteinaG),
    carbohidratosG: Math.round(carbohidratosG),
    grasaG: Math.round(grasaG),
  };
}
