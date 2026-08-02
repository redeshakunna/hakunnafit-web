// El único generador de HTML de correo de todo HakunnaFit — ver
// docs/EMAIL_ARCHITECTURE.md sección 2. Ningún flow arma su propio <html>;
// todos pasan por acá.

import { escapeHtml, readableTextColor } from "./util";
import { hakunnaFitMascotUrl } from "./constants";
import { resolveAccentColor, resolveHeaderHtml, resolveFooterHtml, resolveUnsubscribeFooterNote, type HakunnaFitContactOverride } from "./identity";
import type { EmailContext } from "./types";

const FONT_HEAD = `<style>
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@600;700&family=Inter:wght@400;500;600;700&display=swap');
  .hf-heading { font-family: 'Space Grotesk', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
  .hf-body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
</style>`;

function preheaderBlock(text?: string): string {
  if (!text) return "";
  // Texto invisible que solo se usa para controlar la línea de preview en
  // la bandeja de entrada (Gmail/Outlook la muestran junto al asunto) — el
  // padding gigante evita que el cliente de correo lo muestre por error.
  return `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(text)}${"&nbsp;".repeat(80)}</div>`;
}

function infoBoxHtml(ctx: EmailContext, accent: string): string {
  if (!ctx.infoBox || ctx.infoBox.rows.length === 0) return "";
  const rows = ctx.infoBox.rows
    .map(
      (r) => `
      <tr>
        <td style="padding:8px 0;font-size:12.5px;color:#6b7086;border-bottom:1px solid #f0f0f4;">${escapeHtml(r.label)}</td>
        <td style="padding:8px 0;font-size:12.5px;font-weight:600;color:#0b0f1a;text-align:right;border-bottom:1px solid #f0f0f4;">${escapeHtml(r.value)}</td>
      </tr>`
    )
    .join("");
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px;border:1px solid #ececf2;border-radius:14px;overflow:hidden;">
      <tr><td style="padding:16px 20px;">
        ${ctx.infoBox.title ? `<p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#0b0f1a;text-transform:uppercase;letter-spacing:0.04em;">${escapeHtml(ctx.infoBox.title)}</p>` : ""}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rows}</table>
      </td></tr>
    </table>
  `;
}

/**
 * @param hakunnafitContact Contacto/redes de HakunnaFit editable desde
 * /panel-hakunna/configuracion (platform_settings) — lo resuelve
 * lib/mail/send.ts antes de llamar acá; si no se pasa, se usan los valores
 * por defecto de código (ver identity.ts).
 */
export function renderEmailShell(ctx: EmailContext, hakunnafitContact?: HakunnaFitContactOverride): string {
  const accent = resolveAccentColor(ctx.brand, ctx.accentColorOverride);
  const buttonTextColor = readableTextColor(accent);
  const header = resolveHeaderHtml(ctx.brand, ctx.audience);
  const footer = resolveFooterHtml(ctx.brand, ctx.audience, hakunnafitContact);
  const mascotUrl = hakunnaFitMascotUrl();

  return `<!doctype html>
<html lang="es">
  <head>${FONT_HEAD}</head>
  <body style="margin:0;padding:0;background-color:#f2f2f6;font-family:'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;" class="hf-body">
    ${preheaderBlock(ctx.preheader)}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f2f2f6;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#0b0f1a;border-radius:20px;overflow:hidden;">

            <!-- Header -->
            <tr>
              <td align="center" style="padding:36px 32px 28px;background-color:#0b0f1a;">
                ${header}
              </td>
            </tr>

            <!-- Contenido -->
            <tr>
              <td style="padding:8px 32px 32px;background-color:#ffffff;border-top-left-radius:22px;border-top-right-radius:22px;">
                <p class="hf-heading" style="margin:24px 0 6px;font-family:'Space Grotesk',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:19px;font-weight:700;color:#0b0f1a;">
                  ¡Hola, ${escapeHtml(ctx.recipientName)}!
                </p>
                <p class="hf-heading" style="margin:0 0 10px;font-family:'Space Grotesk',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;font-weight:700;line-height:1.4;color:#0b0f1a;">
                  ${escapeHtml(ctx.heading)}
                </p>
                <p style="margin:0;font-size:13.5px;line-height:1.65;color:#4b4f5e;">
                  ${escapeHtml(ctx.message)}
                </p>

                ${
                  ctx.primaryButton
                    ? `<a href="${ctx.primaryButton.url}" style="display:inline-block;margin-top:22px;padding:13px 32px;border-radius:999px;background-color:${accent};color:${buttonTextColor};font-size:13px;font-weight:600;text-decoration:none;">${escapeHtml(ctx.primaryButton.label)} →</a>`
                    : ""
                }

                ${infoBoxHtml(ctx, accent)}
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td align="center" style="padding:24px 32px 28px;background-color:#0b0f1a;">
                ${ctx.brand.kind === "hakunnafit" ? `<img src="${mascotUrl}" width="72" alt="HakunnaFit" style="display:block;width:72px;height:auto;margin:0 auto 14px;" />` : ""}
                ${footer}
              </td>
            </tr>

            <!-- Legal -->
            <tr>
              <td style="padding:14px 32px;background-color:#0b0f1a;border-top:1px solid #1b2032;">
                <p style="margin:0;font-size:10px;line-height:1.5;color:#565a6b;text-align:center;">
                  ${resolveUnsubscribeFooterNote()}
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
