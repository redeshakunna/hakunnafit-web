// Validación de imágenes subidas por el entrenador — compartida entre
// trainer-actions.ts (fotos de marca/landing) y trainer-clients-actions.ts
// (fotos de progreso de clientes). No puede vivir dentro de un archivo
// "use server" porque esos archivos solo pueden exportar funciones async;
// esta es intencionalmente síncrona.

export const MAX_AVATAR_BYTES = 3 * 1024 * 1024; // 3 MB
export const ALLOWED_AVATAR_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function validateImageFile(
  file: FormDataEntryValue | null
): { ok: true; file: File } | { ok: false; error: string } {
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "No se recibió ninguna imagen." };
  if (!ALLOWED_AVATAR_TYPES.has(file.type)) return { ok: false, error: "Formato no soportado. Usa JPG, PNG o WEBP." };
  if (file.size > MAX_AVATAR_BYTES) return { ok: false, error: "La imagen pesa más de 3 MB." };
  return { ok: true, file };
}

export function imageExtension(file: File): "png" | "webp" | "jpg" {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}
