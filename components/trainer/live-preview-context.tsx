"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { TrainerRow } from "@/lib/admin-actions";
import type { StarterLandingTemplateKey } from "@/lib/catalog";
import {
  DEFAULT_SECCIONES_ACTIVAS,
  type StarterTrainerProfile,
} from "@/components/hakunnafit/starter-templates/types";

/**
 * Convierte la fila de Supabase (snake_case, tal como la usa el resto del
 * panel) al shape que consumen las 3 plantillas Starter reales
 * (camelCase, ver starter-templates/types.ts). Es el punto de partida del
 * "borrador" de la vista previa en vivo — antes de que el entrenador toque
 * nada, el borrador es exactamente lo que ya está guardado.
 */
function trainerRowToStarterProfile(trainer: TrainerRow): StarterTrainerProfile {
  return {
    businessName: trainer.business_name,
    especialidad: trainer.especialidad,
    ciudad: trainer.ciudad,
    whatsapp: trainer.whatsapp,
    emailPublico: trainer.email_publico,
    biografia: trainer.biografia,
    avatarUrl: trainer.avatar_url,
    foto2Url: trainer.foto2_url,
    foto3Url: trainer.foto3_url,
    foto4Url: trainer.foto4_url,
    instagram: trainer.instagram,
    facebook: trainer.facebook,
    servicios: trainer.servicios,
    mostrarTransformaciones: trainer.mostrar_transformaciones,
    transformaciones: trainer.transformaciones,
    estadisticas: trainer.estadisticas,
    testimonios: trainer.testimonios,
    tagline: trainer.tagline,
    logoUrl: trainer.logo_url,
    bannerUrl: trainer.banner_url,
    colorPrimario: trainer.color_primario,
    colorSecundario: trainer.color_secundario,
    colorTerciario: trainer.color_terciario,
    faqs: trainer.preguntas_frecuentes,
    seccionesActivas: {
      ...DEFAULT_SECCIONES_ACTIVAS,
      ...(trainer.secciones_activas as Partial<StarterTrainerProfile["seccionesActivas"]> | null),
    },
  };
}

interface LivePreviewContextValue {
  draft: StarterTrainerProfile;
  patchDraft: (patch: Partial<StarterTrainerProfile>) => void;
  template: StarterLandingTemplateKey;
  setTemplate: (t: StarterLandingTemplateKey) => void;
}

const LivePreviewContext = createContext<LivePreviewContextValue | null>(null);

/**
 * Envuelve una sección editable del panel (/panel/contenido, /fotos,
 * /colores) y le da a todos sus formularios acceso al mismo "borrador" en
 * memoria — cada input llama patchDraft() al cambiar, y el panel de vista
 * previa (trainer-live-preview-panel.tsx) renderiza ese borrador con el
 * componente real de la plantilla, sin tocar la base de datos. Guardar
 * (los botones de cada formulario) sigue siendo una acción aparte y
 * explícita — el borrador nunca se persiste solo.
 */
export function LivePreviewProvider({ trainer, children }: { trainer: TrainerRow; children: ReactNode }) {
  const [draft, setDraft] = useState<StarterTrainerProfile>(() => trainerRowToStarterProfile(trainer));
  const [template, setTemplate] = useState<StarterLandingTemplateKey>(
    ((trainer.landing_template as StarterLandingTemplateKey | null) || "impacto")
  );

  const value = useMemo<LivePreviewContextValue>(
    () => ({
      draft,
      patchDraft: (patch) => setDraft((prev) => ({ ...prev, ...patch })),
      template,
      setTemplate,
    }),
    [draft, template]
  );

  return <LivePreviewContext.Provider value={value}>{children}</LivePreviewContext.Provider>;
}

export function useLivePreview(): LivePreviewContextValue {
  const ctx = useContext(LivePreviewContext);
  if (!ctx) throw new Error("useLivePreview debe usarse dentro de un LivePreviewProvider.");
  return ctx;
}
