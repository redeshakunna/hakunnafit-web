"use server";

import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME } from "./admin-constants";

export async function isAdminAuthenticated(): Promise<boolean> {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) return false;
  const cookie = cookies().get(ADMIN_COOKIE_NAME)?.value;
  return cookie === secret;
}

export interface AdminLoginResult {
  ok: boolean;
  error?: string;
}

export async function loginAdmin(formData: FormData): Promise<AdminLoginResult> {
  const password = (formData.get("password") as string) || "";
  const expected = process.env.ADMIN_PANEL_PASSWORD;
  const secret = process.env.ADMIN_SESSION_SECRET;

  if (!expected || !secret) {
    return { ok: false, error: "El panel no está configurado todavía (faltan variables de entorno)." };
  }

  if (password !== expected) {
    return { ok: false, error: "Contraseña incorrecta." };
  }

  cookies().set(ADMIN_COOKIE_NAME, secret, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 días
  });

  return { ok: true };
}

export async function logoutAdmin(): Promise<void> {
  cookies().delete(ADMIN_COOKIE_NAME);
}
