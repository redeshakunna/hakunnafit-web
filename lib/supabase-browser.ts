"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./database.types";

// Cliente de Supabase para el navegador (Client Components) del panel de
// entrenador — comparte cookies de sesión con lib/supabase-server.ts vía
// @supabase/ssr, así que el login hecho en un Server Action y la sesión leída
// en un Server Component siempre ven el mismo estado.
export function getSupabaseBrowserClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
