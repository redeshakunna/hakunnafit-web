// Envío de correo para notificaciones administrativas (usa Resend) + la
// plantilla HTML con la marca de HakunnaFit (misma línea visual del diseño
// de referencia: barra superior, hero con mascota, panel de 4 pasos, banner
// de confianza y footer de 3 columnas).
//
// Si no hay RESEND_API_KEY configurada, sendAdminEmail no hace nada — así el
// resto de la app (crear leads, aprobar entrenadores, etc.) nunca se rompe
// por falta de configuración de correo.

const RESEND_API_URL = "https://api.resend.com/emails";

export async function sendAdminEmail(input: { subject: string; html: string }): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const to = process.env.ADMIN_NOTIFICATION_EMAIL || "redeshakunna@gmail.com";
  const from = process.env.EMAIL_FROM || "HakunnaFit <onboarding@resend.dev>";

  try {
    await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject: input.subject,
        html: input.html,
      }),
    });
  } catch {
    // Un correo fallido no debe romper el flujo principal.
  }
}

/**
 * Igual que sendAdminEmail pero a un destinatario cualquiera — se usa para
 * los correos que el sistema le envía al entrenador/solicitante (aprobación
 * de solicitud, solicitud de cambios en el onboarding, etc.), no a Nando.
 */
export async function sendLeadEmail(input: { to: string; subject: string; html: string }): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const from = process.env.EMAIL_FROM || "HakunnaFit <onboarding@resend.dev>";

  try {
    await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: input.to,
        subject: input.subject,
        html: input.html,
      }),
    });
  } catch {
    // Un correo fallido no debe romper el flujo de aprobación.
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

interface StepItem {
  emoji: string;
  title: string;
  desc: string;
}

interface NotificationTypeMeta {
  label: string;
  color: string;
  emoji: string;
  panelHeading: string;
  steps: StepItem[];
}

const NOTIFICATION_META: Record<string, NotificationTypeMeta> = {
  lead_nuevo: {
    label: "Nueva solicitud",
    color: "#00C8FF",
    emoji: "🆕",
    panelHeading: "¿Qué sigue ahora?",
    steps: [
      { emoji: "📋", title: "Solicitud recibida", desc: "Guardamos los datos del formulario." },
      { emoji: "🔍", title: "Revisa el plan elegido", desc: "Mira qué plan escogió y sus respuestas." },
      { emoji: "✅", title: "Apruébalo cuando quieras", desc: "Actívalo con un clic desde Solicitudes." },
      { emoji: "🚀", title: "Se activa solo", desc: "Dominio y accesos se generan automáticamente." },
    ],
  },
  entrenador_aprobado: {
    label: "Entrenador aprobado",
    color: "#6D2EFF",
    emoji: "✅",
    panelHeading: "Ya está en marcha",
    steps: [
      { emoji: "✅", title: "Cuenta creada", desc: "Ya tiene acceso con su correo." },
      { emoji: "🌐", title: "Subdominio asignado", desc: "Su landing quedó reservada." },
      { emoji: "💳", title: "Cobro programado", desc: "Próximo cobro configurado a 30 días." },
      { emoji: "📊", title: "Visible en Entrenadores", desc: "Ya aparece en tu lista con su plan." },
    ],
  },
  estado_cambio: {
    label: "Cambio de estado",
    color: "#FF2DB8",
    emoji: "🔄",
    panelHeading: "Qué cambió",
    steps: [
      { emoji: "🔄", title: "Estado actualizado", desc: "El cambio ya quedó guardado." },
      { emoji: "👀", title: "Puedes ajustarlo", desc: "Cámbialo de nuevo cuando quieras." },
      { emoji: "📩", title: "Aviso solo para ti", desc: "El entrenador no recibe este correo." },
      { emoji: "📊", title: "Detalle completo", desc: "Consúltalo en Entrenadores." },
    ],
  },
  cobro_por_vencer: {
    label: "Cobro próximo a vencer",
    color: "#F5A623",
    emoji: "⏰",
    panelHeading: "Qué necesitas revisar",
    steps: [
      { emoji: "⏰", title: "Cobro próximo", desc: "Vence en los próximos días." },
      { emoji: "💬", title: "Contacta al entrenador", desc: "Confirma que el pago esté en camino." },
      { emoji: "✅", title: "Verifica el pago", desc: "Márcalo al día cuando confirmes." },
      { emoji: "🔒", title: "Suspende si no paga", desc: "Cambia su acceso desde el panel." },
    ],
  },
};

const DEFAULT_META: NotificationTypeMeta = {
  label: "Notificación",
  color: "#6D2EFF",
  emoji: "🔔",
  panelHeading: "¿Qué sigue ahora?",
  steps: [],
};

// Datos de contacto/redes que van en el pie de cada correo. La imagen de la
// mascota vive en public/images/LogoWebMail.png — solo se verá una vez el
// sitio esté desplegado en producción (mientras tanto el link no resuelve).
const CONTACT = {
  whatsappDisplay: "+57 312 607 0588",
  whatsappLink: "https://wa.me/573126070588",
  hours: "Lunes a Viernes · 8:00 a.m. – 6:00 p.m. (GMT-5)",
  social: [
    { label: "Facebook", initial: "f", color: "#1877F2", url: "https://facebook.com/HakunnaFit" },
    { label: "Instagram", initial: "IG", color: "#D62E7D", url: "https://instagram.com/HakunnaFit" },
    { label: "TikTok", initial: "♪", color: "#111318", url: "https://www.tiktok.com/@HakunnaFit" },
  ],
};

/**
 * Correo dirigido al solicitante/entrenador (no a Nando) — mismo diseño de
 * marca que renderNotificationEmail (hero oscuro + mascota + footer de
 * contacto), pero saludando por su nombre real y sin el panel interno de
 * "pasos para Nando". Se usa para el correo de aprobación de solicitud (con
 * el enlace de onboarding) y para avisos de "solicitar cambios" durante el
 * onboarding.
 */
export function renderLeadEmail(input: {
  nombre: string;
  title: string;
  message: string;
  ctaLabel?: string;
  ctaUrl?: string;
  color?: string;
}): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://hakunnafit.com";
  const color = input.color || "#22C55E";
  const nombre = escapeHtml(input.nombre);
  const title = escapeHtml(input.title);
  const message = escapeHtml(input.message);
  const mascotUrl = `${siteUrl}/images/LogoWebMail.png`;
  const logoUrl = `${siteUrl}/images/LogoHorizontal-trasnparente.png`;

  const socialCircles = CONTACT.social
    .map(
      (s) =>
        `<a href="${s.url}" style="display:inline-block;width:32px;height:32px;border-radius:50%;background-color:${s.color};color:#ffffff;font-size:12px;font-weight:700;text-align:center;line-height:32px;text-decoration:none;margin-right:8px;">${s.initial}</a>`
    )
    .join("");

  const FONT_HEAD = `<style>
      @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=Inter:wght@400;500;600;700&display=swap');
      .hf-heading { font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
      .hf-body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    </style>`;

  return `<!doctype html>
<html lang="es">
  <head>${FONT_HEAD}</head>
  <body style="margin:0;padding:0;background-color:#f2f2f6;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;" class="hf-body">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f2f2f6;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#0b0f1a;border-radius:20px;overflow:hidden;">

            <tr>
              <td align="center" style="padding:14px 24px;background-color:#0b0f1a;border-bottom:1px solid #1b2032;">
                <p style="margin:0;font-size:12px;color:#ffffff;">
                  Hakunna Fit &bull; <span style="color:${color};">Entrena Inteligente. Vive Más Fuerte.</span>
                </p>
              </td>
            </tr>

            <tr>
              <td align="center" style="padding:36px 32px 40px;background-color:#0b0f1a;">
                <img src="${logoUrl}" width="220" alt="HakunnaFit" style="display:block;width:220px;height:auto;margin:0 auto 22px;" />
                <p class="hf-heading" style="margin:0 0 14px;font-family:'Space Grotesk',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:20px;font-weight:700;color:#ffffff;text-align:center;">
                  ¡Hola, <span style="color:${color};">${nombre}</span>!
                </p>
                <p class="hf-heading" style="margin:0 0 10px;font-family:'Space Grotesk',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:17px;font-weight:700;line-height:1.4;color:#ffffff;text-align:center;">${title}</p>
                <p style="margin:0 0 24px;font-size:13.5px;line-height:1.65;color:#aeb2c4;text-align:center;max-width:440px;">${message}</p>
                ${
                  input.ctaUrl && input.ctaLabel
                    ? `<a href="${input.ctaUrl}" style="display:inline-block;padding:13px 32px;border-radius:999px;background-color:${color};color:#ffffff;font-size:13px;font-weight:600;text-decoration:none;">${escapeHtml(input.ctaLabel)} →</a>`
                    : ""
                }
              </td>
            </tr>

            <tr>
              <td align="center" style="padding:28px 32px 28px;background-color:#ffffff;border-top-left-radius:22px;border-top-right-radius:22px;">
                <img src="${mascotUrl}" width="96" alt="HakunnaFit" style="display:block;width:96px;height:auto;margin:0 auto 14px;" />
                <p style="margin:0 0 16px;font-size:11.5px;line-height:1.6;color:#6b7086;text-align:center;max-width:380px;">
                  Hakunna Fit es el ecosistema digital para entrenadores que quieren escalar su negocio.
                </p>
                <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#0b0f1a;text-align:center;">¿Dudas? Contáctanos</p>
                <p style="margin:0 0 4px;font-size:11.5px;color:#6b7086;text-align:center;">
                  <a href="mailto:soporte@send.hakunnafit.com" style="color:#6b7086;text-decoration:none;">soporte@send.hakunnafit.com</a>
                  &nbsp;·&nbsp;
                  <a href="${CONTACT.whatsappLink}" style="color:#6b7086;text-decoration:none;">${CONTACT.whatsappDisplay}</a>
                </p>
              </td>
            </tr>

            <tr>
              <td align="center" style="padding:8px 32px 28px;background-color:#0b0f1a;">
                <div style="text-align:center;margin-bottom:14px;">${socialCircles}</div>
                <p style="margin:0;font-size:11px;font-weight:700;color:#00C8FF;text-align:center;">Entrena Inteligente.</p>
                <p style="margin:0;font-size:11px;font-weight:700;color:#FF2DB8;text-align:center;">Vive Más Fuerte.</p>
              </td>
            </tr>

            <tr>
              <td style="padding:16px 32px;background-color:#0b0f1a;border-top:1px solid #1b2032;">
                <p style="margin:0;font-size:10.5px;line-height:1.5;color:#6b7086;text-align:center;">
                  © ${new Date().getFullYear()} Hakunna Fit. Todos los derechos reservados.<br />
                  Este correo fue enviado automáticamente, por favor no respondas a este mensaje.
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/**
 * Arma el HTML de la notificación siguiendo la línea visual de referencia:
 * barra superior con el eslogan, hero oscuro con la mascota y el saludo,
 * panel blanco de 4 pasos (contenido distinto según el tipo de aviso),
 * banner de confianza y footer de 3 columnas (marca / contacto / redes).
 * Usa solo estilos inline y tablas para verse bien en Gmail, Outlook, etc.
 */
export function renderNotificationEmail(input: {
  type: string;
  title: string;
  message: string;
  link?: string | null;
}): string {
  const meta = NOTIFICATION_META[input.type] ?? DEFAULT_META;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://hakunnafit.com";
  const absoluteLink = input.link ? `${siteUrl}${input.link}` : null;

  const title = escapeHtml(input.title);
  const message = escapeHtml(input.message);
  const mascotUrl = `${siteUrl}/images/LogoWebMail.png`;
  const logoUrl = `${siteUrl}/images/LogoHorizontal-trasnparente.png`;

  const stepsRows: string[] = [];
  for (let i = 0; i < meta.steps.length; i += 2) {
    const pair = meta.steps.slice(i, i + 2);
    stepsRows.push(`
              <tr>
                ${pair
                  .map(
                    (s, idx) => `
                <td width="50%" valign="top" style="padding:0 10px 20px 10px;">
                  <p style="margin:0 0 4px;font-size:13.5px;font-weight:700;color:#0b0f1a;">
                    <span style="display:inline-block;width:18px;height:18px;border-radius:50%;background-color:${meta.color};color:#ffffff;font-size:10px;font-weight:800;text-align:center;line-height:18px;margin-right:6px;">${i + idx + 1}</span>
                    ${escapeHtml(s.title)}
                  </p>
                  <p style="margin:0;font-size:12px;line-height:1.5;color:#6b7086;padding-left:24px;">${escapeHtml(s.desc)}</p>
                </td>`
                  )
                  .join("")}
                ${pair.length === 1 ? `<td width="50%"></td>` : ""}
              </tr>`);
  }

  const socialCircles = CONTACT.social
    .map(
      (s) =>
        `<a href="${s.url}" style="display:inline-block;width:32px;height:32px;border-radius:50%;background-color:${s.color};color:#ffffff;font-size:12px;font-weight:700;text-align:center;line-height:32px;text-decoration:none;margin-right:8px;">${s.initial}</a>`
    )
    .join("");

  // Los clientes de correo no soportan next/font/google de forma nativa y
  // muchos (Outlook de escritorio en particular) ignoran por completo hojas
  // de estilo externas o @font-face — por eso esto es "mejora progresiva":
  // se referencia Google Fonts vía su endpoint oficial (@import, que Apple
  // Mail, iOS Mail, Gmail app y clientes web sí respetan); donde no cargue,
  // cae automáticamente en el stack de sistema ya usado en todo el correo,
  // que es visualmente muy cercano. Encabezados -> Space Grotesk 600/700,
  // cuerpo -> Inter 400-700.
  const FONT_HEAD = `<style>
      @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=Inter:wght@400;500;600;700&display=swap');
      .hf-heading { font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
      .hf-body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    </style>`;

  return `<!doctype html>
<html lang="es">
  <head>${FONT_HEAD}</head>
  <body style="margin:0;padding:0;background-color:#f2f2f6;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;" class="hf-body">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f2f2f6;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#0b0f1a;border-radius:20px;overflow:hidden;">

            <!-- Barra superior -->
            <tr>
              <td align="center" style="padding:14px 24px;background-color:#0b0f1a;border-bottom:1px solid #1b2032;">
                <p style="margin:0;font-size:12px;color:#ffffff;">
                  Hakunna Fit &bull; <span style="color:${meta.color};">Entrena Inteligente. Vive Más Fuerte.</span>
                </p>
              </td>
            </tr>

            <!-- Hero -->
            <tr>
              <td align="center" style="padding:36px 32px 40px;background-color:#0b0f1a;">
                <img src="${logoUrl}" width="220" alt="HakunnaFit" style="display:block;width:220px;height:auto;margin:0 auto 22px;" />
                <p class="hf-heading" style="margin:0 0 14px;font-family:'Space Grotesk',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:20px;font-weight:700;color:#ffffff;text-align:center;">
                  ¡Hola, <span style="color:${meta.color};">Nando</span>!
                </p>
                <span class="hf-body" style="display:inline-block;margin:0 0 12px;padding:5px 12px;border-radius:999px;background-color:${meta.color}22;color:${meta.color};font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.04em;">
                  ${meta.label}
                </span>
                <p class="hf-heading" style="margin:0 0 10px;font-family:'Space Grotesk',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:17px;font-weight:700;line-height:1.4;color:#ffffff;text-align:center;">${title}</p>
                <p style="margin:0 0 24px;font-size:13.5px;line-height:1.65;color:#aeb2c4;text-align:center;max-width:440px;">${message}</p>
                ${
                  absoluteLink
                    ? `<a href="${absoluteLink}" style="display:inline-block;padding:13px 32px;border-radius:999px;background-color:${meta.color};color:#ffffff;font-size:13px;font-weight:600;text-decoration:none;">Ver en el panel →</a>`
                    : ""
                }
              </td>
            </tr>

            <!-- Panel de pasos -->
            <tr>
              <td style="padding:32px;background-color:#ffffff;border-top-left-radius:22px;border-top-right-radius:22px;">
                <p class="hf-heading" style="margin:0 0 20px;font-family:'Space Grotesk',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:17px;font-weight:600;color:#0b0f1a;text-align:center;">${escapeHtml(meta.panelHeading)}</p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                  ${stepsRows.join("")}
                </table>
              </td>
            </tr>

            <!-- Banner de confianza -->
            <tr>
              <td style="padding:0 32px 24px;background-color:#ffffff;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #232838;border-radius:14px;">
                  <tr>
                    <td style="padding:16px 20px;">
                      <p style="margin:0 0 3px;font-size:13px;font-weight:700;color:#0b0f1a;">🛡️ Correo verificado del panel de HakunnaFit</p>
                      <p style="margin:0;font-size:12px;color:#6b7086;">Este aviso proviene de tu sistema — tu información está protegida.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Footer: centrado, con la mascota -->
            <tr>
              <td align="center" style="padding:8px 32px 28px;background-color:#0b0f1a;">
                <img src="${mascotUrl}" width="96" alt="HakunnaFit" style="display:block;width:96px;height:auto;margin:0 auto 14px;" />
                <p style="margin:0 0 16px;font-size:11.5px;line-height:1.6;color:#8a8fa3;text-align:center;max-width:380px;">
                  Hakunna Fit es el ecosistema digital para entrenadores que quieren escalar su negocio.
                </p>
                <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#ffffff;text-align:center;">Contáctanos</p>
                <p style="margin:0 0 4px;font-size:11.5px;color:#aeb2c4;text-align:center;">
                  <a href="mailto:soporte@send.hakunnafit.com" style="color:#aeb2c4;text-decoration:none;">soporte@send.hakunnafit.com</a>
                  &nbsp;·&nbsp;
                  <a href="${CONTACT.whatsappLink}" style="color:#aeb2c4;text-decoration:none;">${CONTACT.whatsappDisplay}</a>
                </p>
                <p style="margin:0 0 18px;font-size:11.5px;color:#aeb2c4;text-align:center;">${CONTACT.hours}</p>
                <div style="text-align:center;margin-bottom:14px;">${socialCircles}</div>
                <p style="margin:0;font-size:11px;font-weight:700;color:#00C8FF;text-align:center;">Entrena Inteligente.</p>
                <p style="margin:0;font-size:11px;font-weight:700;color:#FF2DB8;text-align:center;">Vive Más Fuerte.</p>
              </td>
            </tr>

            <!-- Legal -->
            <tr>
              <td style="padding:16px 32px;background-color:#0b0f1a;border-top:1px solid #1b2032;">
                <p style="margin:0;font-size:10.5px;line-height:1.5;color:#6b7086;text-align:center;">
                  © ${new Date().getFullYear()} Hakunna Fit. Todos los derechos reservados.<br />
                  Este correo fue enviado automáticamente, por favor no respondas a este mensaje.
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
