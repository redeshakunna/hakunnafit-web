"use client";

import type { ReactNode } from "react";
import type { TrainerRow } from "@/lib/admin-actions";
import { LivePreviewProvider } from "./live-preview-context";
import { TrainerLivePreviewPanel } from "./trainer-live-preview-panel";

/**
 * Pantalla dividida que usan las 3 secciones editables del panel
 * (contenido/fotos/colores): el formulario a la izquierda, la vista previa
 * en vivo de la landing a la derecha, ambos leyendo/escribiendo el mismo
 * borrador en memoria vía LivePreviewProvider. En pantallas angostas la
 * vista previa cae debajo del formulario en vez de aplastarlo.
 */
export function TrainerEditorSplit({ trainer, children }: { trainer: TrainerRow; children: ReactNode }) {
  return (
    <LivePreviewProvider trainer={trainer}>
      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div>{children}</div>
        <div className="xl:sticky xl:top-6 xl:h-[calc(100vh-3rem)]">
          <TrainerLivePreviewPanel initialTemplate={trainer.landing_template || "impacto"} />
        </div>
      </div>
    </LivePreviewProvider>
  );
}
