import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// Cliente con la llave service_role — SOLO se usa dentro de Server Actions
// del panel de super-admin (/panel-hakunna). Esta llave salta todas las
// reglas de RLS, así que nunca debe llegar al navegador ni a un componente
// "use client". No importar este archivo fuera de lib/admin-actions.ts.
export function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Falta configurar SUPABASE_SERVICE_ROLE_KEY (o la URL de Supabase) en .env.local"
    );
  }

  return createClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
