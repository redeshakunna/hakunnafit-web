"use server";

import { getSupabaseAdmin } from "./supabase-admin";
import { requireTrainer } from "./trainer-auth";
import { canEditLanding } from "./admin-helpers";
import { validateImageFile, imageExtension } from "./image-validation";
import type { AdminActionResult, Estadistica, Testimonio, TransformacionPar, PlanOfrecido } from "./admin-actions";
import type { StarterLandingTemplateKey } from "./catalog";
import type { Json } from "./database.types";

const VALID_TEMPLATES: StarterLandingTemplateKey[] = ["impacto", "claro", "personal"];

/**
 * Todas las acciones de este archivo son para el panel de autoservicio del
 * entrenador (/panel) — a diferencia de admin-actions.ts, nunca reciben un
 * id de otro entrenador: siempre operan sobre requireTrainer() (la sesión
 * real de Supabase Auth del propio entrenador), y siempre revalidan
 * canEditLanding() server-side, aunque la UI ya oculte los formularios —
 * así una llamada manipulada no puede saltarse el bloqueo de Pro/Elite en
 * diseño.
 */
async function assertEditable() {
  const trainer = await requireTrainer();
  if (!canEditLanding(trainer)) {
    throw new Error("Tu landing todavía está en diseño — no se puede editar por ahora.");
  }
  return trainer;
}

async function logOwnActivity(trainerId: string, type: string, title: string, description?: string): Promise<void> {
  const supabase = getSupabaseAdmin();
  await supabase.from("trainer_activity").insert({ trainer_id: trainerId, type, title, description: description ?? null });
}

export interface UpdateOwnBrandInput {
  tagline?: string | null;
  biografia?: string | null;
  especialidad?: string | null;
  whatsapp?: string | null;
  ciudad?: string | null;
  emailPublico?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  dominioPropio?: string | null;
}

/**
 * Mi Marca — identidad del entrenador (frase principal, bio, especialidad,
 * contacto y redes). A diferencia de Mi Sitio Web, esto se guarda siempre al
 * instante (como en Shopify/Stripe "brand settings") — no tiene concepto de
 * borrador, porque son datos de perfil, no contenido editorial de la
 * landing.
 */
export async function updateOwnBrand(input: UpdateOwnBrandInput): Promise<AdminActionResult> {
  const trainer = await assertEditable();
  const supabase = getSupabaseAdmin();

  const update: {
    tagline?: string | null;
    biografia?: string | null;
    especialidad?: string | null;
    whatsapp?: string | null;
    ciudad?: string | null;
    email_publico?: string | null;
    instagram?: string | null;
    facebook?: string | null;
    dominio_propio?: string | null;
  } = {};
  if (input.tagline !== undefined) update.tagline = input.tagline || null;
  if (input.biografia !== undefined) update.biografia = input.biografia || null;
  if (input.especialidad !== undefined) update.especialidad = input.especialidad || null;
  if (input.whatsapp !== undefined) update.whatsapp = input.whatsapp || null;
  if (input.ciudad !== undefined) update.ciudad = input.ciudad || null;
  if (input.emailPublico !== undefined) update.email_publico = input.emailPublico || null;
  if (input.instagram !== undefined) update.instagram = input.instagram || null;
  if (input.facebook !== undefined) update.facebook = input.facebook || null;
  // dominio_propio es exclusivo Elite — se ignora silenciosamente si el
  // entrenador no está en ese plan (la UI ya lo oculta, esto es la
  // revalidación server-side).
  if (input.dominioPropio !== undefined && trainer.plan === "elite") {
    update.dominio_propio = input.dominioPropio || null;
  }

  if (Object.keys(update).length === 0) return { ok: true };

  const { error } = await supabase.from("trainers").update(update).eq("id", trainer.id);
  if (error) return { ok: false, error: error.message };

  await logOwnActivity(trainer.id, "informacion_actualizada", "Entrenador editó su marca");
  return { ok: true };
}

export interface UpdateOwnColorsInput {
  colorPrimario: string;
  colorSecundario: string;
  colorTerciario: string;
}

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export async function updateOwnColors(input: UpdateOwnColorsInput): Promise<AdminActionResult> {
  const trainer = await assertEditable();
  if (![input.colorPrimario, input.colorSecundario, input.colorTerciario].every((c) => HEX_RE.test(c))) {
    return { ok: false, error: "Los colores deben ser códigos hex válidos." };
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("trainers")
    .update({
      color_primario: input.colorPrimario,
      color_secundario: input.colorSecundario,
      color_terciario: input.colorTerciario,
    })
    .eq("id", trainer.id);
  if (error) return { ok: false, error: error.message };

  await logOwnActivity(trainer.id, "informacion_actualizada", "Entrenador actualizó los colores de su landing");
  return { ok: true };
}

/**
 * Planes/paquetes que el entrenador ofrece a sus clientes (Mi Negocio →
 * Operación) — a propósito NO pasa por assertEditable(): eso gatea contenido
 * de la landing (bloqueado en Pro/Elite hasta publicar), pero esto es dato
 * operativo que alimenta el selector de plan de los formularios de alta de
 * cliente, no la landing pública. Se guarda al instante, sin ciclo de
 * borrador/publicar (a diferencia de Mi Sitio Web) — el entrenador necesita
 * que un cliente pueda elegir un plan recién creado sin tener que "publicar"
 * nada primero.
 */
export async function updateOwnPlanesOfrecidos(planes: PlanOfrecido[]): Promise<AdminActionResult> {
  const trainer = await requireTrainer();

  for (const p of planes) {
    if (!p.nombre?.trim()) return { ok: false, error: "Todos los planes necesitan un nombre." };
    if (p.precioCop != null && (Number.isNaN(p.precioCop) || p.precioCop < 0)) {
      return { ok: false, error: "El precio debe ser un número válido." };
    }
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("trainers")
    .update({ planes_ofrecidos: planes as unknown as Json })
    .eq("id", trainer.id);
  if (error) return { ok: false, error: error.message };

  await logOwnActivity(trainer.id, "informacion_actualizada", "Entrenador actualizó sus planes ofrecidos");
  return { ok: true };
}

/**
 * Cambia el modelo de landing Starter (Impacto/Claro/Personal) que se
 * publica en el subdominio del entrenador. Separado de updateOwnColors
 * porque es un cambio estructural (layout completo), no solo estético — se
 * confirma con su propio botón "Usar esta plantilla" en la vista previa en
 * vivo del panel, en vez de guardarse junto con los colores.
 */
export async function updateOwnTemplate(landingTemplate: StarterLandingTemplateKey): Promise<AdminActionResult> {
  const trainer = await assertEditable();
  if (!VALID_TEMPLATES.includes(landingTemplate)) {
    return { ok: false, error: "Modelo de landing no válido." };
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("trainers").update({ landing_template: landingTemplate }).eq("id", trainer.id);
  if (error) return { ok: false, error: error.message };

  await logOwnActivity(trainer.id, "informacion_actualizada", "Entrenador cambió el modelo de su landing");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Mi Sitio Web — a diferencia de Mi Marca, esto SÍ tiene un concepto real de
// borrador: el entrenador puede dejar cambios a medio hacer (guardarOwnSitioWebDraft)
// sin que se reflejen en su landing pública, y solo pasan a producción
// cuando presiona "Publicar cambios" (publishOwnSitioWeb). El borrador vive
// en trainers.landing_draft (jsonb) — un espejo de exactamente estos mismos
// campos, nunca de logo/colores/bio (esos son de Mi Marca y siempre se
// guardan al instante).
// ---------------------------------------------------------------------------

export interface SitioWebDraftShape {
  servicios: { titulo: string; descripcion: string; tipo: "directo" | "personalizado" }[];
  seccionesActivas: { servicios: boolean; transformaciones: boolean; galeria: boolean; faq: boolean };
  faqs: { pregunta: string; respuesta: string }[];
  mostrarTransformaciones: boolean;
  transformaciones: TransformacionPar[] | null;
}

/**
 * Guarda el estado actual del editor de Mi Sitio Web como borrador — no
 * toca ninguna columna "en vivo" que lea la landing pública, así que el
 * entrenador puede cerrar el panel y retomar exactamente donde iba la
 * próxima vez que entre, sin arriesgarse a publicar algo a medias.
 */
export async function saveOwnSitioWebDraft(draft: SitioWebDraftShape): Promise<AdminActionResult> {
  const trainer = await assertEditable();
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("trainers")
    .update({ landing_draft: draft as unknown as Json, landing_draft_updated_at: new Date().toISOString() })
    .eq("id", trainer.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/**
 * Publica los cambios de Mi Sitio Web: copia el borrador (o, si no hay
 * borrador guardado, el estado que se le pasa directamente) a las columnas
 * en vivo que lee /landing/[subdominio] — a partir de aquí es visible para
 * cualquiera que entre a la landing.
 */
export async function publishOwnSitioWeb(draft: SitioWebDraftShape): Promise<AdminActionResult> {
  const trainer = await assertEditable();
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("trainers")
    .update({
      servicios: draft.servicios,
      secciones_activas: draft.seccionesActivas,
      preguntas_frecuentes: draft.faqs,
      mostrar_transformaciones: draft.mostrarTransformaciones,
      transformaciones: draft.transformaciones,
      landing_draft: null,
      landing_draft_updated_at: null,
      landing_published_at: new Date().toISOString(),
    })
    .eq("id", trainer.id);
  if (error) return { ok: false, error: error.message };

  await logOwnActivity(trainer.id, "informacion_actualizada", "Entrenador publicó cambios en su sitio web");
  return { ok: true };
}

export interface UpdateOwnTransformacionesInput {
  mostrarTransformaciones: boolean;
  transformaciones: TransformacionPar[] | null;
}

export async function updateOwnTransformaciones(input: UpdateOwnTransformacionesInput): Promise<AdminActionResult> {
  const trainer = await assertEditable();
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("trainers")
    .update({ mostrar_transformaciones: input.mostrarTransformaciones, transformaciones: input.transformaciones })
    .eq("id", trainer.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export interface UpdateOwnStatsInput {
  estadisticas?: Estadistica[] | null;
  testimonios?: Testimonio[] | null;
}

export async function updateOwnStats(input: UpdateOwnStatsInput): Promise<AdminActionResult> {
  const trainer = await assertEditable();
  const supabase = getSupabaseAdmin();
  const update: {
    estadisticas?: Estadistica[] | null;
    testimonios?: Testimonio[] | null;
  } = {};
  if (input.estadisticas !== undefined) update.estadisticas = input.estadisticas;
  if (input.testimonios !== undefined) update.testimonios = input.testimonios;
  if (Object.keys(update).length === 0) return { ok: true };
  const { error } = await supabase.from("trainers").update(update).eq("id", trainer.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export type OwnPhotoSlot = "avatar_url" | "foto2_url" | "foto3_url" | "foto4_url" | "logo_url" | "banner_url";

/**
 * Sube cualquiera de las fotos propias del entrenador (perfil, fotos de la
 * landing, o el logo) al bucket público "avatars" — mismo bucket que ya usa
 * el panel de Nando, cada archivo con su propio nombre por slot.
 */
export async function uploadOwnPhoto(
  slot: OwnPhotoSlot,
  formData: FormData
): Promise<AdminActionResult & { url?: string }> {
  const trainer = await assertEditable();

  const validated = validateImageFile(formData.get("foto"));
  if (!validated.ok) return { ok: false, error: validated.error };

  const supabase = getSupabaseAdmin();
  const ext = imageExtension(validated.file);
  const path = `${trainer.id}/${slot}-${Date.now()}.${ext}`;
  const buffer = Buffer.from(await validated.file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, buffer, { contentType: validated.file.type, upsert: true });
  if (uploadError) return { ok: false, error: uploadError.message };

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);

  const photoUpdate: {
    avatar_url?: string;
    foto2_url?: string;
    foto3_url?: string;
    foto4_url?: string;
    logo_url?: string;
    banner_url?: string;
  } = {};
  photoUpdate[slot] = data.publicUrl;

  const { error: dbError } = await supabase.from("trainers").update(photoUpdate).eq("id", trainer.id);
  if (dbError) return { ok: false, error: dbError.message };

  await logOwnActivity(trainer.id, "informacion_actualizada", slot === "logo_url" ? "Logo actualizado" : "Foto actualizada");

  return { ok: true, url: data.publicUrl };
}

/**
 * Sube una foto suelta para un par antes/después — igual que
 * uploadTransformacionPhoto en admin-actions.ts pero para el propio
 * entrenador. Solo sube el archivo; la posición dentro del array la decide
 * el componente vía updateOwnTransformaciones.
 */
export async function uploadOwnTransformacionPhoto(
  formData: FormData
): Promise<AdminActionResult & { url?: string }> {
  const trainer = await assertEditable();

  const validated = validateImageFile(formData.get("foto"));
  if (!validated.ok) return { ok: false, error: validated.error };

  const supabase = getSupabaseAdmin();
  const ext = imageExtension(validated.file);
  const path = `${trainer.id}/transformaciones/${Date.now()}.${ext}`;
  const buffer = Buffer.from(await validated.file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, buffer, { contentType: validated.file.type, upsert: true });
  if (uploadError) return { ok: false, error: uploadError.message };

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return { ok: true, url: data.publicUrl };
}

// ---------------------------------------------------------------------------
// Mi Negocio — lectura de datos reales para el resumen de cuenta del
// entrenador (uso de clientes, solicitudes recibidas). Deliberadamente NO
// incluye estadísticas de HakAI o de visitas a la landing porque todavía no
// existe ninguna tabla que registre ese uso real — mostrar un número ahí
// sería inventar datos, así que esa sección del panel se limita a indicar si
// la función está incluida en el plan, sin fingir una métrica.
// ---------------------------------------------------------------------------

export interface OwnClientStats {
  total: number;
  activos: number;
  prospectos: number;
  pausados: number;
}

export async function getOwnClientStats(): Promise<OwnClientStats> {
  const trainer = await requireTrainer();
  const supabase = getSupabaseAdmin();
  const { data } = await supabase.from("clients").select("status").eq("trainer_id", trainer.id);
  const rows = data ?? [];
  return {
    total: rows.length,
    activos: rows.filter((r) => r.status === "activo").length,
    prospectos: rows.filter((r) => r.status === "pendiente_evaluacion").length,
    pausados: rows.filter((r) => r.status === "pausado" || r.status === "inactivo").length,
  };
}

export interface OwnActivityRow {
  id: string;
  type: string;
  title: string;
  description: string | null;
  created_at: string;
  leida: boolean;
}

/**
 * Actividad reciente del propio entrenador — mismo trainer_activity que ya
 * alimenta cada acción de este archivo (logOwnActivity), ahora leído de
 * vuelta para el resumen del Dashboard.
 */
export async function getOwnRecentActivity(limit = 6): Promise<OwnActivityRow[]> {
  const trainer = await requireTrainer();
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("trainer_activity")
    .select("id, type, title, description, created_at, leida")
    .eq("trainer_id", trainer.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data as OwnActivityRow[];
}

export interface OwnActivityInbox {
  items: OwnActivityRow[];
  unreadCount: number;
}

/**
 * Alimenta la campanita de notificaciones del panel del entrenador —
 * mismo trainer_activity de siempre (cliente nuevo desde el link público,
 * cambios que hace Nando en tu cuenta, etc.), con el estado leída/no leída
 * que hoy solo existía en el panel-hakunna de Nando.
 */
export async function getOwnActivityInbox(limit = 15): Promise<OwnActivityInbox> {
  const trainer = await requireTrainer();
  const supabase = getSupabaseAdmin();
  const [{ data }, { count }] = await Promise.all([
    supabase
      .from("trainer_activity")
      .select("id, type, title, description, created_at, leida")
      .eq("trainer_id", trainer.id)
      .order("created_at", { ascending: false })
      .limit(limit),
    supabase
      .from("trainer_activity")
      .select("id", { count: "exact", head: true })
      .eq("trainer_id", trainer.id)
      .eq("leida", false),
  ]);
  return { items: (data as OwnActivityRow[]) ?? [], unreadCount: count ?? 0 };
}

export async function markOwnActivityRead(id: string): Promise<AdminActionResult> {
  const trainer = await requireTrainer();
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("trainer_activity")
    .update({ leida: true })
    .eq("id", id)
    .eq("trainer_id", trainer.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function markAllOwnActivityRead(): Promise<AdminActionResult> {
  const trainer = await requireTrainer();
  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("trainer_activity")
    .update({ leida: true })
    .eq("trainer_id", trainer.id)
    .eq("leida", false);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
