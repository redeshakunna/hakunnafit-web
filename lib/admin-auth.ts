"use server";

import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME } from "./admin-constants";

export async function isAdminAuthenticated(): Promise<boolean> {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) return false;
  const cookie = cookies().get(ADMIN_COOKIE_NAME)?.value;
  return cookie === secret;
}

/**
 * Prueba usuario + contraseña contra las credenciales del único super-admin
 * (ADMIN_PANEL_USERNAME/ADMIN_PANEL_PASSWORD) y, si coinciden, setea la
 * cookie de sesión. Usada por la pantalla única de login
 * (lib/unified-login-actions.ts) — si no coincide, no hace nada y el mismo
 * formulario sigue intentando como entrenador.
 */
export async function verifyAndSetAdminSession(username: string, password: string): Promise<boolean> {
  const expectedUsername = process.env.ADMIN_PANEL_USERNAME;
  const expectedPassword = process.env.ADMIN_PANEL_PASSWORD;
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!expectedUsername || !expectedPassword || !secret) return false;
  if (username !== expectedUsername || password !== expectedPassword) return false;

  cookies().set(ADMIN_COOKIE_NAME, secret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 días
  });

  return true;
}

export async function logoutAdmin(): Promise<void> {
  cookies().delete(ADMIN_COOKIE_NAME);
}
