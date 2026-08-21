"use server";

// Acciones de servidor del módulo Nutrición (/panel/nutricion) — CRUD real
// sobre meal_plans + la biblioteca compartida alimentos, mismo patrón exacto
// que trainer-routines-actions.ts (Entrenamientos). Solo visible para planes
// Pro/Elite (hasFeature("Nutrición") en admin-helpers.ts / catalog.ts) — la
// página en sí ya bloquea el acceso, esto asume que quien llama ya pasó ese
// filtro, igual que el resto de módulos por plan.

import { getSupabaseAdmin } from "./supabase-admin";
import { requireTrainer } from "./trainer-auth";
import type { AdminActionResult } from "./admin-actions";
import type { Json } from "./database.types";
import {
  MEAL_SLOTS,
  OBJETIVO_LABELS,
  CATEGORIA_LABELS,
  estimateMacroTarget,
  type NutritionDias,
  type NutritionDay,
  type Meal,
  type MealItem,
  type MealSlot,
} from "./nutrition-types";

export type MealPlanStatus = "pendiente" | "revisando" | "aprobado";

export interface MealPlanRow {
  id: string;
  client_id: string;
  trainer_id: string;
  comidas_por_dia: number;
  objetivo: string | null;
  nota_perfil: string | null;
  dias: NutritionDias;
  status: MealPlanStatus;
  nota_aprobacion: string | null;
  created_at: string;
  approved_at: string | null;
}

export interface AlimentoRow {
  id: string;
  nombre: string;
  categoria: string;
  tiendas: string[];
  unidad_referencia: string;
  calorias: number;
  proteina_g: number;
  carbohidratos_g: number;
  grasa_g: number;
  precio_cop: number | null;
}

async function assertOwnClient(clientId: string): Promise<string> {
  const trainer = await requireTrainer();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("clients").select("id, trainer_id").eq("id", clientId).maybeSingle();
  if (error || !data || data.trainer_id !== trainer.id) {
    throw new Error("Cliente no encontrado.");
  }
  return trainer.id;
}

async function assertOwnMealPlan(mealPlanId: string): Promise<string> {
  const trainer = await requireTrainer();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("meal_plans").select("id, trainer_id").eq("id", mealPlanId).maybeSingle();
  if (error || !data || data.trainer_id !== trainer.id) {
    throw new Error("Plan de alimentación no encontrado.");
  }
  return trainer.id;
}

/**
 * Biblioteca de alimentos compartida (no pertenece a ningún entrenador) —
 * sembrada con productos reales de D1/Ara/Éxito y precio aproximado. Mismo
 * patrón que searchExercises en trainer-routines-actions.ts.
 */
export async function searchAlimentos(query?: string, categoria?: string): Promise<AlimentoRow[]> {
  await requireTrainer();
  const supabase = getSupabaseAdmin();
  let q = supabase
    .from("alimentos")
    .select("id, nombre, categoria, tiendas, unidad_referencia, calorias, proteina_g, carbohidratos_g, grasa_g, precio_cop")
    .eq("active", true);
  if (query?.trim()) q = q.ilike("nombre", `%${query.trim()}%`);
  if (categoria) q = q.eq("categoria", categoria);
  const { data, error } = await q.order("categoria").order("nombre").limit(200);
  if (error || !data) return [];
  return data as AlimentoRow[];
}

export async function getAlimentosByIds(ids: string[]): Promise<AlimentoRow[]> {
  await requireTrainer();
  if (ids.length === 0) return [];
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("alimentos")
    .select("id, nombre, categoria, tiendas, unidad_referencia, calorias, proteina_g, carbohidratos_g, grasa_g, precio_cop")
    .in("id", ids);
  if (error || !data) return [];
  return data as AlimentoRow[];
}

export async function getOwnClientIdsWithMealPlan(): Promise<string[]> {
  const trainer = await requireTrainer();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("meal_plans").select("client_id").eq("trainer_id", trainer.id);
  if (error || !data) return [];
  return Array.from(new Set(data.map((r) => r.client_id as string)));
}

export async function getOwnClientMealPlans(clientId: string): Promise<MealPlanRow[]> {
  await assertOwnClient(clientId);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("meal_plans")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data as unknown as MealPlanRow[];
}

export interface CreateMealPlanInput {
  clientId: string;
  comidasPorDia: number;
  objetivo?: string | null;
  notaPerfil?: string | null;
  dias: NutritionDias;
}

export async function createOwnMealPlan(input: CreateMealPlanInput): Promise<AdminActionResult & { id?: string }> {
  const trainerId = await assertOwnClient(input.clientId);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("meal_plans")
    .insert({
      client_id: input.clientId,
      trainer_id: trainerId,
      comidas_por_dia: input.comidasPorDia,
      objetivo: input.objetivo || null,
      nota_perfil: input.notaPerfil || null,
      dias: input.dias as unknown as Json,
      status: "aprobado", // Igual que rutinas: manual, se publica directo al crearlo.
      approved_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "No se pudo crear el plan de alimentación." };

  await supabase
    .from("trainer_activity")
    .insert({ trainer_id: trainerId, type: "plan_nutricion_creado", title: "Nuevo plan de alimentación creado" });

  return { ok: true, id: data.id };
}

export interface UpdateMealPlanInput {
  comidasPorDia?: number;
  objetivo?: string | null;
  notaPerfil?: string | null;
  dias?: NutritionDias;
  status?: MealPlanStatus;
}

export async function updateOwnMealPlan(mealPlanId: string, input: UpdateMealPlanInput): Promise<AdminActionResult> {
  await assertOwnMealPlan(mealPlanId);
  const supabase = getSupabaseAdmin();

  const update: {
    comidas_por_dia?: number;
    objetivo?: string | null;
    nota_perfil?: string | null;
    dias?: Json;
    status?: MealPlanStatus;
  } = {};
  if (input.comidasPorDia !== undefined) update.comidas_por_dia = input.comidasPorDia;
  if (input.objetivo !== undefined) update.objetivo = input.objetivo || null;
  if (input.notaPerfil !== undefined) update.nota_perfil = input.notaPerfil || null;
  if (input.dias !== undefined) update.dias = input.dias as unknown as Json;
  if (input.status !== undefined) update.status = input.status;

  if (Object.keys(update).length === 0) return { ok: true };

  const { error } = await supabase.from("meal_plans").update(update).eq("id", mealPlanId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteOwnMealPlan(mealPlanId: string): Promise<AdminActionResult> {
  await assertOwnMealPlan(mealPlanId);
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("meal_plans").delete().eq("id", mealPlanId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Generación asistida del plan — dos caminos que el entrenador elige al
// crear un plan nuevo (ver TrainerNutritionManager):
//
// 1. "Plantilla" (generateOwnMealPlanTemplate): reglas simples sobre datos
//    reales, sin llamar a ningún modelo — mismo espíritu que
//    estimateMacroTarget/lib/imc.ts. Gratis e instantáneo, cubre 3 días.
// 2. "HAKAI" (generateOwnMealPlanWithAI): llamada real a Claude (mismo
//    patrón de fetch crudo que app/api/chat/route.ts, sin SDK nuevo),
//    forzada a responder por tool-use con el shape exacto de NutritionDias.
//    Cubre 7 días. Nunca confía ciegamente en la respuesta del modelo: todo
//    alimentoId que no exista en la biblioteca filtrada se descarta.
//
// En ambos casos el resultado solo pre-llena el editor (MealPlanEditorScreen)
// — el entrenador siempre revisa/ajusta y guarda explícitamente, nunca se
// publica solo.
// ---------------------------------------------------------------------------

const TEMPLATE_NUM_DIAS = 3;

function slotsForCount(n: number): MealSlot[] {
  if (n <= 3) return ["desayuno", "almuerzo", "cena"];
  if (n === 4) return ["desayuno", "almuerzo", "media_tarde", "cena"];
  return ["desayuno", "media_manana", "almuerzo", "media_tarde", "cena"];
}

const SLOT_CATEGORY_PLAN: Record<MealSlot, string[]> = {
  desayuno: ["lacteo", "carbohidrato", "fruta"],
  media_manana: ["fruta"],
  almuerzo: ["proteina", "carbohidrato", "verdura"],
  media_tarde: ["lacteo"],
  cena: ["proteina", "verdura"],
};

function cantidadPorObjetivo(objetivo: string | null | undefined): number {
  if (objetivo === "deficit") return 0.85;
  if (objetivo === "superavit") return 1.3;
  return 1;
}

/** Reparte alimentos de la biblioteca entre comidas/días rotando por
 * categoría — nunca inventa alimentos, solo elige de lo que ya existe. */
function buildRuleBasedDias(
  alimentos: AlimentoRow[],
  numDias: number,
  comidasPorDia: number,
  objetivo: string | null | undefined
): NutritionDias {
  const byCategoria = new Map<string, AlimentoRow[]>();
  for (const a of alimentos) {
    const list = byCategoria.get(a.categoria) ?? [];
    list.push(a);
    byCategoria.set(a.categoria, list);
  }

  const slots = slotsForCount(comidasPorDia);
  const cantidad = cantidadPorObjetivo(objetivo);
  const dias: NutritionDias = [];

  for (let d = 0; d < numDias; d++) {
    const comidas: Meal[] = slots.map((slot, slotIdx): Meal => {
      const categorias = SLOT_CATEGORY_PLAN[slot];
      const items: MealItem[] = categorias
        .map((categoria, catIdx): MealItem | null => {
          const list = byCategoria.get(categoria);
          if (!list || list.length === 0) return null;
          const pick = list[(d + slotIdx + catIdx) % list.length];
          return { alimentoId: pick.id, nombreLibre: null, cantidad, notas: null };
        })
        .filter((item): item is MealItem => item !== null);
      return { slot, items };
    });
    const nombre: NutritionDay["nombre"] = `Día ${d + 1}`;
    dias.push({ nombre, comidas });
  }

  return dias;
}

async function loadAlimentosForTiendas(tiendas: string[]): Promise<AlimentoRow[] | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("alimentos")
    .select("id, nombre, categoria, tiendas, unidad_referencia, calorias, proteina_g, carbohidratos_g, grasa_g, precio_cop")
    .eq("active", true);
  if (error || !data) return null;
  const filtered = (data as unknown as AlimentoRow[]).filter(
    (a) => tiendas.length === 0 || a.tiendas.some((t) => tiendas.includes(t))
  );
  return filtered;
}

export interface GenerateMealPlanTemplateInput {
  clientId: string;
  objetivo: string;
  comidasPorDia: number;
  tiendas: string[];
}

export async function generateOwnMealPlanTemplate(
  input: GenerateMealPlanTemplateInput
): Promise<AdminActionResult & { dias?: NutritionDias }> {
  await assertOwnClient(input.clientId);
  const filtered = await loadAlimentosForTiendas(input.tiendas);
  if (!filtered) return { ok: false, error: "No se pudo cargar la biblioteca de alimentos." };
  if (filtered.length === 0) return { ok: false, error: "No hay alimentos disponibles para las tiendas seleccionadas." };
  const dias = buildRuleBasedDias(filtered, TEMPLATE_NUM_DIAS, input.comidasPorDia, input.objetivo);
  return { ok: true, dias };
}

const AI_NUM_DIAS = 7;

export interface GenerateMealPlanAIInput {
  clientId: string;
  objetivo: string;
  comidasPorDia: number;
  tiendas: string[];
  restricciones?: string | null;
  presupuestoSemanalCop?: number | null;
}

export async function generateOwnMealPlanWithAI(
  input: GenerateMealPlanAIInput
): Promise<AdminActionResult & { dias?: NutritionDias }> {
  await assertOwnClient(input.clientId);
  const supabase = getSupabaseAdmin();

  const { data: clientRow } = await supabase
    .from("clients")
    .select("peso_actual, actividad")
    .eq("id", input.clientId)
    .maybeSingle();
  const target = estimateMacroTarget(clientRow?.peso_actual ?? null, clientRow?.actividad ?? null, input.objetivo);

  const filtered = await loadAlimentosForTiendas(input.tiendas);
  if (!filtered) return { ok: false, error: "No se pudo cargar la biblioteca de alimentos." };
  if (filtered.length === 0) return { ok: false, error: "No hay alimentos disponibles para las tiendas seleccionadas." };
  const allowedIds = new Set(filtered.map((a) => a.id));

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { ok: false, error: "HAKAI no está configurado todavía (falta ANTHROPIC_API_KEY)." };

  const libraryLines = filtered
    .map(
      (a) =>
        `${a.id} | ${a.nombre} | ${CATEGORIA_LABELS[a.categoria] ?? a.categoria} | porción: ${a.unidad_referencia} | ${a.calorias} kcal, ${a.proteina_g}g prot, ${a.carbohidratos_g}g carb, ${a.grasa_g}g grasa${
          a.precio_cop != null ? ` | ~$${a.precio_cop} COP/porción` : ""
        }`
    )
    .join("\n");

  const slotValues = MEAL_SLOTS.map((s) => s.value).join(", ");

  const systemPrompt = `Eres HAKAI, el asistente de nutrición de HakunnaFit. Armas planes de alimentación de ${AI_NUM_DIAS} días para clientes de entrenadores personales colombianos, usando EXCLUSIVAMENTE alimentos de la biblioteca que se te entrega a continuación (nunca inventes alimentos ni ids que no estén en esa lista). Cada día debe tener exactamente ${input.comidasPorDia} comidas, usando únicamente estos slots: ${slotValues}. Varía los alimentos entre los distintos días para que el plan no sea repetitivo. Responde exclusivamente llamando a la herramienta "generar_plan_alimentacion".`;

  const userPrompt = [
    `Objetivo del cliente: ${OBJETIVO_LABELS[input.objetivo] ?? input.objetivo}.`,
    target
      ? `Meta diaria aproximada: ${target.calorias} kcal, ${target.proteinaG}g proteína, ${target.carbohidratosG}g carbohidratos, ${target.grasaG}g grasa.`
      : null,
    input.restricciones?.trim() ? `Restricciones/alergias/alimentos que no le gustan: ${input.restricciones.trim()}.` : null,
    input.presupuestoSemanalCop
      ? `Presupuesto semanal máximo aproximado: $${input.presupuestoSemanalCop} COP — prioriza alimentos de menor precio para no pasarte de este monto.`
      : null,
    "",
    "Biblioteca de alimentos disponible (id | nombre | categoría | porción de referencia | macros | precio aprox.):",
    libraryLines,
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");

  const tool = {
    name: "generar_plan_alimentacion",
    description: "Entrega el plan de alimentación generado, día por día.",
    input_schema: {
      type: "object",
      properties: {
        dias: {
          type: "array",
          items: {
            type: "object",
            properties: {
              nombre: { type: "string" },
              comidas: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    slot: { type: "string", enum: MEAL_SLOTS.map((s) => s.value) },
                    items: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          alimentoId: { type: "string", description: "Debe ser exactamente uno de los ids de la biblioteca provista." },
                          cantidad: { type: "number", description: "Múltiplo de la porción de referencia, ej. 1, 1.5, 2." },
                        },
                        required: ["alimentoId", "cantidad"],
                      },
                    },
                  },
                  required: ["slot", "items"],
                },
              },
            },
            required: ["nombre", "comidas"],
          },
        },
      },
      required: ["dias"],
    },
  };

  let upstream: Response;
  try {
    upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4000,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
        tools: [tool],
        tool_choice: { type: "tool", name: "generar_plan_alimentacion" },
      }),
    });
  } catch (err) {
    console.error("HAKAI nutrición — error de red llamando a Anthropic:", err);
    return { ok: false, error: "No se pudo contactar a HAKAI. Intenta de nuevo." };
  }

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => "");
    console.error("HAKAI nutrición — error Anthropic:", upstream.status, detail);
    return { ok: false, error: "HAKAI no pudo generar el plan en este momento. Intenta de nuevo." };
  }

  const data = await upstream.json();
  const toolUse = (data?.content as { type: string; input?: unknown }[] | undefined)?.find((b) => b.type === "tool_use");
  const rawDias = (toolUse?.input as { dias?: unknown } | undefined)?.dias;
  if (!Array.isArray(rawDias)) {
    return { ok: false, error: "HAKAI no devolvió un plan válido. Intenta de nuevo." };
  }

  // Validación defensiva: nunca confiar ciegamente en lo que devuelve el
  // modelo. Todo alimentoId que no exista en la biblioteca filtrada se
  // descarta, la cantidad se acota a un rango razonable, y cualquier slot
  // desconocido cae a "almuerzo" en vez de romper el plan completo.
  const dias: NutritionDias = rawDias
    .filter((d): d is { nombre?: unknown; comidas?: unknown } => typeof d === "object" && d !== null)
    .map((d, i) => {
      const comidasRaw = Array.isArray(d.comidas) ? d.comidas : [];
      const comidas: Meal[] = comidasRaw
        .filter((m: unknown): m is { slot?: unknown; items?: unknown } => typeof m === "object" && m !== null)
        .map((m: { slot?: unknown; items?: unknown }): Meal => {
          const slot: MealSlot = MEAL_SLOTS.some((s) => s.value === m.slot) ? (m.slot as MealSlot) : "almuerzo";
          const itemsRaw = Array.isArray(m.items) ? m.items : [];
          const items: MealItem[] = itemsRaw
            .filter((it: unknown): it is { alimentoId?: unknown; cantidad?: unknown } => typeof it === "object" && it !== null)
            .filter((it) => typeof it.alimentoId === "string" && allowedIds.has(it.alimentoId))
            .map(
              (it): MealItem => ({
                alimentoId: it.alimentoId as string,
                nombreLibre: null,
                cantidad: Math.min(6, Math.max(0.25, Number(it.cantidad) || 1)),
                notas: null,
              })
            );
          return { slot, items };
        });
      const nombre: NutritionDay["nombre"] = typeof d.nombre === "string" && d.nombre.trim() ? d.nombre.trim() : `Día ${i + 1}`;
      return { nombre, comidas };
    });

  if (dias.every((d) => d.comidas.every((m) => m.items.length === 0))) {
    return { ok: false, error: "HAKAI no pudo armar un plan con los alimentos disponibles. Intenta con otras tiendas." };
  }

  return { ok: true, dias };
}
