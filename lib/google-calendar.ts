// Integración con Google Calendar — llamadas REST directas (fetch) a los
// endpoints de OAuth2 y de la API de Calendar, sin el SDK oficial
// "googleapis" (es un paquete pesado y solo necesitamos 4-5 endpoints). Sigue
// el mismo estilo que lib/email.ts (Resend) y el webhook de Wompi: fetch
// puro, nunca lanza si falta configuración, deja que quien llama decida qué
// hacer si Google no está conectado.
//
// Dos tipos de "dueño" pueden conectar su Google (ver
// google_calendar_connections en la base de datos): el entrenador (desde
// /panel/agenda) y cada cliente final (desde un link de un solo uso
// /agenda/conectar/[token], porque los clientes todavía no tienen portal
// propio). Ambos usan las mismas credenciales de OAuth (un solo proyecto de
// Google Cloud), solo cambia a quién queda asociada la conexión.

import { createHmac, timingSafeEqual } from "crypto";
import { getSupabaseAdmin } from "./supabase-admin";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";
const GOOGLE_CALENDAR_EVENTS_URL = "https://www.googleapis.com/calendar/v3/calendars";

// calendar.events: crear/editar/borrar eventos puntuales — no pedimos acceso
// de lectura a todo el calendario (calendar.readonly/calendar) porque no lo
// necesitamos y es un scope más sensible ante la revisión de Google.
const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
].join(" ");

export type OwnerType = "trainer" | "client";

export function isGoogleCalendarConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_OAUTH_REDIRECT_URI);
}

function stateSecret(): string {
  // Reusa ADMIN_SESSION_SECRET (ya exigido para /panel-hakunna) en vez de
  // pedir un secreto nuevo solo para firmar el "state" del OAuth — su único
  // trabajo acá es evitar que alguien arme un callback falso con un
  // owner_id ajeno, no protege nada más sensible que eso.
  return process.env.ADMIN_SESSION_SECRET || "hakunnafit-google-oauth-fallback-secret";
}

/**
 * Firma un "state" con HMAC para el flujo de OAuth — sin esto, cualquiera
 * podría llamar al callback con un owner_id inventado y robarse la conexión
 * de calendario de otro entrenador/cliente.
 */
export function signOAuthState(ownerType: OwnerType, ownerId: string, returnTo: string): string {
  const payload = JSON.stringify({ ownerType, ownerId, returnTo });
  const encoded = Buffer.from(payload, "utf-8").toString("base64url");
  const signature = createHmac("sha256", stateSecret()).update(encoded).digest("base64url");
  return `${encoded}.${signature}`;
}

export function verifyOAuthState(state: string): { ownerType: OwnerType; ownerId: string; returnTo: string } | null {
  const [encoded, signature] = state.split(".");
  if (!encoded || !signature) return null;
  const expected = createHmac("sha256", stateSecret()).update(encoded).digest("base64url");
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf-8"));
    if (payload.ownerType !== "trainer" && payload.ownerType !== "client") return null;
    return payload;
  } catch {
    return null;
  }
}

export function buildGoogleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID || "",
    redirect_uri: process.env.GOOGLE_OAUTH_REDIRECT_URI || "",
    response_type: "code",
    access_type: "offline",
    // prompt=consent fuerza que Google siempre entregue un refresh_token,
    // incluso si el usuario ya había autorizado la app antes (si no,
    // reconectar después de revocar el acceso se queda sin refresh_token).
    prompt: "consent",
    scope: SCOPES,
    state,
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

export async function exchangeCodeForTokens(code: string): Promise<GoogleTokenResponse | null> {
  try {
    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID || "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
        redirect_uri: process.env.GOOGLE_OAUTH_REDIRECT_URI || "",
        grant_type: "authorization_code",
      }),
    });
    if (!res.ok) return null;
    return (await res.json()) as GoogleTokenResponse;
  } catch {
    return null;
  }
}

async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: string } | null> {
  try {
    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: process.env.GOOGLE_CLIENT_ID || "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
        grant_type: "refresh_token",
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as GoogleTokenResponse;
    const expiresAt = new Date(Date.now() + data.expires_in * 1000).toISOString();
    return { accessToken: data.access_token, expiresAt };
  } catch {
    return null;
  }
}

export async function getGoogleEmail(accessToken: string): Promise<string | null> {
  try {
    const res = await fetch(GOOGLE_USERINFO_URL, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) return null;
    const data = (await res.json()) as { email?: string };
    return data.email ?? null;
  } catch {
    return null;
  }
}

export interface GoogleConnectionRow {
  id: string;
  owner_type: OwnerType;
  owner_id: string;
  google_email: string | null;
  access_token: string;
  refresh_token: string;
  access_token_expires_at: string;
  calendar_id: string;
}

export async function getConnection(ownerType: OwnerType, ownerId: string): Promise<GoogleConnectionRow | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("google_calendar_connections")
    .select("*")
    .eq("owner_type", ownerType)
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (error || !data) return null;
  return data as GoogleConnectionRow;
}

export async function upsertConnection(input: {
  ownerType: OwnerType;
  ownerId: string;
  googleEmail: string | null;
  accessToken: string;
  refreshToken: string | null;
  expiresAt: string;
}): Promise<void> {
  const supabase = getSupabaseAdmin();
  const existing = await getConnection(input.ownerType, input.ownerId);
  await supabase
    .from("google_calendar_connections")
    .upsert(
      {
        owner_type: input.ownerType,
        owner_id: input.ownerId,
        google_email: input.googleEmail,
        access_token: input.accessToken,
        // Google solo entrega refresh_token en la primera autorización
        // (prompt=consent lo fuerza cada vez, pero por seguridad igual
        // conservamos el anterior si por algún motivo no llega uno nuevo).
        refresh_token: input.refreshToken ?? existing?.refresh_token ?? "",
        access_token_expires_at: input.expiresAt,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "owner_type,owner_id" }
    );
}

export async function deleteConnection(ownerType: OwnerType, ownerId: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  await supabase.from("google_calendar_connections").delete().eq("owner_type", ownerType).eq("owner_id", ownerId);
}

/**
 * Devuelve un access_token vigente, refrescándolo primero si está vencido o
 * a punto de vencer — así cada llamada a la API de Calendar (crear/editar
 * cita) no tiene que preocuparse de la expiración por su cuenta.
 */
async function getValidAccessToken(connection: GoogleConnectionRow): Promise<string | null> {
  const expiresAt = new Date(connection.access_token_expires_at).getTime();
  const isExpiringSoon = expiresAt - Date.now() < 60_000;
  if (!isExpiringSoon) return connection.access_token;

  if (!connection.refresh_token) return null;
  const refreshed = await refreshAccessToken(connection.refresh_token);
  if (!refreshed) return null;

  await upsertConnection({
    ownerType: connection.owner_type,
    ownerId: connection.owner_id,
    googleEmail: connection.google_email,
    accessToken: refreshed.accessToken,
    refreshToken: null,
    expiresAt: refreshed.expiresAt,
  });
  return refreshed.accessToken;
}

export interface CalendarEventInput {
  summary: string;
  description?: string;
  startIso: string;
  endIso: string;
  attendeeEmail?: string | null;
}

/**
 * Crea un evento en el calendario del dueño de la conexión — devuelve el id
 * del evento de Google (para poder editarlo/borrarlo después) o null si la
 * conexión no está vigente / la llamada falla. Si hay attendeeEmail, se pide
 * sendUpdates=all para que Google realmente le mande el correo de invitación
 * (con opción de agregarlo a su calendario personal) — sin este parámetro,
 * la API agrega al invitado al evento pero NO envía ninguna notificación por
 * defecto, así que el cliente nunca se enteraba.
 */
export async function createCalendarEvent(
  connection: GoogleConnectionRow,
  event: CalendarEventInput
): Promise<string | null> {
  const accessToken = await getValidAccessToken(connection);
  if (!accessToken) return null;

  const sendUpdates = event.attendeeEmail ? "all" : "none";

  try {
    const res = await fetch(
      `${GOOGLE_CALENDAR_EVENTS_URL}/${encodeURIComponent(connection.calendar_id)}/events?sendUpdates=${sendUpdates}`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: event.summary,
          description: event.description,
          start: { dateTime: event.startIso },
          end: { dateTime: event.endIso },
          attendees: event.attendeeEmail ? [{ email: event.attendeeEmail }] : undefined,
        }),
      }
    );
    if (!res.ok) return null;
    const data = (await res.json()) as { id: string };
    return data.id;
  } catch {
    return null;
  }
}

export async function updateCalendarEvent(
  connection: GoogleConnectionRow,
  googleEventId: string,
  event: CalendarEventInput
): Promise<boolean> {
  const accessToken = await getValidAccessToken(connection);
  if (!accessToken) return false;

  const sendUpdates = event.attendeeEmail ? "all" : "none";

  try {
    const res = await fetch(
      `${GOOGLE_CALENDAR_EVENTS_URL}/${encodeURIComponent(connection.calendar_id)}/events/${googleEventId}?sendUpdates=${sendUpdates}`,
      {
        method: "PATCH",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          summary: event.summary,
          description: event.description,
          start: { dateTime: event.startIso },
          end: { dateTime: event.endIso },
          attendees: event.attendeeEmail ? [{ email: event.attendeeEmail }] : undefined,
        }),
      }
    );
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Borra un evento — sendUpdates=all para que, si el cliente estaba invitado,
 * también le llegue el aviso de cancelación (no solo desaparezca en
 * silencio de su calendario, si es que lo había agregado desde el correo).
 */
export async function deleteCalendarEvent(connection: GoogleConnectionRow, googleEventId: string): Promise<void> {
  const accessToken = await getValidAccessToken(connection);
  if (!accessToken) return;

  try {
    await fetch(
      `${GOOGLE_CALENDAR_EVENTS_URL}/${encodeURIComponent(connection.calendar_id)}/events/${googleEventId}?sendUpdates=all`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    );
  } catch {
    // Si Google ya no tiene el evento (borrado manual, etc.) no hay nada que
    // reintentar — igual vamos a borrar la fila local que lo referencia.
  }
}
