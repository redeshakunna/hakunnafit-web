import { NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens, getGoogleEmail, verifyOAuthState, upsertConnection } from "@/lib/google-calendar";

// Único callback de OAuth para las 2 audiencias que pueden conectar Google
// Calendar (entrenador y cliente final) — a cuál de las dos pertenece la
// conexión viene codificado y firmado dentro de "state" (ver
// signOAuthState en lib/google-calendar.ts), así no hace falta una ruta de
// callback por tipo de dueño. Configura esta URL exacta como "Authorized
// redirect URI" en Google Cloud Console: https://<tu-dominio>/api/google-calendar/callback
export async function GET(req: NextRequest) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://hakunnafit.com";
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const errorParam = searchParams.get("error");

  if (errorParam) {
    // El usuario canceló el consentimiento en Google — lo regresamos a donde
    // estaba, no hay nada más que avisarle.
    const session = state ? verifyOAuthState(state) : null;
    return NextResponse.redirect(`${siteUrl}${session?.returnTo ?? "/panel/agenda"}?google=cancelado`);
  }

  if (!code || !state) {
    return NextResponse.redirect(`${siteUrl}/panel/agenda?google=error`);
  }

  const session = verifyOAuthState(state);
  if (!session) {
    return NextResponse.redirect(`${siteUrl}/panel/agenda?google=error`);
  }

  const tokens = await exchangeCodeForTokens(code);
  if (!tokens) {
    return NextResponse.redirect(`${siteUrl}${session.returnTo}?google=error`);
  }

  const email = await getGoogleEmail(tokens.access_token);
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

  await upsertConnection({
    ownerType: session.ownerType,
    ownerId: session.ownerId,
    googleEmail: email,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? null,
    expiresAt,
  });

  return NextResponse.redirect(`${siteUrl}${session.returnTo}?google=conectado`);
}
