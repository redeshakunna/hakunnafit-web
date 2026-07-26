"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { updateOwnContent } from "@/lib/trainer-actions";
import type { TrainerRow } from "@/lib/admin-actions";

type Servicio = { titulo: string; descripcion: string; tipo: "directo" | "personalizado" };

export function TrainerContentForm({ trainer }: { trainer: TrainerRow }) {
  const [tagline, setTagline] = useState(trainer.tagline || "");
  const [biografia, setBiografia] = useState(trainer.biografia || "");
  const [whatsapp, setWhatsapp] = useState(trainer.whatsapp || "");
  const [ciudad, setCiudad] = useState(trainer.ciudad || "");
  const [emailPublico, setEmailPublico] = useState(trainer.email_publico || "");
  const [instagram, setInstagram] = useState(trainer.instagram || "");
  const [facebook, setFacebook] = useState(trainer.facebook || "");
  const [servicios, setServicios] = useState<Servicio[]>(
    (trainer.servicios as Servicio[] | null) || []
  );

  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  function updateServicio(i: number, patch: Partial<Servicio>) {
    setServicios((prev) => prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }
  function addServicio() {
    setServicios((prev) => [...prev, { titulo: "", descripcion: "", tipo: "directo" }]);
  }
  function removeServicio(i: number) {
    setServicios((prev) => prev.filter((_, idx) => idx !== i));
  }

  function save() {
    setStatus("idle");
    setError(null);
    startTransition(async () => {
      const res = await updateOwnContent({
        tagline,
        biografia,
        whatsapp,
        ciudad,
        emailPublico,
        instagram,
        facebook,
        servicios: servicios.filter((s) => s.titulo.trim()),
      });
      if (!res.ok) {
        setStatus("error");
        setError(res.error || "No se pudo guardar.");
        return;
      }
      setStatus("ok");
    });
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-xl font-bold text-white">Textos y servicios</h1>
      <p className="mt-1 text-sm text-white/50">Esto se muestra tal cual en tu landing pública.</p>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <p className="mb-4 text-sm font-semibold text-white">Perfil</p>
        <div className="flex flex-col gap-4">
          <Field label="Frase principal" value={tagline} onChange={setTagline} placeholder="Ej: Entrena tu cuerpo, transforma tu vida." />
          <Field label="Biografía" value={biografia} onChange={setBiografia} textarea />
          <div className="grid grid-cols-2 gap-4">
            <Field label="WhatsApp" value={whatsapp} onChange={setWhatsapp} />
            <Field label="Ciudad" value={ciudad} onChange={setCiudad} />
          </div>
          <Field label="Correo público" value={emailPublico} onChange={setEmailPublico} />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Instagram" value={instagram} onChange={setInstagram} placeholder="@tuusuario" />
            <Field label="Facebook" value={facebook} onChange={setFacebook} />
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold text-white">Servicios</p>
          <button
            type="button"
            onClick={addServicio}
            className="flex items-center gap-1 rounded-full border border-white/15 px-3 py-1.5 text-[11px] font-semibold text-white/70 hover:border-white/30"
          >
            <Plus size={12} /> Agregar
          </button>
        </div>

        <div className="flex flex-col gap-3">
          {servicios.map((s, i) => (
            <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="flex items-start gap-2">
                <div className="flex-1 space-y-2">
                  <input
                    value={s.titulo}
                    onChange={(e) => updateServicio(i, { titulo: e.target.value })}
                    placeholder="Título del servicio"
                    className="h-9 w-full rounded-lg border border-white/15 bg-white/5 px-3 text-sm text-white focus:border-hf-blue focus:outline-none"
                  />
                  <textarea
                    value={s.descripcion}
                    onChange={(e) => updateServicio(i, { descripcion: e.target.value })}
                    placeholder="Descripción"
                    rows={2}
                    className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white focus:border-hf-blue focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeServicio(i)}
                  className="rounded-lg border border-white/10 p-2 text-white/40 hover:border-red-500/40 hover:text-red-400"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          {servicios.length === 0 && (
            <p className="text-xs text-white/40">Todavía no has agregado servicios.</p>
          )}
        </div>
      </div>

      {status === "error" && <p className="mt-4 text-sm text-red-400">{error}</p>}
      {status === "ok" && <p className="mt-4 text-sm text-emerald-400">Cambios guardados.</p>}

      <button
        type="button"
        disabled={isPending}
        onClick={save}
        className="mt-5 rounded-full px-6 py-2.5 text-sm font-semibold text-black disabled:opacity-50"
        style={{ background: "linear-gradient(90deg,#00C8FF,#6D2EFF)" }}
      >
        {isPending ? "Guardando..." : "Guardar cambios"}
      </button>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  textarea,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  textarea?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-white/70">{label}</span>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={4}
          className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white focus:border-hf-blue focus:outline-none"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-10 w-full rounded-lg border border-white/15 bg-white/5 px-3 text-sm text-white focus:border-hf-blue focus:outline-none"
        />
      )}
    </label>
  );
}
