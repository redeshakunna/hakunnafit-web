import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// Cliente simple para HakunnaFit — este sitio no maneja sesión de usuario,
// solo guarda leads del formulario de interés, así que no necesita el
// cliente con manejo de cookies (@supabase/ssr). Reutiliza el mismo
// proyecto de Supabase que el producto de Marion, únicamente para la tabla
// hakunnafit_leads (RLS: insert público, sin acceso de lectura).
export function getSupabase() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
