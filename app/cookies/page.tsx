import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageShell, LegalIntro, LegalSection, LegalContactLink } from "@/components/hakunnafit/legal-page";

export const metadata: Metadata = {
  title: "Política de cookies — HakunnaFit",
  description: "Qué cookies usa HakunnaFit y para qué.",
};

const LAST_UPDATED = "2 de agosto de 2026";

export default function CookiesPage() {
  return (
    <LegalPageShell title="Política de cookies" lastUpdated={LAST_UPDATED}>
      <LegalIntro>
        Esta página explica qué cookies usa HakunnaFit. Vamos directo al grano: usamos muy pocas,
        y ninguna es de publicidad ni de rastreo de terceros.
      </LegalIntro>

      <LegalSection title="1. Qué es una cookie">
        <p>
          Una cookie es un archivo pequeño que un sitio guarda en tu navegador para recordar
          información entre visitas — por ejemplo, que ya iniciaste sesión.
        </p>
      </LegalSection>

      <LegalSection title="2. Cookies que usamos">
        <p>Todas las cookies de HakunnaFit son estrictamente necesarias para que la plataforma funcione:</p>
        <ul className="ml-5 list-disc space-y-1.5">
          <li>
            <span className="font-semibold text-white">Sesión del entrenador</span> — cookie de
            Supabase Auth que mantiene iniciada la sesión en el panel del entrenador
            (hakunnafit.com/panel).
          </li>
          <li>
            <span className="font-semibold text-white">Sesión del super-admin</span> — cookie
            propia, cifrada, que mantiene iniciada la sesión en el panel interno
            (hakunnafit.com/panel-hakunna).
          </li>
        </ul>
        <p>
          Sin estas cookies no es posible mantener una sesión iniciada — no hay forma de
          desactivarlas selectivamente sin dejar de poder usar el panel.
        </p>
      </LegalSection>

      <LegalSection title="3. Lo que no usamos">
        <p>
          HakunnaFit no usa cookies de publicidad, de rastreo entre sitios, ni píxeles de
          terceros para perfilar visitantes. No vendemos ni compartimos datos de navegación con
          redes de publicidad.
        </p>
      </LegalSection>

      <LegalSection title="4. Cómo controlar las cookies">
        <p>
          Puedes borrar o bloquear cookies desde la configuración de tu navegador en cualquier
          momento. Ten en cuenta que, al ser cookies necesarias para la sesión, bloquearlas te
          impedirá mantener la sesión iniciada en el panel.
        </p>
      </LegalSection>

      <LegalSection title="5. Cambios a esta política">
        <p>
          Si en el futuro agregamos herramientas de analítica o cookies adicionales, esta página
          se actualizará para reflejarlo, con la fecha de la última actualización visible arriba.
        </p>
      </LegalSection>

      <p className="mt-12 text-sm text-white/50">
        Más detalle sobre qué datos recopilamos en general en nuestra{" "}
        <Link href="/privacidad" className="text-hf-blue hover:underline">
          Política de privacidad
        </Link>
        . ¿Dudas? Escríbenos a <LegalContactLink /> o vuelve al{" "}
        <Link href="/" className="text-hf-blue hover:underline">
          inicio
        </Link>
        .
      </p>
    </LegalPageShell>
  );
}
