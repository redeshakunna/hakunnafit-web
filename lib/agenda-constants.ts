// Constantes y tipos de la Agenda que NO son server actions — viven fuera de
// trainer-agenda-actions.ts a propósito: ese archivo tiene "use server"
// arriba, y Next.js exige que TODO export de un archivo "use server" sea una
// función async (server action). AGENDA_WORKING_HOURS y
// APPOINTMENT_STATUS_LABELS son objetos constantes, no funciones — tenerlos
// ahí rompía el build en producción con "Server actions must be async
// functions" aunque `tsc --noEmit` no lo detectara (es una regla del
// transform de Next, no del type-checker).

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
