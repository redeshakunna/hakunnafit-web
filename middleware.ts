import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { RESERVED_SUBDOMAINS } from "@/lib/slug";

// Dominio raíz de producción. Cualquier host que llegue como
// "<algo>.hakunnafit.com" se interpreta como el subdominio de un entrenador
// y se reescribe hacia /landing/[subdominio] (ruta dinámica que busca al
// entrenador en Supabase y muestra su página). El dominio raíz y los
// subdominios reservados (www, app del panel, correo, etc.) siguen su curso
// normal sin pasar por esta reescritura.
const ROOT_DOMAIN = "hakunnafit.com";

export function middleware(req: NextRequest) {
  const hostname = (req.headers.get("host") || "").split(":")[0].toLowerCase();

  // En local/preview (localhost, *.vercel.app, IPs) no hay subdominio real de
  // hakunnafit.com que resolver — se deja pasar todo tal cual; para probar el
  // placeholder de un entrenador en esos entornos se usa directamente la ruta
  // /landing/[subdominio].
  if (!hostname.endsWith(`.${ROOT_DOMAIN}`)) {
    return NextResponse.next();
  }

  const subdomain = hostname.slice(0, -(`.${ROOT_DOMAIN}`.length));

  if (!subdomain || subdomain.includes(".") || RESERVED_SUBDOMAINS.has(subdomain)) {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.pathname = `/landing/${subdomain}${url.pathname === "/" ? "" : url.pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next|api|favicon.ico|images).*)"],
};
