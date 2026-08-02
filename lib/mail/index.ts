// Punto de entrada único del motor de correos — ver docs/EMAIL_ARCHITECTURE.md.
// Los flows importan desde "@/lib/mail" en vez de conocer la estructura
// interna de la carpeta.
//
// Nota de nombre: el documento de arquitectura habla de "lib/email/" como
// convención conceptual, pero el módulo vive físicamente en "lib/mail/"
// porque ya existe lib/email.ts (el módulo legacy) y el entorno de
// desarrollo no permite eliminarlo para liberar ese nombre de carpeta — ver
// lib/email/index.ts para el detalle. Es un detalle de implementación, no
// afecta el diseño.

export type { Brand, Audience, EmailCategory, EmailContext, FlowResult, TrainerBrandingData, InfoBox, InfoBoxRow } from "./types";
export { renderEmailShell } from "./layout";
export { sendEmail } from "./send";
export { resolveAccentColor, resolveSenderName, resolveReplyTo } from "./identity";
