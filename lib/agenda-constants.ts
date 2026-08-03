// Constantes y tipos de la Agenda que NO son server actions — viven fuera de
// trainer-agenda-actions.ts a propósito: ese archivo tiene "use server"
// arriba, y Next.js exige que TODO export de un archivo "use server" sea una
// función async (server action). AGENDA_WORKING_HOURS y
// APPOINTMENT_STATUS_LABELS son objetos constantes, no funciones — tenerlos
// ahí rompía el build en producción con "Server actions must be async
// functions" aunque `tsc --noEmit` no lo detectara (es una regla del
// transform de Next, no del type-checker). Mismo motivo para MODALIDAD_LABEL,
// formatApptDateTime y trainerBranding: antes vivían (privados) dentro de
// trainer-agenda-actions.ts, pero session-proposals-actions.ts (propuesta de
// sesiones) también los necesita — al ser un const y dos funciones síncronas,
// no pueden exportarse desde un archivo "use server", así que se movieron
// acá para que ambos archivos "use server" los importen en vez de duplicar
// la lógica de formato/marca.

import type { TrainerRow } from "./admin-actions";
import type { TrainerBrandingData } from "./mail";

export const AGENDA_WORKING_HOURS = { start: 8, end: 18 };

export type AppointmentStatus = "pendiente" | "confirmada" | "no_asistio" | "completada" | "cancelada";
export type AppointmentModalidad = "presencial" | "virtual";

export const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  pendiente: "Pendiente",
  confirmada: "Confirmada",
  no_asistio: "No asistió",
  completada: "Completada",
  cancelada: "Cancelada",
};

export const MODALIDAD_LABEL: Record<AppointmentModalidad, string> = {
  presencial: "Presencial",
  virtual: "Virtual",
};

/** Formatea una fecha ISO en hora de Colombia — misma zona que usa todo el
 * negocio de HakunnaFit, sin importar dónde corra el servidor (Vercel corre
 * en UTC). Se usa en correos y descripciones de eventos de Google Calendar. */
export function formatApptDateTime(iso: string): { dateLabel: string; timeLabel: string } {
  const date = new Date(iso);
  const dateLabel = date.toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "America/Bogota",
  });
  const timeLabel = date.toLocaleTimeString("es-CO", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/Bogota",
  });
  return { dateLabel, timeLabel };
}

/** Arma los datos de marca del entrenador para el motor de correos
 * (lib/mail) a partir de su fila de trainers — ver
 * docs/EMAIL_ARCHITECTURE.md. whatsapp usa el público con respaldo al
 * interno, mismo criterio que ya usa la landing (resolvePublicWhatsapp). */
export function trainerBranding(trainer: TrainerRow): TrainerBrandingData {
  return {
    businessName: trainer.business_name,
    logoUrl: trainer.logo_url,
    colorPrimario: trainer.color_primario,
    colorSecundario: trainer.color_secundario,
    whatsapp: trainer.whatsapp_publico?.trim() || trainer.whatsapp,
    instagram: trainer.instagram,
    emailPublico: trainer.email_publico,
    subdominio: trainer.subdominio,
    avatarUrl: trainer.avatar_url,
  };
}
