import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageShell, LegalIntro, LegalSection, LegalContactLink } from "@/components/hakunnafit/legal-page";

export const metadata: Metadata = {
  title: "Términos y condiciones — HakunnaFit",
  description: "Condiciones de uso de la plataforma HakunnaFit para entrenadores personales.",
};

const LAST_UPDATED = "2 de agosto de 2026";

export default function TerminosPage() {
  return (
    <LegalPageShell title="Términos y condiciones" lastUpdated={LAST_UPDATED}>
      <LegalIntro>
        Estos términos regulan el uso de HakunnaFit, una plataforma operada por Hakunna Digital
        que le permite a entrenadores personales (en adelante, el &quot;entrenador&quot;) tener su
        propio sitio, panel administrativo, gestión de clientes, agenda y cobros. Al crear una
        cuenta o usar HakunnaFit, el entrenador acepta estos términos.
      </LegalIntro>

      <LegalSection title="1. Quién contrata y quién usa">
        <p>
          El cliente de HakunnaFit es el entrenador: es quien contrata el plan, administra su
          espacio y es responsable de la relación con sus propios clientes finales. HakunnaFit no
          administra directamente a los clientes finales de un entrenador ni interviene en el
          servicio de entrenamiento que el entrenador les presta — HakunnaFit es la herramienta,
          no la parte del servicio de entrenamiento en sí.
        </p>
      </LegalSection>

      <LegalSection title="2. Planes, precios y facturación">
        <p>
          HakunnaFit ofrece los planes Starter, Pro y Elite, cada uno con sus propias funciones y
          precio, visibles en{" "}
          <Link href="/#precios" className="text-hf-blue hover:underline">
            hakunnafit.com
          </Link>
          . El cobro es recurrente (mensual o según el ciclo elegido) y se procesa a través de
          nuestra pasarela de pagos (Wompi). Los precios pueden cambiar; si un cambio afecta al
          entrenador, se le avisará antes de que aplique a su próximo ciclo de cobro.
        </p>
        <p>
          Si un pago no se completa a tiempo, HakunnaFit puede suspender temporalmente el acceso
          al panel y la visibilidad del sitio del entrenador hasta que el pago se regularice.
        </p>
      </LegalSection>

      <LegalSection title="3. Cancelación">
        <p>
          El entrenador puede solicitar la cancelación de su plan en cualquier momento
          escribiendo a <LegalContactLink />. La cancelación aplica desde el siguiente ciclo de
          cobro — no se hacen reembolsos proporcionales por el tiempo ya facturado, salvo que la
          ley aplicable indique lo contrario.
        </p>
      </LegalSection>

      <LegalSection title="4. Responsabilidades del entrenador">
        <p>El entrenador es responsable de:</p>
        <ul className="ml-5 list-disc space-y-1.5">
          <li>La veracidad de la información que publica en su sitio y comparte con sus clientes.</li>
          <li>La calidad, seguridad y idoneidad del servicio de entrenamiento que presta a sus clientes finales.</li>
          <li>Contar con el consentimiento de sus clientes para almacenar sus datos (nombre, contacto, mediciones, fotos de progreso) dentro de HakunnaFit.</li>
          <li>No usar la plataforma para fines ilegales, fraudulentos o que infrinjan derechos de terceros.</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Límite de responsabilidad de HakunnaFit">
        <p>
          HakunnaFit es una herramienta de gestión — no presta servicios de entrenamiento físico,
          nutrición ni asesoría médica, y no es responsable por el contenido, calidad o resultado
          del servicio que cada entrenador presta a sus propios clientes. Las rutinas o
          sugerencias generadas por el asistente de IA (HAKAI) son un punto de partida editable
          por el entrenador, no una recomendación médica, y su uso final es responsabilidad del
          entrenador.
        </p>
        <p>
          En la medida permitida por la ley, HakunnaFit no será responsable por daños indirectos,
          pérdida de ingresos o de datos derivados del uso de la plataforma, salvo en casos de
          dolo o negligencia grave de nuestra parte.
        </p>
      </LegalSection>

      <LegalSection title="6. Propiedad intelectual">
        <p>
          El software, diseño, marca y logo de HakunnaFit son propiedad de Hakunna Digital. El
          entrenador conserva la propiedad de su propio contenido (textos, fotos, nombre de su
          negocio) que sube a la plataforma, y nos otorga una licencia limitada para almacenarlo y
          mostrarlo como parte del servicio (por ejemplo, en su sitio público).
        </p>
      </LegalSection>

      <LegalSection title="7. Suspensión o terminación de cuenta">
        <p>
          HakunnaFit puede suspender o cancelar una cuenta en caso de impago prolongado, uso
          fraudulento, o incumplimiento grave de estos términos, previo aviso razonable cuando sea
          posible.
        </p>
      </LegalSection>

      <LegalSection title="8. Cambios a estos términos">
        <p>
          Podemos actualizar estos términos a medida que evoluciona el producto. Los cambios
          importantes se avisarán con anticipación; el uso continuado de HakunnaFit después de un
          cambio implica su aceptación.
        </p>
      </LegalSection>

      <LegalSection title="9. Ley aplicable">
        <p>
          Estos términos se rigen por las leyes de Colombia. Cualquier disputa se resolverá ante
          los jueces competentes de Colombia, salvo que la ley aplicable disponga otra cosa.
        </p>
      </LegalSection>

      <p className="mt-12 text-sm text-white/50">
        ¿Tienes dudas? Escríbenos a <LegalContactLink /> o vuelve al{" "}
        <Link href="/" className="text-hf-blue hover:underline">
          inicio
        </Link>
        .
      </p>
    </LegalPageShell>
  );
}
