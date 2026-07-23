"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Lock, ShieldCheck, Sparkles, X } from "lucide-react";
import { submitHakunnaFitLead, checkSubdominioDisponible, type SubdomainCheckResult } from "@/lib/actions";
import { slugify } from "@/lib/slug";
import { useLeadModal, type HakunnaFitPlanKey } from "./lead-modal-context";

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

// El rango de "clientes actuales" que se puede elegir no puede superar el
// cupo del plan seleccionado — así no se registra una expectativa que el
// plan no puede cumplir.
const clientCountOptions: Record<HakunnaFitPlanKey, { value: string; label: string }[]> = {
  starter: [{ value: "1-5", label: "1 a 5" }],
  pro: [
    { value: "1-5", label: "1 a 5" },
    { value: "6-15", label: "6 a 15" },
  ],
  elite: [
    { value: "1-5", label: "1 a 5" },
    { value: "6-15", label: "6 a 15" },
    { value: "16-30", label: "16 a 30" },
  ],
};

export function HakunnaFitLeadModal() {
  const { isOpen, closeModal, selectedPlan } = useLeadModal();
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  // Si el visitante no vino de una tarjeta de plan específica, le dejamos
  // elegir aquí — con Pro preseleccionado, porque es el plan que recomendamos.
  const [planChoice, setPlanChoice] = useState<HakunnaFitPlanKey>("pro");

  // Nombre que el propio visitante propone para su página — se valida en
  // vivo contra Supabase (con debounce) para avisarle de inmediato si ya
  // está tomado, en vez de que se entere hasta que Nando la apruebe.
  const [subdominioInput, setSubdominioInput] = useState("");
  const [subdominioCheck, setSubdominioCheck] = useState<SubdomainCheckResult | null>(null);
  const [checkingSubdominio, setCheckingSubdominio] = useState(false);
  const subdominioDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const plan = selectedPlan ?? planChoice;

  useEffect(() => {
    if (subdominioDebounce.current) clearTimeout(subdominioDebounce.current);
    if (!subdominioInput.trim()) {
      setSubdominioCheck(null);
      setCheckingSubdominio(false);
      return;
    }
    setCheckingSubdominio(true);
    subdominioDebounce.current = setTimeout(() => {
      checkSubdominioDisponible(subdominioInput)
        .then(setSubdominioCheck)
        .finally(() => setCheckingSubdominio(false));
    }, 500);
    return () => {
      if (subdominioDebounce.current) clearTimeout(subdominioDebounce.current);
    };
  }, [subdominioInput]);

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
        setSubdominioInput("");
        setSubdominioCheck(null);
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
            className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-[2rem] border border-white/10 bg-[#0b0f1a] p-6 sm:p-9"
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
                  Te vamos a escribir pronto por WhatsApp o correo para mostrarte tu demo.
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
                  ¿Listo para llevar tu negocio al{" "}
                  <span className="bg-gradient-to-r from-hf-blue via-hf-purple to-hf-fuchsia bg-clip-text text-transparent">
                    siguiente nivel
                  </span>
                  ?
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-white/60">
                  Déjanos tus datos y te contactamos para mostrarte cómo HakunnaFit puede
                  transformar tu negocio.
                </p>

                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
                  <span className="flex items-center gap-1.5 text-xs text-white/50">
                    <ShieldCheck size={13} className="text-hf-blue" />
                    Demostración personalizada
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-white/50">
                    <Sparkles size={13} className="text-hf-fuchsia" />
                    Resolvemos todas tus dudas
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-white/50">
                    <Lock size={13} className="text-white/40" />
                    Sin compromiso de compra
                  </span>
                </div>

                <form
                  id="hakunnafit-lead-form"
                  action={onSubmit}
                  className="mt-6 grid gap-4 sm:grid-cols-2"
                >
                  {selectedPlan ? (
                    <div className="inline-flex w-fit items-center gap-2 rounded-full border border-hf-blue/30 bg-hf-blue/10 px-4 py-1.5 text-xs font-semibold text-white sm:col-span-2">
                      Plan seleccionado: {planLabels[selectedPlan]}{" "}
                      <span className="font-normal text-white/60">
                        ({planClientCaps[selectedPlan]})
                      </span>
                    </div>
                  ) : (
                    <label className="sm:col-span-2">
                      <span className="mb-1.5 block text-xs font-semibold text-white/70">
                        ¿Qué plan te interesa?
                      </span>
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

                  <Field label="Tu nombre" name="nombre" placeholder="Ej: Andrés Rivera" required />
                  <Field
                    label="Nombre de tu negocio"
                    name="negocio"
                    placeholder="Ej: Rivera Training"
                  />

                  <label className="sm:col-span-2">
                    <span className="mb-1.5 block text-xs font-semibold text-white/70">
                      ¿Cómo quieres que se llame tu página?
                    </span>
                    <input
                      name="subdominio_deseado"
                      value={subdominioInput}
                      onChange={(e) => setSubdominioInput(e.target.value)}
                      placeholder="Ej: riveratraining"
                      className="h-11 w-full rounded-xl border border-white/15 bg-white/5 px-4 text-sm text-white placeholder:text-white/30 focus:border-hf-blue focus:outline-none"
                    />
                    <span className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] text-white/40">
                      <span>
                        Tu página se vería así:{" "}
                        <span className="font-semibold text-white/70">
                          {(subdominioInput.trim() ? slugify(subdominioInput) : "tu-negocio") +
                            ".hakunnafit.com"}
                        </span>
                      </span>
                      {subdominioInput.trim() &&
                        (checkingSubdominio ? (
                          <span>· comprobando...</span>
                        ) : subdominioCheck?.reserved ? (
                          <span className="text-red-400">· ese nombre está reservado, prueba otro</span>
                        ) : subdominioCheck?.available === false ? (
                          <span className="text-red-400">· ya está en uso, prueba otro</span>
                        ) : subdominioCheck?.available === true ? (
                          <span className="text-emerald-400">· disponible</span>
                        ) : null)}
                    </span>
                  </label>

                  <Field
                    label="Correo electrónico"
                    name="email"
                    type="email"
                    placeholder="tucorreo@ejemplo.com"
                    required
                  />
                  <Field label="WhatsApp" name="whatsapp" placeholder="+57 300 123 4567" required />
                  <Field
                    label="Ciudad"
                    name="ciudad"
                    placeholder="Ej: Medellín, Colombia"
                    required
                  />

                  <label>
                    <span className="mb-1.5 block text-xs font-semibold text-white/70">
                      ¿Cuántos clientes tienes actualmente?
                    </span>
                    <select
                      key={plan}
                      name="num_clientes"
                      className="h-11 w-full rounded-xl border border-white/15 bg-white/5 px-4 text-sm text-white focus:border-hf-blue focus:outline-none"
                      defaultValue=""
                    >
                      <option value="" disabled className="bg-hf-black text-white">
                        Selecciona un rango
                      </option>
                      {clientCountOptions[plan].map((opt) => (
                        <option key={opt.value} value={opt.value} className="bg-hf-black text-white">
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <span className="mt-1 block text-[11px] text-white/40">
                      El plan {planLabels[plan]} admite {planClientCaps[plan]}.
                    </span>
                  </label>

                  {plan === "starter" && (
                    <label className="sm:col-span-2">
                      <span className="mb-1.5 block text-xs font-semibold text-white/70">
                        ¿Cuál es tu especialidad o tipo de entrenamiento?
                      </span>
                      <select
                        name="especialidad"
                        className="h-11 w-full rounded-xl border border-white/15 bg-white/5 px-4 text-sm text-white focus:border-hf-blue focus:outline-none"
                        defaultValue=""
                      >
                        <option value="" disabled className="bg-hf-black text-white">
                          Selecciona una opción
                        </option>
                        <option value="fuerza" className="bg-hf-black text-white">
                          Fuerza / musculación
                        </option>
                        <option value="perdida_peso" className="bg-hf-black text-white">
                          Pérdida de peso
                        </option>
                        <option value="funcional" className="bg-hf-black text-white">
                          Entrenamiento funcional
                        </option>
                        <option value="otro" className="bg-hf-black text-white">
                          Otro
                        </option>
                      </select>
                    </label>
                  )}

                  {plan === "pro" && (
                    <>
                      <label>
                        <span className="mb-1.5 block text-xs font-semibold text-white/70">
                          ¿Cómo gestionas hoy a tus clientes?
                        </span>
                        <select
                          name="metodo_actual"
                          className="h-11 w-full rounded-xl border border-white/15 bg-white/5 px-4 text-sm text-white focus:border-hf-blue focus:outline-none"
                          defaultValue=""
                        >
                          <option value="" disabled className="bg-hf-black text-white">
                            Selecciona una opción
                          </option>
                          <option value="whatsapp" className="bg-hf-black text-white">
                            WhatsApp
                          </option>
                          <option value="excel" className="bg-hf-black text-white">
                            Excel / Hojas de cálculo
                          </option>
                          <option value="papel" className="bg-hf-black text-white">
                            Papel
                          </option>
                          <option value="otra_app" className="bg-hf-black text-white">
                            Otra app
                          </option>
                        </select>
                      </label>
                      <label>
                        <span className="mb-1.5 block text-xs font-semibold text-white/70">
                          ¿Con qué pasarela de pago te gustaría integrarte?
                        </span>
                        <select
                          name="pasarela_interes"
                          className="h-11 w-full rounded-xl border border-white/15 bg-white/5 px-4 text-sm text-white focus:border-hf-blue focus:outline-none"
                          defaultValue=""
                        >
                          <option value="" disabled className="bg-hf-black text-white">
                            Selecciona una opción
                          </option>
                          <option value="wompi" className="bg-hf-black text-white">
                            Wompi
                          </option>
                          <option value="stripe" className="bg-hf-black text-white">
                            Stripe
                          </option>
                          <option value="mercado_pago" className="bg-hf-black text-white">
                            Mercado Pago
                          </option>
                          <option value="aun_no_se" className="bg-hf-black text-white">
                            Aún no sé
                          </option>
                        </select>
                      </label>
                    </>
                  )}

                  {plan === "elite" && (
                    <>
                      <label>
                        <span className="mb-1.5 block text-xs font-semibold text-white/70">
                          ¿Ya tienes dominio propio?
                        </span>
                        <select
                          name="tiene_dominio"
                          className="h-11 w-full rounded-xl border border-white/15 bg-white/5 px-4 text-sm text-white focus:border-hf-blue focus:outline-none"
                          defaultValue=""
                        >
                          <option value="" disabled className="bg-hf-black text-white">
                            Selecciona una opción
                          </option>
                          <option value="si" className="bg-hf-black text-white">
                            Sí, ya lo tengo
                          </option>
                          <option value="no" className="bg-hf-black text-white">
                            No, necesito ayuda
                          </option>
                        </select>
                      </label>
                      <label>
                        <span className="mb-1.5 block text-xs font-semibold text-white/70">
                          ¿Ya tienes logo y marca definida?
                        </span>
                        <select
                          name="tiene_logo"
                          className="h-11 w-full rounded-xl border border-white/15 bg-white/5 px-4 text-sm text-white focus:border-hf-blue focus:outline-none"
                          defaultValue=""
                        >
                          <option value="" disabled className="bg-hf-black text-white">
                            Selecciona una opción
                          </option>
                          <option value="si" className="bg-hf-black text-white">
                            Sí, ya lo tengo
                          </option>
                          <option value="no" className="bg-hf-black text-white">
                            No, necesito diseño
                          </option>
                        </select>
                      </label>
                      <label className="sm:col-span-2">
                        <span className="mb-1.5 block text-xs font-semibold text-white/70">
                          ¿Te interesa vender suplementos en tu tienda?
                        </span>
                        <select
                          name="interes_tienda"
                          className="h-11 w-full rounded-xl border border-white/15 bg-white/5 px-4 text-sm text-white focus:border-hf-blue focus:outline-none"
                          defaultValue=""
                        >
                          <option value="" disabled className="bg-hf-black text-white">
                            Selecciona una opción
                          </option>
                          <option value="si" className="bg-hf-black text-white">
                            Sí
                          </option>
                          <option value="no" className="bg-hf-black text-white">
                            No
                          </option>
                          <option value="tal_vez" className="bg-hf-black text-white">
                            Tal vez
                          </option>
                        </select>
                      </label>
                    </>
                  )}

                  <label className="sm:col-span-2">
                    <span className="mb-1.5 block text-xs font-semibold text-white/70">
                      {plan === "elite" ? "Cuéntanos sobre tu marca y qué buscas lograr" : "Mensaje (opcional)"}
                    </span>
                    <textarea
                      name="mensaje"
                      rows={plan === "elite" ? 3 : 2}
                      placeholder="Cuéntanos un poco sobre tu negocio..."
                      className="w-full rounded-xl border border-white/15 bg-white/5 p-4 text-sm text-white placeholder:text-white/30 focus:border-hf-blue focus:outline-none"
                    />
                  </label>

                  {error && <p className="text-sm text-red-400 sm:col-span-2">{error}</p>}

                  <button
                    type="submit"
                    disabled={
                      cargando ||
                      checkingSubdominio ||
                      subdominioCheck?.available === false
                    }
                    className="mt-2 rounded-full px-6 py-4 text-sm font-semibold text-white transition-transform hover:scale-[1.02] disabled:opacity-60 sm:col-span-2"
                    style={{ background: "linear-gradient(90deg,#00C8FF,#6D2EFF,#FF2DB8)" }}
                  >
                    {cargando ? "Enviando..." : "Quiero mi demo →"}
                  </button>

                  <p className="text-center text-[11px] text-white/40 sm:col-span-2">
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
