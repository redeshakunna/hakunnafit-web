import { Check } from "lucide-react";
import type { StarterLandingTemplateKey } from "@/lib/catalog";

// Miniatura ilustrativa de cada modelo de landing Starter — no es el
// componente real (esos viven en components/hakunnafit/starter-templates/),
// es solo una maqueta liviana en CSS para que el entrenador se haga una idea
// del estilo antes de elegir en el formulario. Se reutiliza también en el
// panel admin para mostrar qué modelo tiene asignado cada entrenador.
export function TemplatePreviewThumbnail({ template }: { template: StarterLandingTemplateKey }) {
  if (template === "claro") {
    return (
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl border border-black/10 bg-[#F7F7F2] p-3">
        <div className="mx-auto h-8 w-8 overflow-hidden rounded-full border-2 border-emerald-500/30 bg-gray-200" />
        <div className="mx-auto mt-2 h-1.5 w-2/3 rounded-full bg-gray-900" />
        <div className="mx-auto mt-1 h-1.5 w-1/2 rounded-full bg-emerald-600" />
        <div className="mx-auto mt-3 h-1 w-full rounded-full bg-gray-300" />
        <div className="mx-auto mt-1 h-1 w-5/6 rounded-full bg-gray-300" />
        <div className="mx-auto mt-3 h-4 w-2/3 rounded-full bg-gray-900" />
        <div className="mt-3 flex justify-center gap-1">
          <div className="h-3 w-3 rounded-full bg-emerald-100" />
          <div className="h-3 w-3 rounded-full bg-emerald-100" />
          <div className="h-3 w-3 rounded-full bg-emerald-100" />
        </div>
      </div>
    );
  }

  if (template === "personal") {
    return (
      <div
        className="relative aspect-[3/4] w-full overflow-hidden rounded-xl border border-white/10 p-3"
        style={{ background: "linear-gradient(160deg,#00C8FF,#6D2EFF 55%,#FF2DB8)" }}
      >
        <div className="mx-auto h-9 w-9 rounded-full border-2 border-white/60 bg-white/20" />
        <div className="mx-auto mt-2 h-1.5 w-1/2 rounded-full bg-white/90" />
        <div className="mx-auto mt-1.5 h-1 w-1/3 rounded-full bg-white/60" />
        <div className="mt-4 flex justify-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-white/70" />
          <div className="h-2.5 w-2.5 rounded-full bg-white/70" />
          <div className="h-2.5 w-2.5 rounded-full bg-white/70" />
        </div>
        <div className="mx-auto mt-3 h-4 w-4/5 rounded-full bg-white/90" />
      </div>
    );
  }

  // "impacto" (default)
  return (
    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl border border-white/10 bg-hf-black p-3">
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-1/2 opacity-80"
        style={{
          background: "linear-gradient(135deg,#22C55E,#15803D)",
          clipPath: "polygon(45% 0, 100% 0, 100% 100%, 10% 100%)",
        }}
      />
      <div className="relative mx-auto h-8 w-8 rounded-full border border-white/20 bg-white/10" />
      <div className="relative mx-auto mt-2 h-1.5 w-2/3 rounded-full bg-white" />
      <div className="relative mx-auto mt-1.5 h-1 w-1/2 rounded-full bg-emerald-400" />
      <div className="relative mx-auto mt-3 h-1 w-full rounded-full bg-white/15" />
      <div className="relative mx-auto mt-1 h-1 w-5/6 rounded-full bg-white/15" />
      <div
        className="relative mx-auto mt-3 h-4 w-2/3 rounded-full"
        style={{ background: "linear-gradient(90deg,#22C55E,#15803D)" }}
      />
    </div>
  );
}

// Maqueta ancha tipo "ventana de navegador" — a diferencia de
// TemplatePreviewThumbnail (formato vertical, estilo celular), esta reproduce
// la proporción real de escritorio de cada modelo, para usarse donde el
// espacio horizontal no es un problema (ej. la pantalla "Administrar
// Landing"), en vez de una miniatura tipo teléfono.
export function TemplatePreviewWide({ template }: { template: StarterLandingTemplateKey }) {
  return (
    <div className="overflow-hidden rounded-xl border border-white/10">
      <div className="flex items-center gap-1.5 border-b border-white/10 bg-white/5 px-3 py-2">
        <span className="h-2 w-2 rounded-full bg-red-400/60" />
        <span className="h-2 w-2 rounded-full bg-yellow-400/60" />
        <span className="h-2 w-2 rounded-full bg-emerald-400/60" />
      </div>
      <div className="aspect-[16/10] w-full">
        {template === "claro" ? (
          <ClaroWideMockup />
        ) : template === "personal" ? (
          <PersonalWideMockup />
        ) : (
          <ImpactoWideMockup />
        )}
      </div>
    </div>
  );
}

function ImpactoWideMockup() {
  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-hf-black px-5 py-3">
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-[42%] opacity-85"
        style={{
          background: "linear-gradient(135deg,#22C55E,#15803D)",
          clipPath: "polygon(38% 0, 100% 0, 100% 100%, 0% 100%)",
        }}
      />
      {/* Nav */}
      <div className="relative flex items-center justify-between border-b border-white/10 pb-2">
        <div className="flex items-center gap-1.5">
          <div className="h-3.5 w-3.5 rounded" style={{ background: "linear-gradient(135deg,#22C55E,#15803D)" }} />
          <div className="h-1 w-10 rounded-full bg-white/70" />
        </div>
        <div className="hidden items-center gap-3 sm:flex">
          <div className="h-1 w-6 rounded-full bg-white/25" />
          <div className="h-1 w-6 rounded-full bg-white/25" />
          <div className="h-1 w-6 rounded-full bg-white/25" />
        </div>
        <div className="h-3.5 w-11 rounded-full" style={{ background: "linear-gradient(90deg,#22C55E,#15803D)" }} />
      </div>
      {/* Hero */}
      <div className="relative grid flex-1 grid-cols-2 items-center gap-4 pt-2.5">
        <div>
          <div className="h-1 w-10 rounded-full bg-emerald-400" />
          <div className="mt-1.5 h-2.5 w-[70%] rounded-full bg-white" />
          <div className="mt-1 h-2.5 w-[55%] rounded-full bg-emerald-400" />
          <div className="mt-2 h-1 w-[65%] rounded-full bg-emerald-300/70" />
          <div className="mt-2 flex gap-1.5">
            <div className="h-3 w-14 rounded-full" style={{ background: "linear-gradient(90deg,#22C55E,#15803D)" }} />
            <div className="h-3 w-11 rounded-full border border-white/20" />
          </div>
        </div>
        <div className="relative h-full w-full overflow-hidden rounded-lg border border-white/10">
          <div className="absolute inset-0" style={{ background: "linear-gradient(160deg,#1c2333,#0b0f1a)" }} />
        </div>
      </div>
      {/* Franja de stats */}
      <div className="relative mt-2 flex justify-center gap-3 border-t border-white/10 pt-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-1">
            <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/30" />
            <div className="h-1 w-4 rounded-full bg-white/25" />
          </div>
        ))}
      </div>
    </div>
  );
}

function ClaroWideMockup() {
  return (
    <div className="flex h-full w-full flex-col bg-[#F7F7F2] px-5 py-3">
      {/* Nav */}
      <div className="flex items-center justify-between border-b border-gray-200 pb-2">
        <div className="h-1 w-16 rounded-full bg-gray-800" />
        <div className="hidden items-center gap-3 sm:flex">
          <div className="h-1 w-6 rounded-full bg-gray-300" />
          <div className="h-1 w-6 rounded-full bg-gray-300" />
          <div className="h-1 w-6 rounded-full bg-gray-300" />
        </div>
        <div className="h-3 w-9 rounded-full border-2 border-emerald-600" />
      </div>
      {/* Hero */}
      <div className="grid flex-1 grid-cols-[1fr_auto] items-center gap-3 pt-2.5">
        <div>
          <div className="h-1 w-10 rounded-full bg-gray-300" />
          <div className="mt-1.5 h-2.5 w-[80%] rounded-full bg-gray-900" />
          <div className="mt-1 h-2.5 w-[55%] rounded-full bg-emerald-600" />
          <div className="mt-2 flex gap-1.5">
            <div className="h-3 w-12 rounded-full bg-gray-900" />
          </div>
        </div>
        <div className="h-full w-14 overflow-hidden rounded-lg bg-gray-200" />
      </div>
      {/* Fila de íconos */}
      <div className="mt-1.5 flex justify-center gap-2 border-t border-gray-200 pt-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="h-3 w-3 rounded-full bg-emerald-100" />
        ))}
      </div>
    </div>
  );
}

function PersonalWideMockup() {
  return (
    <div
      className="flex h-full w-full items-center justify-center p-4"
      style={{ background: "linear-gradient(160deg,#00C8FF,#6D2EFF 55%,#FF2DB8)" }}
    >
      <div className="flex h-full w-[42%] flex-col items-center rounded-2xl border border-white/25 bg-white/10 px-3 py-3 backdrop-blur-sm">
        <div className="h-6 w-6 rounded-full border-2 border-white/70 bg-white/20" />
        <div className="mt-1.5 h-1.5 w-[70%] rounded-full bg-white" />
        <div className="mt-1 h-1 w-[45%] rounded-full bg-white/60" />
        <div className="mt-2 flex w-full flex-col gap-1">
          <div className="h-1.5 w-full rounded-full bg-white/25" />
          <div className="h-1.5 w-full rounded-full bg-white/25" />
          <div className="h-1.5 w-full rounded-full bg-white/25" />
        </div>
        <div className="mt-2 h-2.5 w-[60%] rounded-full bg-white" />
      </div>
    </div>
  );
}

export function TemplatePreviewCard({
  template,
  label,
  tagline,
  selected,
  onSelect,
}: {
  template: StarterLandingTemplateKey;
  label: string;
  tagline: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative rounded-2xl border p-2 text-left transition-colors ${
        selected ? "border-hf-blue bg-hf-blue/5" : "border-white/15 bg-white/5 hover:border-white/30"
      }`}
    >
      {selected && (
        <span className="absolute right-3 top-3 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-hf-blue text-white">
          <Check size={12} />
        </span>
      )}
      <TemplatePreviewThumbnail template={template} />
      <p className="mt-2 text-xs font-semibold text-white">{label}</p>
      <p className="text-[10.5px] text-white/50">{tagline}</p>
    </button>
  );
}
