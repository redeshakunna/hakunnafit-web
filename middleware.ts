import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { RESERVED_SUBDOMAINS } from "@/lib/slug";

// Dominio raíz de producción. Cualquier host que llegue como
// "<algo>.hakunnafit.com" se interpreta como el subdominio de un entrenador
// y se reescribe hacia /landing/[subdominio] (ruta dinámica que busca al
// entrenador en Supabase y muestra su página). El dominio raíz y los
// subdominios reservados (www, app del panel, correo, etc.) siguen su curso
// normal sin pasar por esta reescritura.
const ROOT_DOMAIN = "hakunnafit.com";

// Rutas de /panel (panel de autoservicio del entrenador) accesibles sin
// sesión — todo lo demás bajo /panel exige estar logueado.
const PUBLIC_PANEL_ROUTES = new Set(["/panel/login", "/panel/set-password"]);

export async function middleware(req: NextRequest) {
  const hostname = (req.headers.get("host") || "").split(":")[0].toLowerCase();

  // 1. Subdominios de entrenador — no tiene relación con la sesión de /panel.
  if (hostname.endsWith(`.${ROOT_DOMAIN}`)) {
    const subdomain = hostname.slice(0, -(`.${ROOT_DOMAIN}`.length));
    if (subdomain && !subdomain.includes(".") && !RESERVED_SUBDOMAINS.has(subdomain)) {
      const url = req.nextUrl.clone();
      url.pathname = `/landing/${subdomain}${url.pathname === "/" ? "" : url.pathname}`;
      return NextResponse.rewrite(url);
    }
  }

  // 2. Panel de autoservicio del entrenador (/panel/*) — refresca la sesión
  // de Supabase en cada request (necesario para que el access token no
  // expire silenciosamente) y exige login salvo en las rutas públicas.
  // OJO: debe ser una comparación exacta de segmento, no startsWith("/panel")
  // a secas — si no, también atraparía /panel-hakunna (el panel de Nando,
  // que usa su propio cookie de admin, nada de sesión Supabase) y lo
  // mandaría a /panel/login por error.
  if (req.nextUrl.pathname === "/panel" || req.nextUrl.pathname.startsWith("/panel/")) {
    let response = NextResponse.next({ request: req });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return req.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            req.cookies.set({ name, value, ...options });
            response = NextResponse.next({ request: req });
            response.cookies.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            req.cookies.set({ name, value: "", ...options });
            response = NextResponse.next({ request: req });
            response.cookies.set({ name, value: "", ...options });
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user && !PUBLIC_PANEL_ROUTES.has(req.nextUrl.pathname)) {
      const url = req.nextUrl.clone();
      url.pathname = "/panel/login";
      return NextResponse.redirect(url);
    }

    if (user && req.nextUrl.pathname === "/panel/login") {
      const url = req.nextUrl.clone();
      url.pathname = "/panel";
      return NextResponse.redirect(url);
    }

    return response;
  }

  // 3. Cuenta del cliente final (/mi-cuenta) — mismo mecanismo de sesión que
  // /panel, pero sin login propio bajo esta ruta: el cliente siempre entra
  // desde la landing de su entrenador (/landing/[subdominio]/ingresar), así
  // que si no hay sesión simplemente lo mandamos al home a que busque el
  // link de su entrenador.
  if (req.nextUrl.pathname === "/mi-cuenta" || req.nextUrl.pathname.startsWith("/mi-cuenta/")) {
    let response = NextResponse.next({ request: req });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return req.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            req.cookies.set({ name, value, ...options });
            response = NextResponse.next({ request: req });
            response.cookies.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            req.cookies.set({ name, value: "", ...options });
            response = NextResponse.next({ request: req });
            response.cookies.set({ name, value: "", ...options });
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      const url = req.nextUrl.clone();
      url.pathname = "/";
      return NextResponse.redirect(url);
    }

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|api|favicon.ico|images).*)"],
};
