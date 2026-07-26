import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

// Cliente de Supabase con sesión real por cookie — usado por el panel de
// autoservicio del entrenador (/panel). Distinto tanto del cliente público
// simple (lib/supabase.ts, sin sesión) como del cliente de servicio
// (lib/supabase-admin.ts, usado solo por el panel de Nando con su propia
// contraseña única, sin usuarios individuales).
//
// Se usa dentro de Server Components y Server Actions. En un Server Component
// puro no se pueden escribir cookies (Next.js lo prohíbe fuera de una acción
// o Route Handler) — el catch silencioso cubre justo ese caso, confiando en
// que el middleware ya se encargó de refrescar la sesión antes de llegar aquí.
export function getSupabaseServerClient() {
  const cookieStore = cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Server Component sin permiso de escritura — no pasa nada.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {
            // Idem.
          }
        },
      },
    }
  );
}
