"use server";

// Acciones de servidor para conectar/desconectar Google Calendar — tanto del
// lado del entrenador (sesión real, /panel/agenda) como del lado del cliente
// final (sin sesión, mediante un link de un solo uso /agenda/conectar/[token]
// — mismo patrón que onboarding_token en hakunnafit_leads, ver
// admin-actions.ts). El intercambio real de código OAuth ocurre en
// app/api/google-calendar/callback/route.ts; este archivo arma los links de
// inicio y resuelve las sesiones de token del lado del cliente.

import { randomBytes } from "crypto";
import { getSupabaseAdmin } from "./supabase-admin";
import { requireTrainer } from "./trainer-auth";
import type { AdminActionResult } from "./admin-actions";
import { buildGoogleAuthUrl, signOAuthState, getConnection, deleteConnection, isGoogleCalendarConfigured } from "./google-calendar";

const CONNECT_TOKEN_TTL_DAYS = 30;

function generateConnectToken(): string {
  return randomBytes(18).toString("base64url").slice(0, 24);
}

// isGoogleCalendarConfigured() es una función síncrona (no async) — no puede
// re-exportarse desde este archivo "use server" (Next.js exige que todo
// export de un archivo "use server" sea una función async). Quien la
// necesite debe importarla directo de ./google-calendar.

// ---------------------------------------------------------------------------
// Entrenador
// ---------------------------------------------------------------------------

export async function getOwnGoogleConnection(): Promise<{ connected: boolean; googleEmail: string | null }> {
  const trainer = await requireTrainer();
  const connection = await getConnection("trainer", trainer.id);
  return { connected: Boolean(connection), googleEmail: connection?.google_email ?? null };
}

export async function beginTrainerGoogleConnect(): Promise<{ ok: boolean; url?: string; error?: string }> {
  if (!isGoogleCalendarConfigured()) {
    return { ok: false, error: "Google Calendar todavía no está configurado en el servidor." };
  }
  const trainer = await requireTrainer();
  const state = signOAuthState("trainer", trainer.id, "/panel/agenda");
  return { ok: true, url: buildGoogleAuthUrl(state) };
}

export async function disconnectOwnGoogleCalendar(): Promise<AdminActionResult> {
  const trainer = await requireTrainer();
  await deleteConnection("trainer", trainer.id);
  return { ok: true };
}

/**
 * Genera (o renueva) el link de conexión para un cliente puntual — el
 * entrenador lo copia o lo manda por WhatsApp desde /panel/clientes o
 * /panel/agenda. El token es de un solo propósito: solo sirve para conectar
 * Google, no para ver ni editar nada más del cliente.
 */
export async function generateClientCalendarConnectLink(clientId: string): Promise<AdminActionResult & { url?: string }> {
  const trainer = await requireTrainer();
  const supabase = getSupabaseAdmin();
  const { data: client, error: findError } = await supabase
    .from("clients")
    .select("id, trainer_id")
    .eq("id", clientId)
    .maybeSingle();
  if (findError || !client || client.trainer_id !== trainer.id) {
    return { ok: false, error: "Cliente no encontrado." };
  }

  const token = generateConnectToken();
  const expiresAt = new Date(Date.now() + CONNECT_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);
  const { error } = await supabase
    .from("clients")
    .update({ calendar_connect_token: token, calendar_connect_token_expires_at: expiresAt.toISOString() })
    .eq("id", clientId);
  if (error) return { ok: false, error: error.message };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://hakunnafit.com";
  return { ok: true, url: `${siteUrl}/agenda/conectar/${token}` };
}

// ---------------------------------------------------------------------------
// Cliente final (sin sesión — validado por token)
// ---------------------------------------------------------------------------

export interface ClientCalendarConnectSession {
  clientId: string;
  clientName: string;
  trainerBusinessName: string;
  connected: boolean;
  googleEmail: string | null;
}

export async function getClientCalendarConnectSession(token: string): Promise<ClientCalendarConnectSession | null> {
  if (!token?.trim()) return null;
  const supabase = getSupabaseAdmin();
  const { data: client, error } = await supabase
    .from("clients")
    .select("id, full_name, trainer_id, calendar_connect_token_expires_at")
    .eq("calendar_connect_token", token)
    .maybeSingle();
  if (error || !client) return null;
  if (client.calendar_connect_token_expires_at && new Date(client.calendar_connect_token_expires_at) < new Date()) {
    return null;
  }

  const { data: trainer } = await supabase.from("trainers").select("business_name").eq("id", client.trainer_id).maybeSingle();
  const connection = await getConnection("client", client.id);

  return {
    clientId: client.id,
    clientName: client.full_name,
    trainerBusinessName: trainer?.business_name ?? "tu entrenador",
    connected: Boolean(connection),
    googleEmail: connection?.google_email ?? null,
  };
}

export async function beginClientGoogleConnect(token: string): Promise<{ ok: boolean; url?: string; error?: string }> {
  if (!isGoogleCalendarConfigured()) {
    return { ok: false, error: "Google Calendar todavía no está configurado." };
  }
  const session = await getClientCalendarConnectSession(token);
  if (!session) return { ok: false, error: "Este link ya no es válido. Pídele a tu entrenador uno nuevo." };

  const state = signOAuthState("client", session.clientId, `/agenda/conectar/${token}`);
  return { ok: true, url: buildGoogleAuthUrl(state) };
}

export async function disconnectClientGoogleCalendar(token: string): Promise<AdminActionResult> {
  const session = await getClientCalendarConnectSession(token);
  if (!session) return { ok: false, error: "Este link ya no es válido." };
  await deleteConnection("client", session.clientId);
  return { ok: true };
}
