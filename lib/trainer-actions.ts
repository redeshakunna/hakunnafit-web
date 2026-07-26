"use server";

import { getSupabaseAdmin } from "./supabase-admin";
import { requireTrainer } from "./trainer-auth";
import { canEditLanding } from "./admin-helpers";
import type { AdminActionResult, Estadistica, Testimonio, TransformacionPar } from "./admin-actions";

const MAX_AVATAR_BYTES = 3 * 1024 * 1024; // 3 MB
const ALLOWED_AVATAR_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

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

export interface UpdateOwnContentInput {
  tagline?: string | null;
  biografia?: string | null;
  whatsapp?: string | null;
  ciudad?: string | null;
  emailPublico?: string | null;
  instagram?: string | null;
  facebook?: string | null;
  servicios?: { titulo: string; descripcion: string; tipo: "directo" | "personalizado" }[] | null;
}

export async function updateOwnContent(input: UpdateOwnContentInput): Promise<AdminActionResult> {
  const trainer = await assertEditable();
  const supabase = getSupabaseAdmin();

  const update: Record<string, unknown> = {};
  if (input.tagline !== undefined) update.tagline = input.tagline || null;
  if (input.biografia !== undefined) update.biografia = input.biografia || null;
  if (input.whatsapp !== undefined) update.whatsapp = input.whatsapp || null;
  if (input.ciudad !== undefined) update.ciudad = input.ciudad || null;
  if (input.emailPublico !== undefined) update.email_publico = input.emailPublico || null;
  if (input.instagram !== undefined) update.instagram = input.instagram || null;
  if (input.facebook !== undefined) update.facebook = input.facebook || null;
  if (input.servicios !== undefined) update.servicios = input.servicios;

  if (Object.keys(update).length === 0) return { ok: true };

  const { error } = await supabase.from("trainers").update(update).eq("id", trainer.id);
  if (error) return { ok: false, error: error.message };

  await logOwnActivity(trainer.id, "informacion_actualizada", "Entrenador editó su información");
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
  const update: Record<string, unknown> = {};
  if (input.estadisticas !== undefined) update.estadisticas = input.estadisticas;
  if (input.testimonios !== undefined) update.testimonios = input.testimonios;
  if (Object.keys(update).length === 0) return { ok: true };
  const { error } = await supabase.from("trainers").update(update).eq("id", trainer.id);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

function validateImageFile(file: FormDataEntryValue | null): { ok: true; file: File } | { ok: false; error: string } {
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "No se recibió ninguna imagen." };
  if (!ALLOWED_AVATAR_TYPES.has(file.type)) return { ok: false, error: "Formato no soportado. Usa JPG, PNG o WEBP." };
  if (file.size > MAX_AVATAR_BYTES) return { ok: false, error: "La imagen pesa más de 3 MB." };
  return { ok: true, file };
}

export type OwnPhotoSlot = "avatar_url" | "foto2_url" | "foto3_url" | "foto4_url" | "logo_url";

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
  const ext = validated.file.type === "image/png" ? "png" : validated.file.type === "image/webp" ? "webp" : "jpg";
  const path = `${trainer.id}/${slot}-${Date.now()}.${ext}`;
  const buffer = Buffer.from(await validated.file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, buffer, { contentType: validated.file.type, upsert: true });
  if (uploadError) return { ok: false, error: uploadError.message };

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);

  const { error: dbError } = await supabase.from("trainers").update({ [slot]: data.publicUrl }).eq("id", trainer.id);
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
  const ext = validated.file.type === "image/png" ? "png" : validated.file.type === "image/webp" ? "webp" : "jpg";
  const path = `${trainer.id}/transformaciones/${Date.now()}.${ext}`;
  const buffer = Buffer.from(await validated.file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, buffer, { contentType: validated.file.type, upsert: true });
  if (uploadError) return { ok: false, error: uploadError.message };

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  return { ok: true, url: data.publicUrl };
}
