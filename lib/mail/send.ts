import { getSupabaseAdmin } from "../supabase-admin";
import { getPlatformSettings } from "../platform-settings-actions";
import { renderEmailShell } from "./layout";
import { resolveSenderName, resolveReplyTo } from "./identity";
import { resendFromAddress } from "./constants";
import type { FlowResult } from "./types";

const RESEND_API_URL = "https://api.resend.com/emails";

interface SendOptions {
  isTest?: boolean;
}

async function logEmail(
  flow: FlowResult,
  status: "sent" | "failed" | "skipped_config",
  isTest: boolean,
  error?: string
): Promise<void> {
  const supabase = getSupabaseAdmin();
  // Un fallo al escribir el log nunca debe tumbar el flujo que sí mandó (o
  // intentó mandar) el correo — es un registro auxiliar, no una dependencia
  // dura del envío.
  try {
    await supabase.from("email_log").insert({
      flow_id: flow.flowId,
      category: flow.category,
      to_email: flow.context.to,
      subject: flow.context.subject,
      status,
      is_test: isTest,
      error: error ? error.slice(0, 500) : null,
    });
  } catch {
    // ignorar
  }
}

/**
 * Único punto de envío real de correo de toda la plataforma — todo flow
 * (corporativo, entrenador o cliente) termina llamando acá. Arma el
 * remitente/reply-to según la marca (ver identity.ts), renderiza el layout
 * único (ver layout.ts) y deja constancia en email_log sin importar si el
 * envío tuvo éxito, falló, o se omitió por falta de configuración — ese
 * registro es justamente lo que permite diagnosticar después un "no me
 * llegó el correo" en vez de adivinar.
 */
export async function sendEmail(flow: FlowResult, opts: SendOptions = {}): Promise<void> {
  const isTest = opts.isTest ?? false;
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    await logEmail(flow, "skipped_config", isTest, "RESEND_API_KEY no configurada");
    return;
  }
  if (!flow.context.to) {
    await logEmail(flow, "skipped_config", isTest, "Destinatario vacío");
    return;
  }

  // Config editable desde /panel-hakunna/configuracion (platform_settings) —
  // el remitente real y el contacto de HakunnaFit del footer salen de ahí,
  // con la constante de código como respaldo si la BD no responde.
  const settings = await getPlatformSettings();
  const fromAddress = settings.resendFromAddress?.trim() || resendFromAddress();
  const hakunnafitContact = {
    email: settings.contactEmail,
    whatsappDisplay: settings.contactWhatsappDisplay,
    whatsappLink: `https://wa.me/${settings.contactWhatsapp.replace(/[^\d]/g, "")}`,
    instagramUrl: settings.instagramUrl,
    facebookUrl: settings.facebookUrl,
    tiktokUrl: settings.tiktokUrl,
  };

  const fromName = resolveSenderName(flow.context.brand);
  const replyTo = resolveReplyTo(flow.context.brand);
  const html = renderEmailShell(flow.context, hakunnafitContact);

  try {
    const res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: `${fromName} <${fromAddress}>`,
        to: flow.context.to,
        subject: flow.context.subject,
        html,
        ...(replyTo ? { reply_to: replyTo } : {}),
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => res.statusText);
      await logEmail(flow, "failed", isTest, errText);
      return;
    }

    await logEmail(flow, "sent", isTest);
  } catch (err) {
    await logEmail(flow, "failed", isTest, (err as Error).message ?? "Error desconocido");
  }
}
