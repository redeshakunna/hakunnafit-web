"use server";

// Pantalla única de login (/panel/login) — el mismo formulario sirve tanto
// para el entrenador (Supabase Auth, correo + contraseña) como para el
// único super-admin del equipo HakunnaFit (usuario + contraseña compartidos,
// ver admin-auth.ts). No hay selector ni pestañas: se prueba primero contra
// el super-admin (comparación exacta, instantánea) y si no coincide se
// intenta como entrenador. El resultado le dice a la pantalla a dónde
// redirigir (/panel-hakunna o /panel).

import { verifyAndSetAdminSession } from "./admin-auth";
import { verifyTrainerCredentials } from "./trainer-auth";

export interface UnifiedLoginResult {
  ok: boolean;
  error?: string;
  redirectTo?: string;
}

export async function loginUnified(formData: FormData): Promise<UnifiedLoginResult> {
  const identifier = ((formData.get("identifier") as string) || "").trim();
  const password = (formData.get("password") as string) || "";

  if (!identifier || !password) {
    return { ok: false, error: "Completa tu usuario o correo y tu contraseña." };
  }

  const isAdmin = await verifyAndSetAdminSession(identifier, password);
  if (isAdmin) return { ok: true, redirectTo: "/panel-hakunna" };

  const isTrainer = await verifyTrainerCredentials(identifier, password);
  if (isTrainer) return { ok: true, redirectTo: "/panel" };

  return { ok: false, error: "Usuario o contraseña incorrectos." };
}
