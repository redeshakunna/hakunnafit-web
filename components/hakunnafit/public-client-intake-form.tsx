"use client";

// Formulario público completo de alta de cliente — vive en
// /landing/[subdominio]/registro (osea {subdominio}.hakunnafit.com/registro
// gracias al rewrite de middleware.ts). Es el segundo punto de entrada que
// pidió Nando: el entrenador manda este link por WhatsApp cuando quiere
// capturar los datos de un cliente puntual antes de su evaluación, sin
// depender de que esa persona haya visto la landing pública.
//
// Reusa el mismo server action que el formulario ligero embebido en la
// landing (submitPublicClientIntake) — la diferencia entre los dos puntos de
// entrada es cuántos campos pide, no la lógica de guardado.

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { submitPublicClientIntake } from "@/lib/public-client-actions";

const NIVELES = [
  { value: "", label: "Selecciona tu nivel" },
  { value: "principiante", label: "Principiante" },
  { value: "intermedio", label: "Intermedio" },
  { value: "avanzado", label: "Avanzado" },
];

const SEXOS = [
  { value: "", label: "Selecciona" },
  { value: "femenino", label: "Femenino" },
  { value: "masculino", label: "Masculino" },
  { value: "otro", label: "Otro" },
];

export function PublicClientIntakeForm({ subdominio }: { subdominio: string }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [sexo, setSexo] = useState("");
  const [nivel, setNivel] = useState("");
  const [objetivo, setObjetivo] = useState("");
  const [diasPorSemana, setDiasPorSemana] = useState("");
  const [horarioEntreno, setHorarioEntreno] = useState("");
  const [honeypot, setHoneypot] = useState("");

  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError(null);

    const result = await submitPublicClientIntake({
      subdominio,
      fullName,
      email,
      whatsapp,
      sexo: sexo || null,
      nivel: nivel || null,
      objetivo: objetivo || null,
      diasPorSemana: diasPorSemana ? Number(diasPorSemana) : null,
      horarioEntreno: horarioEntreno || null,
      honeypot,
    });

    if (!result.ok) {
      setStatus("error");
      setError(result.error ?? "No pudimos guardar tus datos. Intenta de nuevo.");
      return;
    }
    setStatus("done");
  }

  if (status === "done") {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-white/10 bg-white/5 px-6 py-12 text-center">
        <CheckCircle2 size={40} className="text-hf-blue" />
        <div>
          <p className="text-lg font-semibold text-white">¡Listo, {fullName.split(" ")[0]}!</p>
          <p className="mt-1 text-sm text-white/60">
            Ya tenemos tus datos. Tu entrenador va a contactarte pronto para agendar tu evaluación.
          </p>
        </div>
      </div>
    );
  }

  const inputClass =
    "h-11 w-full rounded-xl border border-white/15 bg-white/5 px-4 text-sm text-white placeholder:text-white/30 focus:border-hf-blue focus:outline-none";
  const labelClass = "mb-1.5 block text-xs font-medium text-white/60";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {/* Honeypot — invisible para una persona real, cualquier bot que llene
          todos los campos cae aquí y la solicitud se descarta en silencio. */}
      <input
        type="text"
        name="empresa"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
        aria-hidden="true"
      />

      <div>
        <label className={labelClass}>Nombre completo *</label>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
          placeholder="Tu nombre"
          className={inputClass}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Correo</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@correo.com"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>WhatsApp</label>
          <input
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="+57 300 000 0000"
            className={inputClass}
          />
        </div>
      </div>
      <p className="-mt-2 text-xs text-white/40">Déjanos al menos uno de los dos.</p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Sexo</label>
          <select value={sexo} onChange={(e) => setSexo(e.target.value)} className={inputClass}>
            {SEXOS.map((s) => (
              <option key={s.value} value={s.value} className="bg-hf-black">
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Nivel</label>
          <select value={nivel} onChange={(e) => setNivel(e.target.value)} className={inputClass}>
            {NIVELES.map((n) => (
              <option key={n.value} value={n.value} className="bg-hf-black">
                {n.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass}>¿Cuál es tu objetivo?</label>
        <textarea
          value={objetivo}
          onChange={(e) => setObjetivo(e.target.value)}
          rows={3}
          placeholder="Ej. Perder grasa, ganar fuerza, prepararme para una carrera..."
          className="w-full resize-none rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-hf-blue focus:outline-none"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Días por semana</label>
          <input
            type="number"
            min={1}
            max={7}
            value={diasPorSemana}
            onChange={(e) => setDiasPorSemana(e.target.value)}
            placeholder="Ej. 4"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Horario que prefieres</label>
          <input
            value={horarioEntreno}
            onChange={(e) => setHorarioEntreno(e.target.value)}
            placeholder="Ej. Mañanas"
            className={inputClass}
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={status === "loading"}
        className="mt-2 flex h-12 items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white transition-transform hover:scale-[1.01] disabled:opacity-60"
        style={{ background: "linear-gradient(90deg,#00C8FF,#6D2EFF,#FF2DB8)" }}
      >
        {status === "loading" ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Guardando...
          </>
        ) : (
          "Enviar mis datos"
        )}
      </button>
    </form>
  );
}
