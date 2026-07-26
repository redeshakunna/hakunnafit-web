"use server";

// Acciones de servidor del módulo Entrenamientos (/panel/entrenamientos) —
// CRUD real sobre weekly_plans, que existía en la base de datos desde una
// iteración anterior del esquema (con trainer_id y client_id ya listos para
// multi-tenant) pero nunca se le había dado forma ni pantalla. Fase Starter:
// 100% manual, sin generación por IA (eso es Pro, queda para una siguiente
// ronda) — el entrenador arma la rutina día por día desde cero o eligiendo
// ejercicios de la biblioteca compartida (exercises).

import { getSupabaseAdmin } from "./supabase-admin";
import { requireTrainer } from "./trainer-auth";
import type { AdminActionResult } from "./admin-actions";
import type { Json } from "./database.types";
import type { RoutineDias } from "./routine-types";

export type RoutineStatus = "pendiente" | "revisando" | "aprobado";

export interface RoutineRow {
  id: string;
  client_id: string;
  trainer_id: string;
  dias_por_semana: number;
  horario: string;
  resumen_frecuencia: string | null;
  nota_perfil: string | null;
  dias: RoutineDias;
  status: RoutineStatus;
  nota_aprobacion: string | null;
  created_at: string;
  approved_at: string | null;
}

export interface ExerciseRow {
  id: string;
  name: string;
  muscle_group: string;
  equipment: string;
  category: string;
  image_url: string | null;
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

async function assertOwnRoutine(routineId: string): Promise<string> {
  const trainer = await requireTrainer();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("weekly_plans").select("id, trainer_id").eq("id", routineId).maybeSingle();
  if (error || !data || data.trainer_id !== trainer.id) {
    throw new Error("Rutina no encontrada.");
  }
  return trainer.id;
}

/**
 * Biblioteca de ejercicios compartida (no pertenece a ningún entrenador) —
 * sembrada manualmente por ahora; hay un script de importación separado
 * (scripts/import-wger-exercises.mjs) para ampliarla desde una fuente
 * pública cuando quieran correrlo desde una máquina con salida a internet.
 */
export async function searchExercises(query?: string, muscleGroup?: string): Promise<ExerciseRow[]> {
  await requireTrainer();
  const supabase = getSupabaseAdmin();
  let q = supabase.from("exercises").select("id, name, muscle_group, equipment, category, image_url").eq("active", true);
  if (query?.trim()) q = q.ilike("name", `%${query.trim()}%`);
  if (muscleGroup) q = q.eq("muscle_group", muscleGroup);
  const { data, error } = await q.order("muscle_group").order("name").limit(200);
  if (error || !data) return [];
  return data as ExerciseRow[];
}

export async function getOwnClientRoutines(clientId: string): Promise<RoutineRow[]> {
  await assertOwnClient(clientId);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("weekly_plans")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return data as unknown as RoutineRow[];
}

export interface CreateRoutineInput {
  clientId: string;
  diasPorSemana: number;
  horario: string;
  resumenFrecuencia?: string | null;
  notaPerfil?: string | null;
  dias: RoutineDias;
}

export async function createOwnRoutine(input: CreateRoutineInput): Promise<AdminActionResult & { id?: string }> {
  const trainerId = await assertOwnClient(input.clientId);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("weekly_plans")
    .insert({
      client_id: input.clientId,
      trainer_id: trainerId,
      dias_por_semana: input.diasPorSemana,
      horario: input.horario,
      resumen_frecuencia: input.resumenFrecuencia || null,
      nota_perfil: input.notaPerfil || null,
      dias: input.dias as unknown as Json,
      status: "aprobado", // Starter: manual, se publica directo al crearla.
      approved_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "No se pudo crear la rutina." };

  await supabase
    .from("trainer_activity")
    .insert({ trainer_id: trainerId, type: "rutina_creada", title: "Nueva rutina creada" });

  return { ok: true, id: data.id };
}

export interface UpdateRoutineInput {
  diasPorSemana?: number;
  horario?: string;
  resumenFrecuencia?: string | null;
  notaPerfil?: string | null;
  dias?: RoutineDias;
  status?: RoutineStatus;
}

export async function updateOwnRoutine(routineId: string, input: UpdateRoutineInput): Promise<AdminActionResult> {
  await assertOwnRoutine(routineId);
  const supabase = getSupabaseAdmin();

  const update: {
    dias_por_semana?: number;
    horario?: string;
    resumen_frecuencia?: string | null;
    nota_perfil?: string | null;
    dias?: Json;
    status?: RoutineStatus;
  } = {};
  if (input.diasPorSemana !== undefined) update.dias_por_semana = input.diasPorSemana;
  if (input.horario !== undefined) update.horario = input.horario;
  if (input.resumenFrecuencia !== undefined) update.resumen_frecuencia = input.resumenFrecuencia || null;
  if (input.notaPerfil !== undefined) update.nota_perfil = input.notaPerfil || null;
  if (input.dias !== undefined) update.dias = input.dias as unknown as Json;
  if (input.status !== undefined) update.status = input.status;

  if (Object.keys(update).length === 0) return { ok: true };

  const { error } = await supabase.from("weekly_plans").update(update).eq("id", routineId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteOwnRoutine(routineId: string): Promise<AdminActionResult> {
  await assertOwnRoutine(routineId);
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("weekly_plans").delete().eq("id", routineId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
