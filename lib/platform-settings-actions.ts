"use server";

// Configuración fundamental de HakunnaFit como marca/negocio — antes vivía
// fija en constantes de código repartidas entre lib/email.ts y lib/mail/
// (CONTACT/HAKUNNAFIT_CONTACT) y en variables de entorno
// (ADMIN_NOTIFICATION_EMAIL, EMAIL_FROM). Ahora la fuente de verdad es la
// tabla platform_settings (fila única), editable desde
// /panel-hakunna/configuracion — mismo patrón que plan-settings-actions.ts:
// si la tabla está vacía o falla la lectura, se cae en los valores por
// defecto de siempre, así el sitio y los correos nunca se quedan sin
// configuración funcional.

import { getSupabaseAdmin } from "./supabase-admin";
import { isAdminAuthenticated } from "./admin-auth";

export interface PlatformSettings {
  contactEmail: string;
  contactWhatsapp: string;
  contactWhatsappDisplay: string;
  instagramUrl: string;
  facebookUrl: string;
  tiktokUrl: string;
  resendFromAddress: string;
  adminNotificationEmail: string;
}

// Mismos valores que estaban fijos en el código — ahora son solo el
// respaldo por si la tabla no responde o algún campo se deja vacío.
const FALLBACK_SETTINGS: PlatformSettings = {
  contactEmail: "soporte@send.hakunnafit.com",
  contactWhatsapp: "573126070588",
  contactWhatsappDisplay: "+57 312 607 0588",
  instagramUrl: "https://instagram.com/HakunnaFit",
  facebookUrl: "https://facebook.com/HakunnaFit",
  tiktokUrl: "https://www.tiktok.com/@HakunnaFit",
  resendFromAddress: "soporte@send.hakunnafit.com",
  adminNotificationEmail: "redeshakunna@gmail.com",
};

export async function getPlatformSettings(): Promise<PlatformSettings> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("platform_settings").select("*").eq("id", 1).maybeSingle();
    if (error || !data) return FALLBACK_SETTINGS;

    return {
      contactEmail: data.contact_email?.trim() || FALLBACK_SETTINGS.contactEmail,
      contactWhatsapp: data.contact_whatsapp?.trim() || FALLBACK_SETTINGS.contactWhatsapp,
      contactWhatsappDisplay: data.contact_whatsapp_display?.trim() || FALLBACK_SETTINGS.contactWhatsappDisplay,
      instagramUrl: data.instagram_url?.trim() || FALLBACK_SETTINGS.instagramUrl,
      facebookUrl: data.facebook_url?.trim() || FALLBACK_SETTINGS.facebookUrl,
      tiktokUrl: data.tiktok_url?.trim() || FALLBACK_SETTINGS.tiktokUrl,
      resendFromAddress: data.resend_from_address?.trim() || FALLBACK_SETTINGS.resendFromAddress,
      adminNotificationEmail: data.admin_notification_email?.trim() || FALLBACK_SETTINGS.adminNotificationEmail,
    };
  } catch {
    return FALLBACK_SETTINGS;
  }
}

export interface AdminActionResult {
  ok: boolean;
  error?: string;
}

export async function updatePlatformSettings(input: PlatformSettings): Promise<AdminActionResult> {
  const ok = await isAdminAuthenticated();
  if (!ok) throw new Error("No autorizado");

  if (input.contactEmail && !input.contactEmail.includes("@")) {
    return { ok: false, error: "El correo de contacto no es válido." };
  }
  if (input.resendFromAddress && !input.resendFromAddress.includes("@")) {
    return { ok: false, error: "El remitente de correo no es válido." };
  }
  if (input.adminNotificationEmail && !input.adminNotificationEmail.includes("@")) {
    return { ok: false, error: "El correo de notificaciones internas no es válido." };
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("platform_settings").upsert({
    id: 1,
    contact_email: input.contactEmail.trim(),
    contact_whatsapp: input.contactWhatsapp.trim(),
    contact_whatsapp_display: input.contactWhatsappDisplay.trim(),
    instagram_url: input.instagramUrl.trim(),
    facebook_url: input.facebookUrl.trim(),
    tiktok_url: input.tiktokUrl.trim(),
    resend_from_address: input.resendFromAddress.trim(),
    admin_notification_email: input.adminNotificationEmail.trim(),
    updated_at: new Date().toISOString(),
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
