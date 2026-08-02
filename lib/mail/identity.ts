import { escapeHtml } from "./util";
import { HAKUNNAFIT_CONTACT, hakunnaFitLogoUrl, siteUrl } from "./constants";
import type { Brand, Audience, TrainerBrandingData } from "./types";

const HAKUNNAFIT_ACCENT = "#00C8FF";

export function resolveAccentColor(brand: Brand, override?: string): string {
  if (override) return override;
  return brand.kind === "trainer" ? brand.trainer.colorPrimario || HAKUNNAFIT_ACCENT : HAKUNNAFIT_ACCENT;
}

/** Remitente que ve el destinatario en su bandeja de entrada. El dominio de
 * envío siempre es el mismo (verificado una sola vez en Resend); lo que
 * cambia es el nombre visible — así no hace falta verificar un
 * subdominio distinto por cada entrenador para que "se vea" como si viniera
 * de su negocio. */
export function resolveSenderName(brand: Brand): string {
  if (brand.kind === "hakunnafit") return "Hakunna Fit";
  return `${brand.trainer.businessName} vía Hakunna Fit`;
}

/** Si el entrenador tiene correo público, las respuestas del cliente/
 * entrenador le llegan a él directamente en vez de a soporte@hakunnafit —
 * mismo patrón que usan Calendly/Acuity para correos "en nombre de". */
export function resolveReplyTo(brand: Brand): string | undefined {
  if (brand.kind === "trainer" && brand.trainer.emailPublico) return brand.trainer.emailPublico;
  return undefined;
}

function trainerLogoBlock(trainer: TrainerBrandingData): string {
  if (trainer.logoUrl) {
    return `<img src="${trainer.logoUrl}" width="72" height="72" alt="${escapeHtml(trainer.businessName)}" style="display:block;width:72px;height:72px;border-radius:16px;object-fit:cover;margin:0 auto 18px;" />`;
  }
  // Fallback sin logo subido: nombre estilizado, mismo criterio que ya usa
  // el editor del entrenador en la landing (ver components/hakunnafit/*
  // "logo con fallback a nombre estilizado").
  return `<p style="margin:0 0 18px;font-family:'Space Grotesk',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:22px;font-weight:700;color:#ffffff;text-align:center;">${escapeHtml(trainer.businessName)}</p>`;
}

export function resolveHeaderHtml(brand: Brand, audience: Audience): string {
  if (brand.kind === "hakunnafit") {
    return `<img src="${hakunnaFitLogoUrl()}" width="220" alt="HakunnaFit" style="display:block;width:220px;height:auto;margin:0 auto 8px;" />`;
  }

  const logo = trainerLogoBlock(brand.trainer);
  // audience "client" agrega un subtítulo cercano ("tu entrenador") — mismo
  // logo/marca, tono distinto, tal como pide el brief de arquitectura.
  const subtitle =
    audience === "client"
      ? `<p style="margin:0;font-size:12px;color:#aeb2c4;text-align:center;">Tu entrenador</p>`
      : "";
  return `${logo}${subtitle}`;
}

function trainerContactLines(trainer: { whatsapp: string | null; instagram: string | null; subdominio: string | null; emailPublico: string | null }): string {
  const lines: string[] = [];
  if (trainer.whatsapp) {
    const digits = trainer.whatsapp.replace(/[^\d]/g, "");
    if (digits) lines.push(`<a href="https://wa.me/${digits}" style="color:#aeb2c4;text-decoration:none;">WhatsApp</a>`);
  }
  if (trainer.instagram) {
    lines.push(`<a href="https://instagram.com/${trainer.instagram.replace(/^@/, "")}" style="color:#aeb2c4;text-decoration:none;">Instagram</a>`);
  }
  if (trainer.subdominio) {
    lines.push(`<a href="https://${trainer.subdominio}.hakunnafit.com" style="color:#aeb2c4;text-decoration:none;">Su sitio</a>`);
  }
  if (trainer.emailPublico) {
    lines.push(`<a href="mailto:${trainer.emailPublico}" style="color:#aeb2c4;text-decoration:none;">${escapeHtml(trainer.emailPublico)}</a>`);
  }
  return lines.join(" &nbsp;·&nbsp; ");
}

/** Datos de contacto de HakunnaFit que sí son operativamente editables desde
 * /panel-hakunna/configuracion (platform_settings) — el color/inicial de
 * cada red social se queda fijo en código (es identidad de marca, no
 * "configuración"), solo la URL de cada red y los datos de contacto directo
 * se pueden reemplazar. Si no se pasa nada, se usan los valores por defecto
 * de HAKUNNAFIT_CONTACT (constants.ts). */
export interface HakunnaFitContactOverride {
  email: string;
  whatsappDisplay: string;
  whatsappLink: string;
  instagramUrl: string;
  facebookUrl: string;
  tiktokUrl: string;
}

function resolveHakunnaFitSocialUrl(label: string, override?: HakunnaFitContactOverride): string {
  if (!override) return HAKUNNAFIT_CONTACT.social.find((s) => s.label === label)?.url ?? "#";
  if (label === "Instagram") return override.instagramUrl;
  if (label === "Facebook") return override.facebookUrl;
  if (label === "TikTok") return override.tiktokUrl;
  return "#";
}

/** Footer — la única diferencia real entre audiencia "trainer" y "client"
 * dentro de una marca de entrenador: al entrenador se le muestran TODOS sus
 * canales de contacto (para que los reconozca como propios); al cliente
 * solo lo esencial + el sello de HakunnaFit como proveedor de tecnología. */
export function resolveFooterHtml(brand: Brand, audience: Audience, hakunnafitContact?: HakunnaFitContactOverride): string {
  if (brand.kind === "hakunnafit") {
    const email = hakunnafitContact?.email || HAKUNNAFIT_CONTACT.email;
    const whatsappDisplay = hakunnafitContact?.whatsappDisplay || HAKUNNAFIT_CONTACT.whatsappDisplay;
    const whatsappLink = hakunnafitContact?.whatsappLink || HAKUNNAFIT_CONTACT.whatsappLink;
    const socialCircles = HAKUNNAFIT_CONTACT.social
      .map(
        (s) =>
          `<a href="${resolveHakunnaFitSocialUrl(s.label, hakunnafitContact)}" style="display:inline-block;width:32px;height:32px;border-radius:50%;background-color:${s.color};color:#ffffff;font-size:12px;font-weight:700;text-align:center;line-height:32px;text-decoration:none;margin-right:8px;">${s.initial}</a>`
      )
      .join("");
    return `
      <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#ffffff;text-align:center;">Contáctanos</p>
      <p style="margin:0 0 14px;font-size:11.5px;color:#aeb2c4;text-align:center;">
        <a href="mailto:${email}" style="color:#aeb2c4;text-decoration:none;">${email}</a>
        &nbsp;·&nbsp;
        <a href="${whatsappLink}" style="color:#aeb2c4;text-decoration:none;">${whatsappDisplay}</a>
      </p>
      <div style="text-align:center;margin-bottom:6px;">${socialCircles}</div>
    `;
  }

  const contactLine = trainerContactLines(brand.trainer);
  const poweredBy = `<p style="margin:14px 0 0;font-size:10.5px;color:#6b7086;text-align:center;">Powered by <span style="color:#8a8fa3;">Hakunna Fit</span></p>`;

  if (audience === "trainer") {
    return `
      <p style="margin:0 0 6px;font-size:12px;font-weight:700;color:#ffffff;text-align:center;">${escapeHtml(brand.trainer.businessName)}</p>
      ${contactLine ? `<p style="margin:0;font-size:11.5px;color:#aeb2c4;text-align:center;">${contactLine}</p>` : ""}
      ${poweredBy}
    `;
  }

  // audience "client": solo el contacto del entrenador, sin repetir su
  // nombre otra vez (ya salió en el header) + el sello de HakunnaFit.
  return `
    ${contactLine ? `<p style="margin:0;font-size:11.5px;color:#aeb2c4;text-align:center;">${contactLine}</p>` : ""}
    ${poweredBy}
  `;
}

export function resolveUnsubscribeFooterNote(): string {
  return `Este correo fue enviado automáticamente desde <a href="${siteUrl()}" style="color:#6b7086;">HakunnaFit</a>, por favor no respondas directamente si no aplica.`;
}
