"use server";

// Autenticación real del cliente final — reemplaza el portal por token
// (/mi-progreso/[token], retirado) por una cuenta de verdad: el cliente
// entra desde la landing de su entrenador (/landing/[subdominio]/ingresar)
// escribiendo su número de documento.
//
// Flujo completo:
// 1. Escribe su documento. Si existe un cliente con ese documento para ESE
//    entrenador (checkClientDocument), y ya tiene cuenta (user_id), se le
//    pide su contraseña (loginClientWithPassword).
// 2. Si todavía no tiene cuenta (primera vez), se le envía un código de un
//    solo uso al correo que su entrenador ya tiene registrado
//    (sendClientAccessCode) — un documento no es un secreto, así que no basta
//    por sí solo para crear el acceso.
// 3. Con el código válido, define su contraseña (setClientPassword), que crea
//    (o actualiza, si ya existía) su usuario real de Supabase Auth y lo deja
//    logueado de una vez.
// "Olvidé mi contraseña" reusa exactamente el mismo paso 2 — no hace falta un
// flujo aparte, reenviar el código y dejar definir una contraseña nueva ya
// cubre el caso.

import { randomInt } from "crypto";
import { getSupabaseServerClient } from "./supabase-server";
import { getSupabaseAdmin } from "./supabase-admin";
import { sendLeadEmail, renderLeadEmail } from "./email";
import type { AdminActionResult } from "./admin-actions";
import type { ClientRow } from "./trainer-clients-actions";

const CODE_TTL_MINUTES = 15;

interface ResolvedClient {
  id: string;
  trainerId: string;
  trainerBusinessName: string;
  email: string | null;
  userId: string | null;
}

async function resolveClientByDocumento(subdominio: string, documento: string): Promise<ResolvedClient | null> {
  const doc = documento?.trim();
  if (!subdominio?.trim() || !doc) return null;

  const supabase = getSupabaseAdmin();
  const { data: trainer } = await supabase
    .from("trainers")
    .select("id, business_name")
    .eq("subdominio", subdominio.trim())
    .maybeSingle();
  if (!trainer) return null;

  const { data: client } = await supabase
    .from("clients")
    .select("id, trainer_id, email, user_id")
    .eq("trainer_id", trainer.id)
    .eq("documento", doc)
    .maybeSingle();
  if (!client) return null;

  return {
    id: client.id,
    trainerId: trainer.id,
    trainerBusinessName: trainer.business_name,
    email: client.email,
    userId: client.user_id,
  };
}

function generateAccessCode(): string {
  return String(randomInt(100000, 1000000));
}

// ---------------------------------------------------------------------------
// Paso 1 — verificar documento
// ---------------------------------------------------------------------------

export async function checkClientDocument(
  subdominio: string,
  documento: string
): Promise<{ ok: boolean; error?: string; hasAccount?: boolean }> {
  const resolved = await resolveClientByDocumento(subdominio, documento);
  if (!resolved) {
    return {
      ok: false,
      error: "No encontramos un cliente con ese documento. ¿Aún no eres cliente? Pídele a tu entrenador el link de registro.",
    };
  }
  return { ok: true, hasAccount: !!resolved.userId };
}

// ---------------------------------------------------------------------------
// Paso 2 — enviar código de un solo uso al correo ya registrado
// ---------------------------------------------------------------------------

export async function sendClientAccessCode(subdominio: string, documento: string): Promise<AdminActionResult> {
  const resolved = await resolveClientByDocumento(subdominio, documento);
  if (!resolved) return { ok: false, error: "No encontramos un cliente con ese documento." };
  if (!resolved.email) {
    return {
      ok: false,
      error: "Tu entrenador no tiene tu correo registrado. Pídele que lo agregue en tu ficha antes de crear tu acceso.",
    };
  }

  const code = generateAccessCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60_000);

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("clients")
    .update({ access_code: code, access_code_expires_at: expiresAt.toISOString() })
    .eq("id", resolved.id);
  if (error) return { ok: false, error: error.message };

  await sendLeadEmail({
    to: resolved.email,
    subject: `Tu código de acceso: ${code}`,
    html: renderLeadEmail({
      nombre: resolved.trainerBusinessName,
      title: `Tu código es ${code}`,
      message: `Úsalo para crear o restablecer tu contraseña en tu portal de ${resolved.trainerBusinessName}. Vence en ${CODE_TTL_MINUTES} minutos. Si no lo pediste tú, ignora este correo.`,
      color: "#00C8FF",
    }),
  }).catch(() => {});

  return { ok: true };
}

// ---------------------------------------------------------------------------
// Paso 3 — validar código y definir contraseña (crea o actualiza la cuenta)
// ---------------------------------------------------------------------------

export async function setClientPassword(
  subdominio: string,
  documento: string,
  code: string,
  newPassword: string
): Promise<AdminActionResult> {
  const resolved = await resolveClientByDocumento(subdominio, documento);
  if (!resolved) return { ok: false, error: "No encontramos un cliente con ese documento." };
  if (!newPassword || newPassword.length < 6) return { ok: false, error: "La contraseña debe tener al menos 6 caracteres." };
  if (!resolved.email) return { ok: false, error: "Tu entrenador no tiene tu correo registrado." };

  const supabase = getSupabaseAdmin();
  const { data: current } = await supabase
    .from("clients")
    .select("access_code, access_code_expires_at")
    .eq("id", resolved.id)
    .maybeSingle();

  if (!current?.access_code || current.access_code !== code.trim()) {
    return { ok: false, error: "Código incorrecto." };
  }
  if (current.access_code_expires_at && new Date(current.access_code_expires_at) < new Date()) {
    return { ok: false, error: "Ese código venció — pide uno nuevo." };
  }

  if (resolved.userId) {
    const { error } = await supabase.auth.admin.updateUserById(resolved.userId, { password: newPassword });
    if (error) return { ok: false, error: error.message };
  } else {
    const { data: created, error } = await supabase.auth.admin.createUser({
      email: resolved.email,
      password: newPassword,
      email_confirm: true,
    });
    if (error || !created.user) return { ok: false, error: error?.message ?? "No se pudo crear tu cuenta." };

    const { error: linkError } = await supabase.from("clients").update({ user_id: created.user.id }).eq("id", resolved.id);
    if (linkError) return { ok: false, error: linkError.message };
  }

  await supabase.from("clients").update({ access_code: null, access_code_expires_at: null }).eq("id", resolved.id);

  const client = getSupabaseServerClient();
  const { error: signInError } = await client.auth.signInWithPassword({ email: resolved.email, password: newPassword });
  if (signInError) return { ok: false, error: "Tu contraseña quedó guardada, pero no pudimos iniciar tu sesión. Intenta ingresar de nuevo." };

  return { ok: true };
}

// ---------------------------------------------------------------------------
// Login normal (cuenta ya activada)
// ---------------------------------------------------------------------------

export async function loginClientWithPassword(subdominio: string, documento: string, password: string): Promise<AdminActionResult> {
  const resolved = await resolveClientByDocumento(subdominio, documento);
  if (!resolved) return { ok: false, error: "No encontramos un cliente con ese documento." };
  if (!resolved.userId || !resolved.email) {
    return { ok: false, error: "Esta cuenta todavía no está activada — solicita tu código para crear tu contraseña." };
  }

  const client = getSupabaseServerClient();
  const { error } = await client.auth.signInWithPassword({ email: resolved.email, password });
  if (error) return { ok: false, error: "Contraseña incorrecta." };
  return { ok: true };
}

export async function logoutClient(): Promise<void> {
  const supabase = getSupabaseServerClient();
  await supabase.auth.signOut();
}

// ---------------------------------------------------------------------------
// Sesión — usado por /mi-cuenta y por lib/client-account-actions.ts
// ---------------------------------------------------------------------------

export async function getCurrentClient(): Promise<ClientRow | null> {
  const supabase = getSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = getSupabaseAdmin();
  const { data: client, error } = await admin.from("clients").select("*").eq("user_id", user.id).maybeSingle();
  if (error || !client) return null;
  return client as ClientRow;
}

export async function requireClient(): Promise<ClientRow> {
  const client = await getCurrentClient();
  if (!client) throw new Error("No autenticado");
  return client;
}
