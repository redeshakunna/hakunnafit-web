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
  // OJO: /mi-cuenta es una ruta de app compartida (no vive bajo
  // /landing/[subdominio]) — el cliente entra desde el subdominio de su
  // entrenador (/landing/[subdominio]/ingresar) pero client-login-form.tsx
  // hace router.push("/mi-cuenta") en el navegador, que en el subdominio
  // resuelve a "<subdominio>.hakunnafit.com/mi-cuenta". Si no se excluye acá,
  // esta regla la reescribe a /landing/[subdominio]/mi-cuenta (ruta
  // inexistente) y el cliente recién logueado cae en un 404 real en
  // producción — bug encontrado probando el login del cliente en vivo.
  const isSharedAppRoute = req.nextUrl.pathname === "/mi-cuenta" || req.nextUrl.pathname.startsWith("/mi-cuenta/");
  if (hostname.endsWith(`.${ROOT_DOMAIN}`) && !isSharedAppRoute) {
    const subdomain = hostname.slice(0, -(`.${ROOT_DOMAIN}`.length));
    if (subdomain && !subdomain.includes(".") && !RESERVED_SUBDOMAINS.has(subdomain)) {
      // OJO: algunos links dentro de las plantillas de landing (el botón
      // "Ingresar", ver starter-templates/*.tsx) están armados con la ruta
      // completa "/landing/[subdominio]/..." en vez de una relativa —
      // pensados para funcionar también cuando se accede por path en el
      // dominio raíz (hakunnafit.com/landing/[subdominio], útil para
      // probar antes de que exista el DNS wildcard, ver comentario en
      // app/landing/[subdominio]/page.tsx). Si esta regla los reescribe
      // igual, el prefijo queda duplicado ("/landing/x/landing/x/...") y
      // cae en un 404 real — bug encontrado en producción: el botón
      // "Ingresar" del propio subdominio del entrenador no llevaba a
      // ningún lado. Si el path ya viene prefijado con el subdominio
      // correcto, se deja pasar tal cual en vez de prefijarlo de nuevo.
      const prefix = `/landing/${subdomain}`;
      const alreadyPrefixed = req.nextUrl.pathname === prefix || req.nextUrl.pathname.startsWith(`${prefix}/`);
      if (!alreadyPrefixed) {
        const url = req.nextUrl.clone();
        url.pathname = `${prefix}${url.pathname === "/" ? "" : url.pathname}`;
        return NextResponse.rewrite(url);
      }
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
    // OJO: `response` se crea UNA sola vez y las cookies se van agregando
    // sobre ese mismo objeto (response.cookies.set/.delete). Antes cada
    // set()/remove() reasignaba `response = NextResponse.next(...)` de cero,
    // así que cuando Supabase escribía varias cookies seguidas (típico al
    // refrescar el access token) solo sobrevivía la última — corrompiendo la
    // sesión silenciosamente. Bug real encontrado en producción: el panel
    // del entrenador quedaba en ERR_TOO_MANY_REDIRECTS.
    const response = NextResponse.next({ request: req });

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
            response.cookies.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            req.cookies.set({ name, value: "", ...options });
            response.cookies.set({ name, value: "", ...options });
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Si getUser() refrescó el token (escribió cookies nuevas en `response`)
    // y acá abajo redirigimos, NextResponse.redirect(url) crea un objeto
    // totalmente nuevo que NO hereda esas cookies — se perderían y el
    // navegador seguiría mandando el refresh token viejo (ya usado), que
    // falla de nuevo en el siguiente request, y así en bucle infinito. Por
    // eso copiamos explícitamente las cookies de `response` a cada redirect.
    if (!user && !PUBLIC_PANEL_ROUTES.has(req.nextUrl.pathname)) {
      const url = req.nextUrl.clone();
      url.pathname = "/panel/login";
      const redirectResponse = NextResponse.redirect(url);
      response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
      return redirectResponse;
    }

    // OJO: antes, si ya había una sesión Supabase activa (ej: un entrenador
    // logueado) y el navegador visitaba /panel/login, acá se forzaba un
    // redirect a /panel — asumiendo que "ya logueado" siempre significa
    // "no necesita ver el formulario". Pero /panel/login es también la
    // puerta de entrada al login de ADMIN (loginUnified() prueba primero
    // credenciales de super-admin), que es un sistema de auth totalmente
    // aparte (cookie propio, sin sesión Supabase — ver bloque de
    // /panel-hakunna arriba). Si Nando (o cualquier admin) tenía además una
    // sesión de entrenador activa en el mismo navegador, este redirect lo
    // sacaba del login antes de poder escribir sus credenciales de admin —
    // bug real: /panel-hakunna/solicitudes lo mandaba a /panel/login para
    // autenticarse como admin, y de ahí rebotaba directo a /panel (panel de
    // entrenador) sin nunca ver el formulario. Se quita el redirect: el
    // formulario de loginUnified ya hace su propio router.push(redirectTo)
    // correcto tras autenticar, así que no hace falta este atajo y mostrar
    // el login de más no tiene costo.
    return response;
  }

  // 3. Cuenta del cliente final (/mi-cuenta) — mismo mecanismo de sesión que
  // /panel, pero sin login propio bajo esta ruta: el cliente siempre entra
  // desde la landing de su entrenador (/landing/[subdominio]/ingresar), así
  // que si no hay sesión simplemente lo mandamos al home a que busque el
  // link de su entrenador.
  if (req.nextUrl.pathname === "/mi-cuenta" || req.nextUrl.pathname.startsWith("/mi-cuenta/")) {
    // Mismo fix que en el bloque de /panel de arriba: un solo `response` que
    // acumula cookies, y copiarlas al redirect para no perder un refresh de
    // token justo antes de redirigir (evita el mismo bucle de redirects).
    const response = NextResponse.next({ request: req });

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
            response.cookies.set({ name, value, ...options });
          },
          remove(name: string, options: CookieOptions) {
            req.cookies.set({ name, value: "", ...options });
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
      const redirectResponse = NextResponse.redirect(url);
      response.cookies.getAll().forEach((cookie) => redirectResponse.cookies.set(cookie));
      return redirectResponse;
    }

    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|api|favicon.ico|images).*)"],
};
