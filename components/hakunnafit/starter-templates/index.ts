import type { StarterLandingTemplateKey } from "@/lib/catalog";
import { ImpactoTemplate } from "./impacto";
import { ClaroTemplate } from "./claro";
import { PersonalTemplate } from "./personal";
import type { StarterTrainerProfile } from "./types";

export type { StarterTrainerProfile } from "./types";

// Único punto de entrada para elegir qué plantilla Starter renderizar según
// trainer.landing_template. Si el valor guardado no coincide con ninguna
// clave conocida (dato viejo, o nunca se llenó), cae al modelo por defecto
// en vez de romper la página.
export const STARTER_TEMPLATE_COMPONENTS: Record<
  StarterLandingTemplateKey,
  (props: { trainer: StarterTrainerProfile }) => JSX.Element
> = {
  impacto: ImpactoTemplate,
  claro: ClaroTemplate,
  personal: PersonalTemplate,
};

export function resolveStarterTemplate(key: string | null) {
  if (key === "claro") return STARTER_TEMPLATE_COMPONENTS.claro;
  if (key === "personal") return STARTER_TEMPLATE_COMPONENTS.personal;
  return STARTER_TEMPLATE_COMPONENTS.impacto;
}
