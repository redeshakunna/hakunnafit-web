// Contratos del sistema de correos — ver docs/EMAIL_ARCHITECTURE.md.
//
// Solo 2 identidades visuales (HakunnaFit y Entrenador), no 3: los correos
// "al cliente final" reusan la marca del entrenador (mismo logo/colores),
// nunca la de HakunnaFit — lo único que cambia entre "al entrenador" y "al
// cliente" es la audiencia (footer + tono), no la marca. Ver sección 1 del
// documento de arquitectura para la justificación completa.

export interface TrainerBrandingData {
  businessName: string;
  logoUrl: string | null;
  colorPrimario: string;
  colorSecundario: string;
  whatsapp: string | null;
  instagram: string | null;
  emailPublico: string | null;
  subdominio: string | null;
  avatarUrl: string | null;
}

export type Brand = { kind: "hakunnafit" } | { kind: "trainer"; trainer: TrainerBrandingData };

export type Audience = "admin" | "trainer" | "client";

/** Categoría para efectos de lib/email/registry.ts y email_log — no
 * confundir con Audience: "corporate" siempre es brand hakunnafit+admin;
 * "trainer"/"client" siempre son brand trainer con esa audiencia. */
export type EmailCategory = "corporate" | "trainer" | "client";

export interface InfoBoxRow {
  label: string;
  value: string;
}

export interface InfoBox {
  title?: string;
  rows: InfoBoxRow[];
}

export interface EmailContext {
  brand: Brand;
  audience: Audience;
  to: string;
  recipientName: string;
  subject: string;
  /** Texto oculto de preview en la bandeja de entrada (Gmail/Outlook lo
   * muestran junto al asunto) — mejora de apertura que el sistema legacy no
   * tenía. */
  preheader?: string;
  heading: string;
  message: string;
  primaryButton?: { label: string; url: string };
  infoBox?: InfoBox | null;
  /** Casi nunca necesario — el color se deriva del brand por defecto. */
  accentColorOverride?: string;
}

/** Resultado de un flow — separado de EmailContext para que sendEmail()
 * pueda loguear flowId/category sin que cada flow tenga que repetirlos
 * manualmente en el contexto. */
export interface FlowResult {
  flowId: string;
  category: EmailCategory;
  context: EmailContext;
}
