export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Contraste simple para decidir si el texto sobre un color de acento debe
 * ser blanco o negro — evita, por ejemplo, texto blanco sobre un amarillo
 * pastel que un entrenador haya elegido como color primario. */
export function readableTextColor(hexColor: string): "#0b0f1a" | "#ffffff" {
  const hex = hexColor.replace("#", "");
  if (hex.length !== 6) return "#ffffff";
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#0b0f1a" : "#ffffff";
}
