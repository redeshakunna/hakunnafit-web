"use client";

import { useState, useTransition } from "react";
import { updateOwnColors } from "@/lib/trainer-actions";
import type { TrainerRow } from "@/lib/admin-actions";
import { useLivePreview } from "./live-preview-context";

const SUGGESTED_PALETTES: { label: string; primario: string; secundario: string; terciario: string }[] = [
  { label: "Verde Lima", primario: "#22C55E", secundario: "#15803D", terciario: "#86EFAC" },
  { label: "Azul Cian", primario: "#00C8FF", secundario: "#0072B8", terciario: "#7DE8FF" },
  { label: "Púrpura", primario: "#6D2EFF", secundario: "#4A1FB0", terciario: "#C9A8FF" },
  { label: "Fucsia", primario: "#FF2DB8", secundario: "#B0107D", terciario: "#FFB3E6" },
  { label: "Naranja", primario: "#FF8A00", secundario: "#C25E00", terciario: "#FFC98A" },
  { label: "Rojo Fuego", primario: "#EF4444", secundario: "#B91C1C", terciario: "#FCA5A5" },
];

export function TrainerColorsForm({ trainer }: { trainer: TrainerRow }) {
  const { patchDraft } = useLivePreview();
  const [colorPrimario, setColorPrimarioState] = useState(trainer.color_primario || "#22C55E");
  const [colorSecundario, setColorSecundarioState] = useState(trainer.color_secundario || "#15803D");
  const [colorTerciario, setColorTerciarioState] = useState(trainer.color_terciario || "#86EFAC");
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  // Cada setter actualiza el estado local del formulario y, a la vez, el
  // borrador que consume la vista previa en vivo — así el cambio se ve al
  // instante en la landing renderizada al lado, sin tocar la base de datos.
  function setColorPrimario(v: string) {
    setColorPrimarioState(v);
    patchDraft({ colorPrimario: v });
  }
  function setColorSecundario(v: string) {
    setColorSecundarioState(v);
    patchDraft({ colorSecundario: v });
  }
  function setColorTerciario(v: string) {
    setColorTerciarioState(v);
    patchDraft({ colorTerciario: v });
  }

  function applyPalette(p: (typeof SUGGESTED_PALETTES)[number]) {
    setColorPrimario(p.primario);
    setColorSecundario(p.secundario);
    setColorTerciario(p.terciario);
    setStatus("idle");
  }

  function save() {
    setStatus("idle");
    setError(null);
    startTransition(async () => {
      const res = await updateOwnColors({ colorPrimario, colorSecundario, colorTerciario });
      if (!res.ok) {
        setStatus("error");
        setError(res.error || "No se pudieron guardar los colores.");
        return;
      }
      setStatus("ok");
    });
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-xl font-bold text-white">Colores de tu landing</h1>
      <p className="mt-1 text-sm text-white/50">
        Elige una paleta sugerida o personaliza cada color. Se usan en botones, degradados y detalles — el fondo y
        el texto de tu landing no cambian, para que siempre se lea bien.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {SUGGESTED_PALETTES.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => applyPalette(p)}
            className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left hover:border-white/25"
          >
            <div className="flex gap-1.5">
              <span className="h-6 w-6 rounded-full" style={{ backgroundColor: p.primario }} />
              <span className="h-6 w-6 rounded-full" style={{ backgroundColor: p.secundario }} />
              <span className="h-6 w-6 rounded-full" style={{ backgroundColor: p.terciario }} />
            </div>
            <p className="mt-2 text-xs font-semibold text-white">{p.label}</p>
          </button>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <p className="mb-4 text-sm font-semibold text-white">Personalizar</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <ColorField label="Primario (botones)" value={colorPrimario} onChange={setColorPrimario} />
          <ColorField label="Secundario (degradado)" value={colorSecundario} onChange={setColorSecundario} />
          <ColorField label="Terciario (detalles)" value={colorTerciario} onChange={setColorTerciario} />
        </div>

        <div className="mt-6 rounded-xl border border-white/10 p-4" style={{ background: "#0b0f1a" }}>
          <p className="mb-2 text-[11px] text-white/40">Vista previa</p>
          <div
            className="inline-flex items-center rounded-full px-5 py-2.5 text-sm font-semibold text-white"
            style={{ background: `linear-gradient(90deg, ${colorPrimario}, ${colorSecundario})` }}
          >
            Botón de ejemplo
          </div>
          <p className="mt-3 text-sm font-semibold" style={{ color: colorTerciario }}>
            Texto de detalle en el color terciario
          </p>
        </div>

        {status === "error" && <p className="mt-4 text-sm text-red-400">{error}</p>}
        {status === "ok" && <p className="mt-4 text-sm text-emerald-400">Colores guardados.</p>}

        <button
          type="button"
          disabled={isPending}
          onClick={save}
          className="mt-5 rounded-full px-6 py-2.5 text-sm font-semibold text-black disabled:opacity-50"
          style={{ background: "linear-gradient(90deg,#00C8FF,#6D2EFF)" }}
        >
          {isPending ? "Guardando..." : "Guardar colores"}
        </button>
      </div>
    </div>
  );
}

function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-white/70">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-12 cursor-pointer rounded-lg border border-white/15 bg-white/5"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-full rounded-lg border border-white/15 bg-white/5 px-3 text-sm text-white focus:border-hf-blue focus:outline-none"
        />
      </div>
    </label>
  );
}
