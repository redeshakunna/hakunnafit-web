"use server";

import { getSupabaseServerClient } from "./supabase-server";
import { getSupabaseAdmin } from "./supabase-admin";
import type { TrainerRow } from "./admin-actions";

export interface TrainerLoginResult {
  ok: boolean;
  error?: string;
}

/**
 * Login del panel de autoservicio del entrenador (correo + contraseña, sesión
 * real de Supabase Auth) — separado del login de Nando (admin-auth.ts), que
 * es una sola contraseña compartida sin usuarios individuales.
 */
export async function loginTrainer(formData: FormData): Promise<TrainerLoginResult> {
  const email = ((formData.get("email") as string) || "").trim();
  const password = (formData.get("password") as string) || "";
  if (!email || !password) return { ok: false, error: "Completa tu correo y contraseña." };

  const supabase = getSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: "Correo o contraseña incorrectos." };

  return { ok: true };
}

export async function logoutTrainer(): Promise<void> {
  const supabase = getSupabaseServerClient();
  await supabase.auth.signOut();
}

/**
 * Devuelve el entrenador autenticado en la sesión actual (o null si no hay
 * sesión). No lanza error — cada página decide si redirige a /panel/login.
 */
export async function getCurrentTrainer(): Promise<TrainerRow | null> {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // La fila de trainers puede tener campos sensibles (notas_internas) que no
  // debe ver el propio entrenador — se usa el cliente de servicio solo para
  // leer, nunca para saltarse el chequeo de que el id sea el del usuario
  // logueado.
  const admin = getSupabaseAdmin();
  const { data: trainer, error } = await admin.from("trainers").select("*").eq("id", user.id).maybeSingle();
  if (error || !trainer) return null;

  return trainer as TrainerRow;
}

export async function requireTrainer(): Promise<TrainerRow> {
  const trainer = await getCurrentTrainer();
  if (!trainer) throw new Error("No autenticado");
  return trainer;
}
