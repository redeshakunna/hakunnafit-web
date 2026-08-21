import type { Metadata } from "next";
import Link from "next/link";
import { LegalPageShell, LegalIntro, LegalSection, LegalContactLink } from "@/components/hakunnafit/legal-page";

export const metadata: Metadata = {
  title: "Política de privacidad — HakunnaFit",
  description:
    "Cómo HakunnaFit recopila, usa y protege los datos de entrenadores y sus clientes, incluida la integración con Google Calendar.",
};

const LAST_UPDATED = "1 de agosto de 2026";

export default function PrivacidadPage() {
  return (
    <LegalPageShell title="Política de privacidad" lastUpdated={LAST_UPDATED}>
      <LegalIntro>
        HakunnaFit (operado por Hakunna Digital, en adelante &quot;HakunnaFit&quot;,
        &quot;nosotros&quot;) es una plataforma que permite a entrenadores personales gestionar
        su negocio: clientes, rutinas, agenda y pagos. Esta política explica qué datos
        recopilamos, para qué los usamos y con quién los compartimos, tanto de los entrenadores
        que usan HakunnaFit como de los clientes finales que ellos gestionan dentro de la
        plataforma.
      </LegalIntro>

      <LegalSection title="1. Quiénes somos">
        <p>
          HakunnaFit es un producto de Hakunna Digital. Si tienes preguntas sobre esta política o
          sobre tus datos, puedes escribirnos a <LegalContactLink />.
        </p>
      </LegalSection>

      <LegalSection title="2. Datos que recopilamos">
        <p>
          <span className="font-semibold text-white">De los entrenadores:</span> nombre del
          negocio, correo, teléfono, ciudad, información de pago (procesada por nuestra pasarela,
          ver sección 5), fotos y textos que suben para personalizar su sitio.
        </p>
        <p>
          <span className="font-semibold text-white">De los clientes finales:</span> nombre,
          correo, teléfono, datos de perfil deportivo (objetivos, nivel, disponibilidad),
          mediciones corporales, fotos de progreso y, si el entrenador agenda una cita con ellos,
          la información necesaria para esa cita (fecha, hora, modalidad).
        </p>
        <p>
          Toda esta información la administra directamente el entrenador dentro de su propio
          espacio en HakunnaFit — nosotros no vendemos ni usamos estos datos con fines
          publicitarios.
        </p>
      </LegalSection>

      <LegalSection title="3. Uso de Google Calendar">
        <p>
          HakunnaFit ofrece una integración opcional con Google Calendar para que los
          entrenadores (y, si lo desean, sus clientes) sincronicen las citas creadas en la Agenda
          de HakunnaFit con su calendario personal de Google.
        </p>
        <p>
          Cuando un entrenador o cliente conecta su cuenta de Google, solicitamos únicamente el
          permiso{" "}
          <code className="rounded bg-white/10 px-1.5 py-0.5 text-[13px] text-white/80">
            calendar.events
          </code>{" "}
          (crear, editar y borrar eventos puntuales) y su correo, para poder identificar la cuenta
          conectada. No solicitamos ni accedemos a la lectura de otros eventos de su calendario ni
          a ninguna otra información de su cuenta de Google.
        </p>
        <p>Con este permiso, HakunnaFit únicamente:</p>
        <ul className="ml-5 list-disc space-y-1.5">
          <li>Crea un evento en el calendario cuando se agenda una cita en la Agenda.</li>
          <li>Actualiza ese evento si la cita cambia de fecha, hora o estado.</li>
          <li>Elimina el evento si la cita se cancela.</li>
        </ul>
        <p>
          Los tokens de acceso y actualización (access/refresh token) que Google entrega al
          conectar la cuenta se almacenan cifrados en nuestra base de datos y solo se usan para
          las acciones descritas arriba. El entrenador o cliente puede desconectar su cuenta de
          Google en cualquier momento desde su panel en HakunnaFit, lo que revoca nuestro acceso
          de inmediato; también puede revocarlo directamente desde{" "}
          <a
            href="https://myaccount.google.com/permissions"
            target="_blank"
            rel="noreferrer"
            className="text-hf-blue hover:underline"
          >
            la configuración de su cuenta de Google
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="4. Con quién compartimos datos">
        <p>Usamos un número reducido de proveedores para operar la plataforma:</p>
        <ul className="ml-5 list-disc space-y-1.5">
          <li>
            <span className="font-semibold text-white">Supabase</span> — base de datos y
            almacenamiento de archivos (fotos, documentos).
          </li>
          <li>
            <span className="font-semibold text-white">Google Calendar API</span> —
            sincronización de citas, solo si el entrenador o cliente conecta su cuenta
            voluntariamente (ver sección 3).
          </li>
          <li>
            <span className="font-semibold text-white">Wompi</span> — procesamiento de pagos;
            HakunnaFit no almacena números de tarjeta.
          </li>
          <li>
            <span className="font-semibold text-white">Resend</span> — envío de correos
            transaccionales (confirmaciones, recordatorios, notificaciones).
          </li>
          <li>
            <span className="font-semibold text-white">HAKAI</span> — asistente de inteligencia
            artificial de HakunnaFit, usado para generación de rutinas, planes de alimentación y
            respuestas del chat.
          </li>
        </ul>
        <p>No vendemos datos personales a terceros ni los usamos con fines publicitarios.</p>
      </LegalSection>

      <LegalSection title="5. Seguridad">
        <p>
          Aplicamos medidas técnicas razonables para proteger la información: conexiones cifradas
          (HTTPS), contraseñas con hash, cookies de sesión con atributos seguros y acceso
          restringido a la base de datos. Ningún sistema es 100% infalible, pero trabajamos para
          mantener los datos protegidos frente a accesos no autorizados.
        </p>
      </LegalSection>

      <LegalSection title="6. Tus derechos">
        <p>
          Puedes solicitar acceso, corrección o eliminación de tus datos escribiendo a{" "}
          <LegalContactLink />. Si eres cliente de un entrenador que usa HakunnaFit, también
          puedes hacer esa solicitud directamente a tu entrenador, quien administra tu información
          dentro de la plataforma.
        </p>
      </LegalSection>

      <LegalSection title="7. Cookies">
        <p>
          Usamos cookies estrictamente necesarias para mantener tu sesión iniciada (panel de
          entrenador y panel de super-admin). No usamos cookies de rastreo publicitario. Más
          detalle en nuestra{" "}
          <Link href="/cookies" className="text-hf-blue hover:underline">
            Política de cookies
          </Link>
          .
        </p>
      </LegalSection>

      <LegalSection title="8. Cambios a esta política">
        <p>
          Podemos actualizar esta política a medida que evoluciona el producto. Si hay cambios
          importantes, lo indicaremos en esta misma página con la fecha de la última
          actualización.
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
