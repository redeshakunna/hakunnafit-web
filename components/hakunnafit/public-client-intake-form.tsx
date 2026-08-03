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
import { calculateImc } from "@/lib/imc";
import type { PlanOfrecido } from "@/lib/admin-actions";
import {
  ACCESO_EQUIPO,
  EXPERIENCIA_CROSSFIT,
  EXPERIENCIA_PESAS,
  OBJETIVOS_CARRERA,
  OBJETIVOS_CROSSFIT,
  SUPERFICIES,
  emptyPerfilCrossfit,
  emptyPerfilRunning,
  perfilShapeForBranch,
  type PerfilCrossfit,
  type PerfilRunning,
} from "@/lib/client-profile-types";

const cop = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

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

const ACTIVIDADES = [
  { value: "", label: "Selecciona" },
  { value: "sedentario", label: "Sedentario" },
  { value: "ligero", label: "Ligero (1-3 días/semana)" },
  { value: "moderado", label: "Moderado (3-5 días/semana)" },
  { value: "activo", label: "Activo (6-7 días/semana)" },
  { value: "muy_activo", label: "Muy activo" },
];

// Franjas horarias reales para elegir cuándo entrenar (mismo criterio que el
// formulario principal de registro) — evita texto libre tipo "6" que no dice
// nada, el cliente elige entre horas concretas.
const HORARIOS_ENTRENO = ["5:00 am", "6:00 am", "7:00 am", "12:00 pm", "4:00 pm", "6:00 pm", "7:00 pm"];

const IMC_CATEGORY_CLASS: Record<string, string> = {
  bajo_peso: "bg-sky-500/10 text-sky-400",
  normal: "bg-emerald-500/10 text-emerald-400",
  sobrepeso: "bg-amber-500/10 text-amber-400",
  obesidad: "bg-red-500/10 text-red-400",
};

export function PublicClientIntakeForm({
  subdominio,
  planes = [],
  especialidad = null,
}: {
  subdominio: string;
  planes?: PlanOfrecido[];
  especialidad?: string | null;
}) {
  const rama = perfilShapeForBranch(especialidad);

  const [fullName, setFullName] = useState("");
  const [documento, setDocumento] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [sexo, setSexo] = useState("");
  const [nivel, setNivel] = useState("");
  const [actividad, setActividad] = useState("");
  const [planElegido, setPlanElegido] = useState("");
  const [objetivo, setObjetivo] = useState("");
  const [pesoActual, setPesoActual] = useState("");
  const [altura, setAltura] = useState("");
  const [diasPorSemana, setDiasPorSemana] = useState("");
  const [horarioEntreno, setHorarioEntreno] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [perfilRunning, setPerfilRunning] = useState<PerfilRunning>(emptyPerfilRunning());
  const [perfilCrossfit, setPerfilCrossfit] = useState<PerfilCrossfit>(emptyPerfilCrossfit());

  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  // Se calcula al instante con una fórmula (peso/altura²), no con IA — ver
  // lib/imc.ts. Nada más útil te dice el peso/altura por sí solos que verlo
  // ya interpretado mientras llenas el formulario.
  const imc = calculateImc(pesoActual ? Number(pesoActual) : null, altura ? Number(altura) : null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    setError(null);

    const result = await submitPublicClientIntake({
      subdominio,
      fullName,
      documento,
      email,
      whatsapp,
      sexo: sexo || null,
      nivel: nivel || null,
      actividad: actividad || null,
      objetivo: objetivo || null,
      planElegido: planElegido || null,
      pesoActual: pesoActual ? Number(pesoActual) : null,
      altura: altura ? Number(altura) : null,
      diasPorSemana: diasPorSemana ? Number(diasPorSemana) : null,
      horarioEntreno: horarioEntreno || null,
      perfilDeportivo: rama === "running" ? perfilRunning : rama === "crossfit" ? perfilCrossfit : null,
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

      <div>
        <label className={labelClass}>Documento (cédula) *</label>
        <input
          value={documento}
          onChange={(e) => setDocumento(e.target.value)}
          required
          placeholder="Lo usarás para entrar a tu portal más adelante"
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
        <label className={labelClass}>Actividad diaria (fuera del entreno)</label>
        <select value={actividad} onChange={(e) => setActividad(e.target.value)} className={inputClass}>
          {ACTIVIDADES.map((a) => (
            <option key={a.value} value={a.value} className="bg-hf-black">
              {a.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Peso (kg)</label>
          <input
            type="number"
            step="0.1"
            min={0}
            value={pesoActual}
            onChange={(e) => setPesoActual(e.target.value)}
            placeholder="Ej. 70"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Estatura (cm)</label>
          <input
            type="number"
            step="0.1"
            min={0}
            value={altura}
            onChange={(e) => setAltura(e.target.value)}
            placeholder="Ej. 170"
            className={inputClass}
          />
        </div>
      </div>
      {imc && (
        <div className={`-mt-2 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${IMC_CATEGORY_CLASS[imc.category]}`}>
          Tu IMC: {imc.value} — {imc.label}
        </div>
      )}

      {planes.length > 0 && (
        <div>
          <label className={labelClass}>¿Qué plan te interesa?</label>
          <select value={planElegido} onChange={(e) => setPlanElegido(e.target.value)} className={inputClass}>
            <option value="" className="bg-hf-black">
              Selecciona un plan
            </option>
            {planes.map((p) => (
              <option key={p.nombre} value={p.nombre} className="bg-hf-black">
                {p.nombre} — {p.precioCop != null ? cop.format(p.precioCop) : "Personalizado"}
              </option>
            ))}
          </select>
        </div>
      )}

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

      {rama === "running" && (
        <div className="flex flex-col gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Sobre tu running</p>
          <div>
            <label className={labelClass}>¿Cuál es tu objetivo de carrera?</label>
            <select
              value={perfilRunning.objetivoCarrera ?? ""}
              onChange={(e) => setPerfilRunning((p) => ({ ...p, objetivoCarrera: e.target.value || null }))}
              className={inputClass}
            >
              <option value="" className="bg-hf-black">Selecciona</option>
              {OBJETIVOS_CARRERA.map((o) => (
                <option key={o.value} value={o.value} className="bg-hf-black">{o.label}</option>
              ))}
            </select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Fecha de tu carrera (si tienes una)</label>
              <input
                type="date"
                value={perfilRunning.fechaCarreraObjetivo ?? ""}
                onChange={(e) => setPerfilRunning((p) => ({ ...p, fechaCarreraObjetivo: e.target.value || null }))}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Kilometraje semanal actual</label>
              <input
                type="number"
                min={0}
                value={perfilRunning.kilometrajeSemanal ?? ""}
                onChange={(e) => setPerfilRunning((p) => ({ ...p, kilometrajeSemanal: e.target.value ? Number(e.target.value) : null }))}
                placeholder="Ej. 15 km/semana"
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Tu mejor marca (si tienes una)</label>
            <input
              value={perfilRunning.mejorMarca ?? ""}
              onChange={(e) => setPerfilRunning((p) => ({ ...p, mejorMarca: e.target.value || null }))}
              placeholder="Ej. 10K en 52:30, o 'aún no he corrido una carrera'"
              className={inputClass}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Superficie donde entrenas</label>
              <select
                value={perfilRunning.superficieHabitual ?? ""}
                onChange={(e) => setPerfilRunning((p) => ({ ...p, superficieHabitual: e.target.value || null }))}
                className={inputClass}
              >
                <option value="" className="bg-hf-black">Selecciona</option>
                {SUPERFICIES.map((s) => (
                  <option key={s.value} value={s.value} className="bg-hf-black">{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Años corriendo</label>
              <input
                type="number"
                min={0}
                value={perfilRunning.experienciaAnios ?? ""}
                onChange={(e) => setPerfilRunning((p) => ({ ...p, experienciaAnios: e.target.value ? Number(e.target.value) : null }))}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>¿Tienes alguna lesión o molestia actual?</label>
            <input
              value={perfilRunning.lesiones ?? ""}
              onChange={(e) => setPerfilRunning((p) => ({ ...p, lesiones: e.target.value || null }))}
              placeholder="Ej. molestia en la rodilla derecha, o 'ninguna'"
              className={inputClass}
            />
          </div>
        </div>
      )}

      {rama === "crossfit" && (
        <div className="flex flex-col gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Sobre tu crossfit</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>Experiencia en crossfit</label>
              <select
                value={perfilCrossfit.experienciaCrossfit ?? ""}
                onChange={(e) => setPerfilCrossfit((p) => ({ ...p, experienciaCrossfit: e.target.value || null }))}
                className={inputClass}
              >
                <option value="" className="bg-hf-black">Selecciona</option>
                {EXPERIENCIA_CROSSFIT.map((o) => (
                  <option key={o.value} value={o.value} className="bg-hf-black">{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Experiencia previa con pesas</label>
              <select
                value={perfilCrossfit.experienciaPesas ?? ""}
                onChange={(e) => setPerfilCrossfit((p) => ({ ...p, experienciaPesas: e.target.value || null }))}
                className={inputClass}
              >
                <option value="" className="bg-hf-black">Selecciona</option>
                {EXPERIENCIA_PESAS.map((o) => (
                  <option key={o.value} value={o.value} className="bg-hf-black">{o.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass}>¿Cuál es tu objetivo?</label>
            <select
              value={perfilCrossfit.objetivoCrossfit ?? ""}
              onChange={(e) => setPerfilCrossfit((p) => ({ ...p, objetivoCrossfit: e.target.value || null }))}
              className={inputClass}
            >
              <option value="" className="bg-hf-black">Selecciona</option>
              {OBJETIVOS_CROSSFIT.map((o) => (
                <option key={o.value} value={o.value} className="bg-hf-black">{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Marcas actuales (si las conoces)</label>
            <input
              value={perfilCrossfit.benchmarks ?? ""}
              onChange={(e) => setPerfilCrossfit((p) => ({ ...p, benchmarks: e.target.value || null }))}
              placeholder="Ej. Back Squat 80kg, Deadlift 100kg, aún no hago snatch"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Acceso a equipo</label>
            <select
              value={perfilCrossfit.accesoEquipo ?? ""}
              onChange={(e) => setPerfilCrossfit((p) => ({ ...p, accesoEquipo: e.target.value || null }))}
              className={inputClass}
            >
              <option value="" className="bg-hf-black">Selecciona</option>
              {ACCESO_EQUIPO.map((o) => (
                <option key={o.value} value={o.value} className="bg-hf-black">{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>¿Alguna molestia o limitación de movilidad?</label>
            <input
              value={perfilCrossfit.limitaciones ?? ""}
              onChange={(e) => setPerfilCrossfit((p) => ({ ...p, limitaciones: e.target.value || null }))}
              placeholder="Ej. molestia en el hombro, o 'ninguna'"
              className={inputClass}
            />
          </div>
        </div>
      )}

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
          <select value={horarioEntreno} onChange={(e) => setHorarioEntreno(e.target.value)} className={inputClass}>
            <option value="" className="bg-hf-black">
              Selecciona un horario
            </option>
            {HORARIOS_ENTRENO.map((h) => (
              <option key={h} value={h} className="bg-hf-black">
                {h}
              </option>
            ))}
          </select>
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
