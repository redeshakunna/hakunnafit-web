// Datos de contacto oficiales de HakunnaFit para el footer corporativo y
// para el "Powered by" de los correos con marca de entrenador. Vive aparte
// de lib/email.ts a propósito: lib/email.ts (legacy) pasa a depender de
// lib/email/*, así que lib/email/* nunca puede importar de vuelta desde
// lib/email.ts sin crear un ciclo.

export const HAKUNNAFIT_CONTACT = {
  email: "soporte@send.hakunnafit.com",
  whatsappDisplay: "+57 312 607 0588",
  whatsappLink: "https://wa.me/573126070588",
  social: [
    { label: "Facebook", initial: "f", color: "#1877F2", url: "https://facebook.com/HakunnaFit" },
    { label: "Instagram", initial: "IG", color: "#D62E7D", url: "https://instagram.com/HakunnaFit" },
    { label: "TikTok", initial: "♪", color: "#111318", url: "https://www.tiktok.com/@HakunnaFit" },
  ],
};

export function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://hakunnafit.com";
}

export function hakunnaFitLogoUrl(): string {
  return `${siteUrl()}/images/LogoHorizontal-trasnparente.png`;
}

export function hakunnaFitMascotUrl(): string {
  return `${siteUrl()}/images/LogoWebMail.png`;
}

/**
 * Dirección real de envío (la parte técnica del remitente, sin el nombre
 * visible — eso lo decide identity.ts según la marca). Prioridad:
 * RESEND_FROM_ADDRESS explícita > la dirección dentro de EMAIL_FROM legacy
 * (ej. "HakunnaFit <correo@dominio>" → "correo@dominio") > el dominio de
 * pruebas de Resend como último recurso. Este último caso casi seguro NO
 * entrega a destinatarios externos reales — ver docs/EMAIL_ARCHITECTURE.md.
 */
export function resendFromAddress(): string {
  if (process.env.RESEND_FROM_ADDRESS) return process.env.RESEND_FROM_ADDRESS;
  const legacy = process.env.EMAIL_FROM;
  if (legacy) {
    const match = legacy.match(/<([^>]+)>/);
    if (match) return match[1];
    if (legacy.includes("@")) return legacy.trim();
  }
  return "onboarding@resend.dev";
}
