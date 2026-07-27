// Constantes y helpers de presentación compartidos entre las pantallas del
// módulo Clientes (lista /panel/clientes y ficha /panel/clientes/[id]) —
// viven acá para no duplicar la misma clasificación de estado/actividad/IMC
// en dos componentes.

import type { ClientStatus } from "./trainer-clients-actions";

export const STATUS_META: Record<ClientStatus, { label: string; className: string }> = {
  pendiente_evaluacion: { label: "Por evaluar", className: "bg-amber-500/10 text-amber-400" },
  activo: { label: "Activo", className: "bg-emerald-500/10 text-emerald-400" },
  pausado: { label: "Pausado", className: "bg-white/10 text-white/60" },
  inactivo: { label: "Inactivo", className: "bg-red-500/10 text-red-400" },
};

export const STATUS_DOT: Record<ClientStatus, string> = {
  pendiente_evaluacion: "bg-amber-400",
  activo: "bg-emerald-400",
  pausado: "bg-white/40",
  inactivo: "bg-red-400",
};

export const IMC_CATEGORY_CLASS: Record<string, string> = {
  bajo_peso: "bg-sky-500/10 text-sky-400",
  normal: "bg-emerald-500/10 text-emerald-400",
  sobrepeso: "bg-amber-500/10 text-amber-400",
  obesidad: "bg-red-500/10 text-red-400",
};

const AVATAR_COLORS = [
  "bg-sky-500/15 text-sky-300",
  "bg-violet-500/15 text-violet-300",
  "bg-emerald-500/15 text-emerald-300",
  "bg-amber-500/15 text-amber-300",
  "bg-pink-500/15 text-pink-300",
  "bg-hf-blue/15 text-hf-blue",
];

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

export function avatarColor(id: string) {
  let sum = 0;
  for (const ch of id) sum += ch.charCodeAt(0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

export const cop = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

// Niveles estándar de actividad diaria (fuera del entreno con el
// entrenador) — misma clasificación que se usa para calcular gasto
// calórico, así queda lista para cuando HAKAI genere rutinas/nutrición.
export const ACTIVIDAD_OPTIONS = [
  { value: "sedentario", label: "Sedentario (trabajo de oficina, poco movimiento)" },
  { value: "ligero", label: "Ligero (1-3 días de actividad/semana)" },
  { value: "moderado", label: "Moderado (3-5 días de actividad/semana)" },
  { value: "activo", label: "Activo (6-7 días de actividad/semana)" },
  { value: "muy_activo", label: "Muy activo (trabajo físico o 2 entrenos/día)" },
];

// Mismas franjas horarias que el formulario público de registro — evita
// texto libre en este campo (antes se podía escribir cualquier cosa, ej. "6").
export const HORARIOS_ENTRENO = ["5:00 am", "6:00 am", "7:00 am", "12:00 pm", "4:00 pm", "6:00 pm", "7:00 pm"];

export const SEXO_LABELS: Record<string, string> = { femenino: "Femenino", masculino: "Masculino", otro: "Otro" };
export const NIVEL_LABELS: Record<string, string> = {
  principiante: "Principiante",
  intermedio: "Intermedio",
  avanzado: "Avanzado",
};
export const ACTIVIDAD_LABELS: Record<string, string> = Object.fromEntries(
  ACTIVIDAD_OPTIONS.map((a) => [a.value, a.label.split(" (")[0]])
);
