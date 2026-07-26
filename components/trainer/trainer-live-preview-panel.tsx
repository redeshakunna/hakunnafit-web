"use client";

import { useState, useTransition } from "react";
import { RefreshCcw } from "lucide-react";
import { useLivePreview } from "./live-preview-context";
import { ScaledPreviewFrame } from "./scaled-preview-frame";
import { STARTER_TEMPLATE_COMPONENTS } from "@/components/hakunnafit/starter-templates";
import { STARTER_LANDING_TEMPLATES } from "@/lib/catalog";
import { TemplatePreviewThumbnail } from "@/components/hakunnafit/template-preview-card";
import { updateOwnTemplate } from "@/lib/trainer-actions";

/**
 * Vista previa en vivo del panel de autoservicio — se monta una sola vez
 * junto a cada editor (contenido/fotos/colores, ver trainer-editor-split.tsx)
 * y renderiza el componente REAL de la plantilla elegida con lo que el
 * entrenador va escribiendo (LivePreviewProvider), sin guardar nada en la
 * base de datos. Cambiar de plantilla aquí es solo visual hasta que se
 * confirma con "Usar esta plantilla" — así el entrenador puede comparar los
 * 3 modelos con su propio contenido antes de decidir.
 */
export function TrainerLivePreviewPanel({ initialTemplate }: { initialTemplate: string }) {
  const { draft, template, setTemplate } = useLivePreview();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");

  const Template = STARTER_TEMPLATE_COMPONENTS[template];
  const templateChanged = template !== initialTemplate;

  function saveTemplate() {
    setStatus("idle");
    startTransition(async () => {
      const res = await updateOwnTemplate(template);
      setStatus(res.ok ? "ok" : "error");
    });
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 p-3">
        <div className="flex items-center gap-1.5 text-white/50">
          <RefreshCcw size={12} />
          <p className="text-[11px] font-semibold uppercase tracking-wide">Vista previa en vivo</p>
        </div>
        {templateChanged && (
          <button
            type="button"
            disabled={isPending}
            onClick={saveTemplate}
            className="rounded-full px-3 py-1.5 text-[11px] font-semibold text-black disabled:opacity-50"
            style={{ background: "linear-gradient(90deg,#00C8FF,#6D2EFF)" }}
          >
            {isPending ? "Guardando..." : "Usar esta plantilla"}
          </button>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto border-b border-white/10 p-3">
        {STARTER_LANDING_TEMPLATES.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTemplate(t.key)}
            className={`w-16 shrink-0 text-left transition-opacity ${
              template === t.key ? "opacity-100" : "opacity-45 hover:opacity-80"
            }`}
          >
            <TemplatePreviewThumbnail template={t.key} />
            <p className="mt-1 truncate text-center text-[10px] text-white/60">{t.label}</p>
          </button>
        ))}
      </div>

      {status === "ok" && <p className="px-3 pt-2 text-[11px] text-emerald-400">Plantilla guardada — ya es la de tu landing publicada.</p>}
      {status === "error" && <p className="px-3 pt-2 text-[11px] text-red-400">No se pudo guardar la plantilla.</p>}

      <div className="flex-1 overflow-y-auto bg-white">
        <ScaledPreviewFrame>
          <Template trainer={draft} />
        </ScaledPreviewFrame>
      </div>
    </div>
  );
}
