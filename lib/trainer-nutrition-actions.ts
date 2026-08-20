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
import type { NutritionDias } from "./nutrition-types";

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
