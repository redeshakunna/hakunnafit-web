// Helpers para "Agregar a mi calendario" en la cuenta del cliente final
// (/mi-cuenta) — sin depender de qué proveedor use el cliente (Gmail,
// Outlook, Apple, Yahoo...), se ofrecen dos caminos universales:
//
// 1. Un link directo a Google Calendar con el evento prellenado
//    (calendar.google.com/calendar/render) — no requiere que el cliente haya
//    conectado ninguna cuenta a HakunnaFit, solo abre Google Calendar con los
//    datos ya cargados para que confirme "Guardar".
// 2. Un archivo .ics estándar (RFC 5545) que cualquier otro calendario sabe
//    abrir — Outlook, Apple Calendar, Yahoo, etc.
//
// Esto es independiente del sync automático vía Google Calendar API que ya
// existe en lib/google-calendar.ts (ese requiere que el entrenador y/o el
// cliente hayan conectado su cuenta de Google desde el panel/la app). Este
// archivo es el camino manual "descárgalo tú mismo", que siempre funciona
// exista o no esa conexión.

export interface CalendarEventInput {
  title: string;
  description: string;
  location?: string;
  startIso: string;
  durationMin: number;
}

function toUtcCompact(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function endIsoOf(startIso: string, durationMin: number): string {
  return new Date(new Date(startIso).getTime() + durationMin * 60_000).toISOString();
}

export function googleCalendarUrl(event: CalendarEventInput): string {
  const start = toUtcCompact(event.startIso);
  const end = toUtcCompact(endIsoOf(event.startIso, event.durationMin));
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${start}/${end}`,
    details: event.description,
  });
  if (event.location) params.set("location", event.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function escapeIcsText(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export function icsContent(event: CalendarEventInput, uid: string): string {
  const start = toUtcCompact(event.startIso);
  const end = toUtcCompact(endIsoOf(event.startIso, event.durationMin));
  const stamp = toUtcCompact(new Date().toISOString());
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//HakunnaFit//ES",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${uid}@hakunnafit.com`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeIcsText(event.title)}`,
    `DESCRIPTION:${escapeIcsText(event.description)}`,
    ...(event.location ? [`LOCATION:${escapeIcsText(event.location)}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}

/** Dispara la descarga de un .ics en el navegador del cliente — genera el
 * archivo en memoria (Blob) sin ida y vuelta al servidor. */
export function downloadIcsFile(event: CalendarEventInput, uid: string, filename = "cita-hakunnafit.ics"): void {
  const blob = new Blob([icsContent(event, uid)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
