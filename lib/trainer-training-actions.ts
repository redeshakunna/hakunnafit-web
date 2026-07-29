"use server";

// Check-off real de entrenamientos completados (training_logs) — la pieza
// que faltaba para poder mostrar "racha" y "alertas de inactividad" con
// datos reales en vez de simulados (ver lib/training-stats.ts para las
// fórmulas). Fase 1 del roadmap: un registro por cliente por día, sin
// vincularse todavía a una cita de Agenda — cuando se construya la Agenda
// (Fase 2) estos logs son la base para marcar asistencia a una sesión
// puntual, agregando ahí un session_id opcional sin romper lo que hay acá.

import { getSupabaseAdmin } from "./supabase-admin";
import { requireTrainer } from "./trainer-auth";
import type { AdminActionResult } from "./admin-actions";

export interface TrainingLogRow {
  id: string;
  client_id: string;
  trainer_id: string;
  fecha: string;
  notas: string | null;
  created_at: string;
}

async function assertOwnClient(clientId: string): Promise<{ trainerId: string }> {
  const trainer = await requireTrainer();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("clients").select("id, trainer_id").eq("id", clientId).maybeSingle();
  if (error || !data || data.trainer_id !== trainer.id) {
    throw new Error("Cliente no encontrado.");
  }
  return { trainerId: trainer.id };
}

/**
 * Registra que el cliente entrenó en una fecha (hoy por defecto). Un
 * cliente solo puede tener un registro por día (índice único en la tabla)
 * — si el entrenador hace doble clic o ya lo había marcado, no falla, solo
 * confirma que ya estaba registrado.
 */
export async function registerOwnTrainingLog(
  clientId: string,
  fecha?: string,
  notas?: string | null
): Promise<AdminActionResult> {
  const { trainerId } = await assertOwnClient(clientId);
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("training_logs")
    .upsert(
      { client_id: clientId, trainer_id: trainerId, fecha: fecha || new Date().toISOString().slice(0, 10), notas: notas || null },
      { onConflict: "client_id,fecha" }
    );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteOwnTrainingLog(logId: string): Promise<AdminActionResult> {
  await requireTrainer();
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("training_logs").delete().eq("id", logId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function getOwnClientTrainingLogs(clientId: string, limit = 90): Promise<TrainingLogRow[]> {
  await assertOwnClient(clientId);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("training_logs")
    .select("*")
    .eq("client_id", clientId)
    .order("fecha", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data as TrainingLogRow[];
}

/**
 * Última fecha de entrenamiento por cliente, en un solo query — alimenta la
 * alerta de inactividad en la lista de Clientes sin pedir un log por
 * cliente por separado.
 */
export async function getOwnLastTrainingByClient(): Promise<Record<string, string>> {
  const trainer = await requireTrainer();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("training_logs")
    .select("client_id, fecha")
    .eq("trainer_id", trainer.id)
    .order("fecha", { ascending: false });
  if (error || !data) return {};
  const map: Record<string, string> = {};
  for (const row of data) {
    if (!map[row.client_id]) map[row.client_id] = row.fecha;
  }
  return map;
}
