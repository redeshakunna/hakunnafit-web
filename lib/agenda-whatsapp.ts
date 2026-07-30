// Helper puro (sin "use server") para construir el link de WhatsApp del
// recordatorio de citas — vive fuera de trainer-agenda-actions.ts a
// propósito: ese archivo tiene "use server" arriba, y Next.js exige que
// TODO export de un archivo "use server" sea una función async (server
// action). Esta función es solo construcción de string sin tocar la base de
// datos ni cookies, así que no tiene sentido que sea una server action —
// y de hecho romper esa regla es justo lo que causaba el "Build Error:
// Server actions must be async functions" en producción.
//
// El entrenador confirma el envío manual (mismo patrón que el resto de
// links de WhatsApp del proyecto) — no se manda nada automático.
export function buildAppointmentWhatsappReminder(input: {
  clientFullName: string;
  clientWhatsapp: string;
  scheduledAt: string;
  titulo: string | null;
}): string {
  const fecha = new Date(input.scheduledAt).toLocaleString("es-CO", { dateStyle: "full", timeStyle: "short" });
  const digits = input.clientWhatsapp.replace(/\D/g, "");
  const texto = `Hola ${input.clientFullName}! Te recuerdo tu cita${
    input.titulo ? ` de ${input.titulo}` : ""
  } el ${fecha}. ¡Nos vemos! 💪`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(texto)}`;
}
