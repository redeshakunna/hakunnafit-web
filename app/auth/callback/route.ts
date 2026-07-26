import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase-server";

// Recibe el "code" que llega en los links de recuperación/creación de
// contraseña generados por Supabase Auth (supabase.auth.admin.generateLink)
// y lo intercambia por una sesión real (cookies), antes de mandar al
// entrenador a la página donde define su contraseña. Sin este paso, el link
// del correo no deja al entrenador realmente autenticado.
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const next = req.nextUrl.searchParams.get("next") || "/panel";

  if (code) {
    const supabase = getSupabaseServerClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL(next, req.url));
}
