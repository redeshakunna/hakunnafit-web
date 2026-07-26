"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Lock, ShieldCheck, Sparkles, X } from "lucide-react";
import { submitHakunnaFitLead } from "@/lib/actions";
import { TRAINER_BRANCHES } from "@/lib/catalog";
import { useLeadModal, type HakunnaFitPlanKey } from "./lead-modal-context";

// Formulario público de solicitud — a propósito es corto. HakunnaFit no es
// autoregistro: esto solo abre una solicitud que Nando revisa y aprueba
// antes de que exista cualquier cuenta. Todo lo demás (branding, servicios,
// fotos, plantilla de landing, configuración por plan...) se recoge después,
// paso a paso, en el wizard de onboarding que solo se habilita tras aprobar.
const planLabels: Record<HakunnaFitPlanKey, string> = {
  starter: "Starter",
  pro: "Pro",
  elite: "Elite",
};

const planClientCaps: Record<HakunnaFitPlanKey, string> = {
  starter: "hasta 5 clientes",
  pro: "hasta 15 clientes",
  elite: "hasta 30 clientes",
};

export function HakunnaFitLeadModal() {
  const { isOpen, closeModal, selectedPlan } = useLeadModal();
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  // Si el visitante no vino de una tarjeta de plan específica, le dejamos
  // elegir aquí — con Pro preseleccionado, porque es el plan que recomendamos.
  const [planChoice, setPlanChoice] = useState<HakunnaFitPlanKey>("pro");

  const plan = selectedPlan ?? planChoice;

  // Bloquea el scroll del fondo mientras el modal está abierto.
  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [isOpen]);

  // Al cerrar, resetea el estado para la próxima vez que se abra.
  useEffect(() => {
    if (!isOpen) {
      const t = setTimeout(() => {
        setEnviado(false);
        setError(null);
        setPlanChoice("pro");
      }, 300);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  const onSubmit = async (formData: FormData) => {
    setCargando(true);
    setError(null);
    formData.set("plan", plan);
    const result = await submitHakunnaFitLead(formData);
    setCargando(false);
    if (!result.ok) {
      setError(result.error ?? "Algo salió mal. Intenta de nuevo.");
      return;
    }
    setEnviado(true);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeModal}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            role="dialog"
            aria-modal="true"
            className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[2rem] border border-white/10 bg-[#0b0f1a] p-6 sm:p-9"
          >
            <button
              type="button"
              onClick={closeModal}
              aria-label="Cerrar"
              className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white/60 transition-colors hover:border-white/30 hover:text-white"
            >
              <X size={16} />
            </button>

            {enviado ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-full text-white"
                  style={{ background: "linear-gradient(135deg,#00C8FF,#FF2DB8)" }}
                >
                  <CheckCircle2 size={26} />
                </div>
                <h3 className="mt-5 font-[family-name:var(--font-hf-heading)] text-lg font-bold text-white">
                  Solicitud enviada
                </h3>
                <p className="mt-2 max-w-xs text-sm text-white/55">
                  Vamos a revisar tu solicitud. Si todo está en orden, te escribimos por correo o
                  WhatsApp con el siguiente paso.
                </p>
                <button
                  type="button"
                  onClick={closeModal}
                  className="mt-6 rounded-full border border-white/15 px-6 py-2.5 text-sm font-semibold text-white/80 transition-colors hover:border-white/30 hover:text-white"
                >
                  Cerrar
                </button>
              </div>
            ) : (
              <>
                <h2 className="pr-10 font-[family-name:var(--font-hf-heading)] text-xl font-black leading-tight text-white sm:text-2xl">
                  Solicita tu{" "}
                  <span className="bg-gradient-to-r from-hf-blue via-hf-purple to-hf-fuchsia bg-clip-text text-transparent">
                    plan
                  </span>
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-white/60">
                  Cada espacio en HakunnaFit se activa a mano, no por autoregistro. Cuéntanos lo
                  básico y en cuanto aprobemos tu solicitud te enviamos el enlace para armar tu
                  espacio.
                </p>

                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
                  <span className="flex items-center gap-1.5 text-xs text-white/50">
                    <ShieldCheck size={13} className="text-hf-blue" />
                    Revisión personalizada
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-white/50">
                    <Sparkles size={13} className="text-hf-fuchsia" />
                    Acompañamiento en tu onboarding
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-white/50">
                    <Lock size={13} className="text-white/40" />
                    Sin compromiso de compra
                  </span>
                </div>

                <form id="hakunnafit-lead-form" action={onSubmit} className="mt-6 grid gap-4">
                  {selectedPlan ? (
                    <div className="inline-flex w-fit items-center gap-2 rounded-full border border-hf-blue/30 bg-hf-blue/10 px-4 py-1.5 text-xs font-semibold text-white">
                      Plan seleccionado: {planLabels[selectedPlan]}{" "}
                      <span className="font-normal text-white/60">({planClientCaps[selectedPlan]})</span>
                    </div>
                  ) : (
                    <label>
                      <span className="mb-1.5 block text-xs font-semibold text-white/70">Plan seleccionado</span>
                      <select
                        value={planChoice}
                        onChange={(e) => setPlanChoice(e.target.value as HakunnaFitPlanKey)}
                        className="h-11 w-full rounded-xl border border-white/15 bg-white/5 px-4 text-sm text-white focus:border-hf-blue focus:outline-none"
                      >
                        <option value="starter" className="bg-hf-black text-white">
                          Starter — hasta 5 clientes
                        </option>
                        <option value="pro" className="bg-hf-black text-white">
                          Pro — recomendado, hasta 15 clientes
                        </option>
                        <option value="elite" className="bg-hf-black text-white">
                          Elite — hasta 30 clientes
                        </option>
                      </select>
                    </label>
                  )}

                  <Field label="Nombre completo" name="nombre" placeholder="Ej: Andrés Rivera" required />
                  <Field label="Correo electrónico" name="email" type="email" placeholder="tucorreo@ejemplo.com" required />
                  <Field label="WhatsApp" name="whatsapp" placeholder="+57 300 123 4567" required />
                  <Field label="Ciudad" name="ciudad" placeholder="Ej: Medellín, Colombia" required />

                  <label>
                    <span className="mb-1.5 block text-xs font-semibold text-white/70">
                      ¿Cuál es tu rama de entrenamiento?
                    </span>
                    <select
                      name="especialidad"
                      className="h-11 w-full rounded-xl border border-white/15 bg-white/5 px-4 text-sm text-white focus:border-hf-blue focus:outline-none"
                      defaultValue=""
                    >
                      <option value="" disabled className="bg-hf-black text-white">
                        Selecciona una opción
                      </option>
                      {TRAINER_BRANCHES.map((b) => (
                        <option key={b.key} value={b.key} className="bg-hf-black text-white">
                          {b.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span className="mb-1.5 block text-xs font-semibold text-white/70">Comentario (opcional)</span>
                    <textarea
                      name="mensaje"
                      rows={2}
                      placeholder="Cuéntanos un poco sobre tu negocio..."
                      className="w-full rounded-xl border border-white/15 bg-white/5 p-4 text-sm text-white placeholder:text-white/30 focus:border-hf-blue focus:outline-none"
                    />
                  </label>

                  {error && <p className="text-sm text-red-400">{error}</p>}

                  <button
                    type="submit"
                    disabled={cargando}
                    className="mt-2 rounded-full px-6 py-4 text-sm font-semibold text-white transition-transform hover:scale-[1.02] disabled:opacity-60"
                    style={{ background: "linear-gradient(90deg,#00C8FF,#6D2EFF,#FF2DB8)" }}
                  >
                    {cargando ? "Enviando..." : "Enviar Solicitud"}
                  </button>

                  <p className="text-center text-[11px] text-white/40">
                    <Lock size={10} className="mr-1 inline" />
                    Tu información está 100% segura. Nunca compartimos tus datos.
                  </p>
                </form>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function Field({
  label,
  name,
  placeholder,
  type = "text",
  required,
}: {
  label: string;
  name: string;
  placeholder: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <label>
      <span className="mb-1.5 block text-xs font-semibold text-white/70">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-white/15 bg-white/5 px-4 text-sm text-white placeholder:text-white/30 focus:border-hf-blue focus:outline-none"
      />
    </label>
  );
}
