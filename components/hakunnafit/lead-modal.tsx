"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Lock, ShieldCheck, Sparkles, X } from "lucide-react";
import { submitHakunnaFitLead } from "@/lib/actions";
import { useLeadModal } from "./lead-modal-context";

const necesidadesOpciones = [
  "Web con mi marca",
  "Panel de administración",
  "App para mis clientes",
  "Planes con IA",
];

export function HakunnaFitLeadModal() {
  const { isOpen, closeModal } = useLeadModal();
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

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
      }, 300);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  const onSubmit = async (formData: FormData) => {
    setCargando(true);
    setError(null);
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

                <form action={onSubmit} className="mt-6 grid gap-4 sm:grid-cols-2">
                  <Field label="Tu nombre" name="nombre" placeholder="Ej: Andrés Rivera" required />
                  <Field
                    label="Nombre de tu negocio"
                    name="negocio"
                    placeholder="Ej: Rivera Training"
                  />
                  <Field
                    label="Correo electrónico"
                    name="email"
                    type="email"
                    placeholder="tucorreo@ejemplo.com"
                    required
                  />
                  <Field label="WhatsApp" name="whatsapp" placeholder="+57 300 123 4567" />

                  <label className="sm:col-span-2">
                    <span className="mb-1.5 block text-xs font-semibold text-white/70">
                      ¿Cuántos clientes tienes actualmente?
                    </span>
                    <select
                      name="num_clientes"
                      className="h-11 w-full rounded-xl border border-white/15 bg-white/5 px-4 text-sm text-white focus:border-hf-blue focus:outline-none"
                      defaultValue=""
                    >
                      <option value="" disabled className="bg-hf-black text-white">
                        Selecciona un rango
                      </option>
                      <option value="1-5" className="bg-hf-black text-white">
                        1 a 5
                      </option>
                      <option value="6-15" className="bg-hf-black text-white">
                        6 a 15
                      </option>
                      <option value="16-30" className="bg-hf-black text-white">
                        16 a 30
                      </option>
                      <option value="30+" className="bg-hf-black text-white">
                        Más de 30
                      </option>
                    </select>
                  </label>

                  <div className="sm:col-span-2">
                    <span className="mb-2 block text-xs font-semibold text-white/70">
                      ¿Qué necesitas principalmente?
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      {necesidadesOpciones.map((n) => (
                        <label key={n} className="flex items-center gap-2 text-xs text-white/70">
                          <input
                            type="checkbox"
                            name="necesidades"
                            value={n}
                            className="h-4 w-4 rounded border-white/20 bg-white/5 accent-hf-blue"
                          />
                          {n}
                        </label>
                      ))}
                    </div>
                  </div>

                  <label className="sm:col-span-2">
                    <span className="mb-1.5 block text-xs font-semibold text-white/70">
                      Mensaje (opcional)
                    </span>
                    <textarea
                      name="mensaje"
                      rows={2}
                      placeholder="Cuéntanos un poco sobre tu negocio..."
                      className="w-full rounded-xl border border-white/15 bg-white/5 p-4 text-sm text-white placeholder:text-white/30 focus:border-hf-blue focus:outline-none"
                    />
                  </label>

                  {error && <p className="text-sm text-red-400 sm:col-span-2">{error}</p>}

                  <button
                    type="submit"
                    disabled={cargando}
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
