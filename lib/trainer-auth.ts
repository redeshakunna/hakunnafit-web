"use server";

import { getSupabaseServerClient } from "./supabase-server";
import { getSupabaseAdmin } from "./supabase-admin";
import type { TrainerRow } from "./admin-actions";

/**
 * Intenta iniciar sesión de Supabase Auth con correo + contraseña — usado
 * por la pantalla única de login (lib/unified-login-actions.ts) para probar
 * si las credenciales corresponden a un entrenador. Si signInWithPassword
 * tiene éxito, la sesión ya queda seteada (cookie de Supabase); si falla, no
 * deja ningún rastro, así que el mismo formulario puede seguir intentando
 * con el otro tipo de cuenta (super-admin) sin efectos secundarios.
 */
export async function verifyTrainerCredentials(email: string, password: string): Promise<boolean> {
  if (!email || !password) return false;
  const supabase = getSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return !error;
}

export async function logoutTrainer(): Promise<void> {
  const supabase = getSupabaseServerClient();
  await supabase.auth.signOut();
}

/**
 * "¿Olvidaste tu contraseña?" — dispara el correo de recuperación de
 * Supabase Auth (mismo mecanismo que ya se usaba para el primer "crea tu
 * contraseña" al activar un entrenador, ver admin-actions.ts). El link del
 * correo cae en /auth/callback, que intercambia el code por una sesión real
 * y manda a /panel/set-password para definir la nueva contraseña.
 *
 * Siempre devuelve ok:true, exista o no ese correo — resetPasswordForEmail
 * de Supabase ya se comporta así (no revela si una cuenta existe), y
 * replicamos el mismo criterio en el mensaje que ve el entrenador.
 */
export async function requestTrainerPasswordReset(email: string): Promise<{ ok: boolean }> {
  const trimmed = email.trim();
  if (!trimmed) return { ok: false };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://hakunnafit.com";
  const supabase = getSupabaseServerClient();
  await supabase.auth.resetPasswordForEmail(trimmed, {
    redirectTo: `${siteUrl}/auth/callback?next=/panel/set-password`,
  });

  return { ok: true };
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
