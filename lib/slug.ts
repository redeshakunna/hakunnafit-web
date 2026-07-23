// Utilidad para generar el subdominio propuesto de un entrenador a partir del
// nombre de su negocio (ej. "Juan Fitness" -> "juanfitness"). No reserva nada
// por sí sola — quien la use debe validar unicidad contra la base de datos.

// Subdominios que nunca se pueden asignar a un entrenador porque ya tienen un
// uso reservado a nivel de sitio (ver middleware.ts). Se usa tanto al calcular
// el subdominio propuesto de un lead como al aprobarlo.
export const RESERVED_SUBDOMAINS = new Set(["www", "send", "app", "panel", "admin", "api", "mail"]);

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quita acentos
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .slice(0, 30) || "entrenador";
}

/**
 * Dado un slug base y un set de slugs ya usados/reservados, devuelve el
 * primer candidato disponible (agregando -2, -3, ... si hace falta).
 */
export function firstAvailableSlug(base: string, taken: Set<string>): string {
  const cleanBase = slugify(base);
  if (!taken.has(cleanBase)) return cleanBase;

  let i = 2;
  while (taken.has(`${cleanBase}-${i}`)) {
    i += 1;
  }
  return `${cleanBase}-${i}`;
}
