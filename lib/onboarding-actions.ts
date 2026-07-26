"use server";

// Server actions del wizard de onboarding — a diferencia de admin-actions.ts,
// nada aquí se protege con requireAdmin(): el entrenador todavía no tiene
// sesión (ni siquiera credenciales). Cada función valida el token de
// onboarding en su lugar. El token es de una sola solicitud/sesión de
// onboarding, no de un solo uso literal: mientras la solicitud siga en
// "aprobada" o "en_onboarding" se puede reabrir y seguir completando (así
// tiene sentido el guardado automático); deja de servir para escribir en
// cuanto el entrenador confirma el último paso o Nando la rechaza/cancela.

import { getSupabaseAdmin } from "./supabase-admin";
import { RESERVED_SUBDOMAINS, slugify } from "./slug";
import { createNotification } from "./notifications";
import type { PlanKey } from "./catalog";
import type { AdminActionResult, Estadistica, Testimonio, TransformacionPar } from "./admin-actions";

const MAX_AVATAR_BYTES = 3 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export type OnboardingErrorReason = "not_found" | "expired";

export interface OnboardingSessionData {
  plan: PlanKey;
  estado: string;
  completed: boolean;
  currentStep: string | null;
  businessName: string;
  whatsapp: string | null;
  ciudad: string | null;
  especialidad: string | null;
  biografia: string | null;
  instagram: string | null;
  facebook: string | null;
  emailPublico: string | null;
  subdominio: string | null;
  landingTemplate: string | null;
  tagline: string | null;
  avatarUrl: string | null;
  foto2Url: string | null;
  foto3Url: string | null;
  foto4Url: string | null;
  servicios: { titulo: string; descripcion: string; tipo: "directo" | "personalizado" }[] | null;
  mostrarTransformaciones: boolean;
  transformaciones: TransformacionPar[] | null;
  estadisticas: Estadistica[] | null;
  testimonios: Testimonio[] | null;
  revisionNotas: string | null;
}

type LoadedSession = {
  lead: {
    id: string;
    nombre: string;
    estado: string;
    revision_notas: string | null;
  };
  // El registro completo de trainers (Row) — se deja como any porque cada
  // campo que se usa ya se castea explícitamente al leerlo (as string, as
  // PlanKey, etc.), y así se evita el problema de asignar un tipo con
  // propiedades concretas a un tipo con índice de string (Record<string,
  // unknown>), que TypeScript rechaza aunque las formas sean compatibles.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  trainer: any;
};

// Estados en los que la solicitud todavía acepta cambios del entrenador.
const WRITABLE_ESTADOS = new Set(["aprobada", "en_onboarding"]);

async function loadOnboardingSession(
  token: string
): Promise<{ ok: true; data: LoadedSession } | { ok: false; error: OnboardingErrorReason }> {
  if (!token?.trim()) return { ok: false, error: "not_found" };
  const supabase = getSupabaseAdmin();

  const { data: lead } = await supabase
    .from("hakunnafit_leads")
    .select("id, nombre, estado, revision_notas, onboarding_token_expires_at")
    .eq("onboarding_token", token)
    .maybeSingle();

  if (!lead) return { ok: false, error: "not_found" };
  if (lead.estado === "rechazada" || lead.estado === "cancelada") return { ok: false, error: "not_found" };
  if (lead.onboarding_token_expires_at && new Date(lead.onboarding_token_expires_at) < new Date()) {
    return { ok: false, error: "expired" };
  }

  const { data: trainer } = await supabase.from("trainers").select("*").eq("lead_id", lead.id).maybeSingle();
  if (!trainer) return { ok: false, error: "not_found" };

  return { ok: true, data: { lead, trainer } };
}

/**
 * Carga la sesión de onboarding para renderizar el wizard. La primera vez
 * que se abre un enlace recién aprobado, confirma el token como usado y pasa
 * la solicitud de "aprobada" a "en_onboarding".
 */
export async function getOnboardingSession(
  token: string
): Promise<{ ok: true; data: OnboardingSessionData } | { ok: false; error: OnboardingErrorReason }> {
  const session = await loadOnboardingSession(token);
  if (!session.ok) return session;
  const { lead, trainer } = session.data;

  const supabase = getSupabaseAdmin();
  if (lead.estado === "aprobada") {
    await supabase
      .from("hakunnafit_leads")
      .update({ estado: "en_onboarding", onboarding_token_used_at: new Date().toISOString() })
      .eq("id", lead.id);
  } else {
    await supabase
      .from("hakunnafit_leads")
      .update({ onboarding_token_used_at: new Date().toISOString() })
      .eq("id", lead.id)
      .is("onboarding_token_used_at", null);
  }

  return {
    ok: true,
    data: {
      plan: trainer.plan as PlanKey,
      estado: lead.estado === "aprobada" ? "en_onboarding" : lead.estado,
      completed: !!trainer.onboarding_completed_at,
      currentStep: (trainer.onboarding_step as string | null) ?? null,
      businessName: trainer.business_name,
      whatsapp: trainer.whatsapp as string | null,
      ciudad: trainer.ciudad as string | null,
      especialidad: trainer.especialidad as string | null,
      biografia: trainer.biografia as string | null,
      instagram: trainer.instagram as string | null,
      facebook: trainer.facebook as string | null,
      emailPublico: trainer.email_publico as string | null,
      subdominio: trainer.subdominio as string | null,
      landingTemplate: trainer.landing_template as string | null,
      tagline: trainer.tagline as string | null,
      avatarUrl: trainer.avatar_url as string | null,
      foto2Url: trainer.foto2_url as string | null,
      foto3Url: trainer.foto3_url as string | null,
      foto4Url: trainer.foto4_url as string | null,
      servicios: trainer.servicios as OnboardingSessionData["servicios"],
      mostrarTransformaciones: trainer.mostrar_transformaciones as boolean,
      transformaciones: trainer.transformaciones as TransformacionPar[] | null,
      estadisticas: trainer.estadisticas as Estadistica[] | null,
      testimonios: trainer.testimonios as Testimonio[] | null,
      revisionNotas: lead.revision_notas,
    },
  };
}

export interface OnboardingStepInput {
  token: string;
  step: string;
  businessName?: string;
  whatsapp?: string | null;
  ciudad?: string | null;
  especialidad?: string | null;
  biografia?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  emailPublico?: string | null;
  subdominio?: string | null;
  landingTemplate?: string | null;
  tagline?: string | null;
  servicios?: { titulo: string; descripcion: string; tipo: "directo" | "personalizado" }[] | null;
}

/**
 * Guarda los campos de un paso del wizard — se llama al avanzar/retroceder
 * entre pasos (y otra vez al reabrir el enlace, si el entrenador vuelve más
 * tarde), no en cada tecleo. Acotado a las columnas que el propio entrenador
 * puede tocar; nunca toca plan, dashboard_access, landing_status, etc.
 */
export async function saveOnboardingStep(input: OnboardingStepInput): Promise<AdminActionResult> {
  const session = await loadOnboardingSession(input.token);
  if (!session.ok) {
    return { ok: false, error: session.error === "expired" ? "Este enlace ya venció." : "Enlace inválido." };
  }
  const { lead, trainer } = session.data;
  if (!WRITABLE_ESTADOS.has(lead.estado)) {
    return { ok: false, error: "Esta solicitud ya no acepta cambios en este momento." };
  }

  const supabase = getSupabaseAdmin();
  const update: {
    business_name?: string;
    whatsapp?: string | null;
    ciudad?: string | null;
    especialidad?: string | null;
    biografia?: string | null;
    instagram?: string | null;
    facebook?: string | null;
    email_publico?: string | null;
    tagline?: string | null;
    landing_template?: string | null;
    servicios?: { titulo: string; descripcion: string; tipo: "directo" | "personalizado" }[] | null;
    subdominio?: string;
    onboarding_step?: string;
  } = {};

  if (input.businessName !== undefined && input.businessName.trim()) update.business_name = input.businessName.trim();
  if (input.whatsapp !== undefined) update.whatsapp = input.whatsapp || null;
  if (input.ciudad !== undefined) update.ciudad = input.ciudad || null;
  if (input.especialidad !== undefined) update.especialidad = input.especialidad || null;
  if (input.biografia !== undefined) update.biografia = input.biografia || null;
  if (input.instagram !== undefined) update.instagram = input.instagram || null;
  if (input.facebook !== undefined) update.facebook = input.facebook || null;
  if (input.emailPublico !== undefined) update.email_publico = input.emailPublico || null;
  if (input.tagline !== undefined) update.tagline = input.tagline || null;
  if (input.landingTemplate !== undefined) update.landing_template = input.landingTemplate || null;
  if (input.servicios !== undefined) update.servicios = input.servicios;

  if (input.subdominio && input.subdominio.trim()) {
    const desired = slugify(input.subdominio);
    const { data: existingTrainers } = await supabase.from("trainers").select("subdominio").neq("id", trainer.id);
    const taken = new Set([
      ...RESERVED_SUBDOMAINS,
      ...(existingTrainers ?? []).map((t) => t.subdominio).filter((s): s is string => !!s),
    ]);
    if (taken.has(desired)) {
      return { ok: false, error: "Ese nombre de página ya está en uso. Elige otro." };
    }
    update.subdominio = desired;
  }

  if (input.step) update.onboarding_step = input.step;

  if (Object.keys(update).length > 0) {
    const { error } = await supabase.from("trainers").update(update).eq("id", trainer.id);
    if (error) return { ok: false, error: error.message };
  }

  return { ok: true };
}

export type OnboardingPhotoSlot = "avatar_url" | "foto2_url" | "foto3_url" | "foto4_url";

/**
 * Igual que uploadTrainerPhoto (admin-actions.ts) pero validado por token en
 * vez de por sesión de admin — el entrenador sube sus propias fotos durante
 * el paso de Fotografías.
 */
export async function uploadOnboardingPhoto(
  token: string,
  slot: OnboardingPhotoSlot,
  formData: FormData
): Promise<AdminActionResult & { url?: string }> {
  const session = await loadOnboardingSession(token);
  if (!session.ok) return { ok: false, error: "Enlace inválido o vencido." };
  const { lead, trainer } = session.data;
  if (!WRITABLE_ESTADOS.has(lead.estado)) {
    return { ok: false, error: "Esta solicitud ya no acepta cambios en este momento." };
  }

  const file = formData.get("foto");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "No se recibió ninguna imagen." };
  }
  if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
    return { ok: false, error: "Formato no soportado. Usa JPG, PNG o WEBP." };
  }
  if (file.size > MAX_AVATAR_BYTES) {
    return { ok: false, error: "La imagen pesa más de 3 MB." };
  }

  const supabase = getSupabaseAdmin();
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${trainer.id}/${slot}-${Date.now()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, buffer, { contentType: file.type, upsert: true });
  if (uploadError) return { ok: false, error: uploadError.message };

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);

  const update: { avatar_url?: string; foto2_url?: string; foto3_url?: string; foto4_url?: string } = {};
  if (slot === "avatar_url") update.avatar_url = data.publicUrl;
  else if (slot === "foto2_url") update.foto2_url = data.publicUrl;
  else if (slot === "foto3_url") update.foto3_url = data.publicUrl;
  else update.foto4_url = data.publicUrl;
  const { error: dbError } = await supabase.from("trainers").update(update).eq("id", trainer.id);
  if (dbError) return { ok: false, error: dbError.message };

  return { ok: true, url: data.publicUrl };
}

/**
 * Último paso del wizard: marca la información como completa y deja la
 * solicitud lista para la revisión final de Nando. A propósito NO publica
 * la landing ni activa el dashboard — eso solo pasa cuando se confirma la
 * creación del entrenador desde el panel.
 */
export async function submitOnboardingWizard(token: string): Promise<AdminActionResult> {
  const session = await loadOnboardingSession(token);
  if (!session.ok) return { ok: false, error: "Enlace inválido o vencido." };
  const { lead, trainer } = session.data;
  if (!WRITABLE_ESTADOS.has(lead.estado)) {
    return { ok: false, error: "Esta solicitud ya fue enviada anteriormente." };
  }

  const supabase = getSupabaseAdmin();
  const { error: trainerError } = await supabase
    .from("trainers")
    .update({ onboarding_completed_at: new Date().toISOString(), onboarding_step: "confirmacion" })
    .eq("id", trainer.id);
  if (trainerError) return { ok: false, error: trainerError.message };

  const { error: leadError } = await supabase
    .from("hakunnafit_leads")
    .update({ estado: "informacion_completada" })
    .eq("id", lead.id);
  if (leadError) return { ok: false, error: leadError.message };

  await createNotification({
    type: "estado_cambio",
    title: `Onboarding completado: ${trainer.business_name}`,
    message: `${trainer.business_name} terminó de llenar su información. Revísala en Solicitudes antes de crear su cuenta definitiva.`,
    link: "/panel-hakunna/solicitudes",
    leadId: lead.id,
    trainerId: trainer.id,
  });

  return { ok: true };
}
