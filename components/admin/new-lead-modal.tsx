"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { CreateLeadInput, PlanKey } from "@/lib/admin-actions";
import { checkSubdominioDisponible, type SubdomainCheckResult } from "@/lib/actions";
import { slugify } from "@/lib/slug";
import { PLANS } from "@/lib/catalog";

// Formulario para que Nando agregue una solicitud a mano — para cuando
// alguien lo contacta directo por WhatsApp, llamada o en persona en vez de
// llenar el formulario público. Queda con fuente "manual" (ver LeadEditModal)
// y sigue el mismo flujo de aprobación que cualquier otra solicitud.
export function NewLeadModal({
  open,
  isPending,
  onClose,
  onCreate,
}: {
  open: boolean;
  isPending: boolean;
  onClose: () => void;
  onCreate: (input: CreateLeadInput) => void;
}) {
  const [nombre, setNombre] = useState("");
  const [negocio, setNegocio] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [ciudad, setCiudad] = useState("");
  const [plan, setPlan] = useState<PlanKey | "">("");
  const [numClientes, setNumClientes] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [subdominioInput, setSubdominioInput] = useState("");
  const [subdominioCheck, setSubdominioCheck] = useState<SubdomainCheckResult | null>(null);
  const [checkingSubdominio, setCheckingSubdominio] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) {
      setNombre("");
      setNegocio("");
      setEmail("");
      setWhatsapp("");
      setCiudad("");
      setPlan("");
      setNumClientes("");
      setMensaje("");
      setSubdominioInput("");
      setSubdominioCheck(null);
      setError(null);
    }
  }, [open]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!subdominioInput.trim()) {
      setSubdominioCheck(null);
      setCheckingSubdominio(false);
      return;
    }
    setCheckingSubdominio(true);
    debounceRef.current = setTimeout(() => {
      checkSubdominioDisponible(subdominioInput)
        .then(setSubdominioCheck)
        .finally(() => setCheckingSubdominio(false));
    }, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [subdominioInput]);

  function handleSubmit() {
    if (!nombre.trim() || !email.trim()) {
      setError("Nombre y correo son obligatorios.");
      return;
    }
    setError(null);
    onCreate({
      nombre,
      negocio: negocio || null,
      email,
      whatsapp: whatsapp || null,
      ciudad: ciudad || null,
      plan: plan || null,
      numClientes: numClientes || null,
      mensaje: mensaje || null,
      subdominioDeseado: subdominioInput || null,
    });
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            role="dialog"
            aria-modal="true"
            className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[2rem] border border-white/10 bg-[#0b0f1a] p-7"
          >
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white/60 hover:border-white/30 hover:text-white"
            >
              <X size={16} />
            </button>

            <h2 className="pr-10 text-lg font-bold text-white">Nueva solicitud</h2>
            <p className="mt-1 text-xs text-white/50">
              Para cuando alguien te escribe directo por WhatsApp o en persona, en vez de llenar el formulario.
            </p>

            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <Field label="Nombre*" value={nombre} onChange={setNombre} />
              <Field label="Negocio" value={negocio} onChange={setNegocio} />
              <Field label="Correo*" value={email} onChange={setEmail} type="email" />
              <Field label="WhatsApp" value={whatsapp} onChange={setWhatsapp} />
              <Field label="Ciudad" value={ciudad} onChange={setCiudad} />

              <label className="block">
                <span className="mb-1 block text-[11px] text-white/50">Plan de interés</span>
                <select
                  value={plan}
                  onChange={(e) => setPlan(e.target.value as PlanKey | "")}
                  className="h-9 w-full rounded-lg border border-white/15 bg-white/5 px-2 text-xs text-white"
                >
                  <option value="" className="bg-[#0b0f1a] text-white">Sin especificar</option>
                  {PLANS.map((p) => (
                    <option key={p.key} value={p.key} className="bg-[#0b0f1a] text-white">
                      {p.label}
                    </option>
                  ))}
                </select>
              </label>

              <Field label="Clientes actuales" value={numClientes} onChange={setNumClientes} placeholder="Ej: 1-5" />
            </div>

            <label className="mt-3 block">
              <span className="mb-1 block text-[11px] text-white/50">Nombre para su página (opcional)</span>
              <input
                value={subdominioInput}
                onChange={(e) => setSubdominioInput(e.target.value)}
                placeholder="Ej: riveratraining"
                className="h-9 w-full rounded-lg border border-white/15 bg-white/5 px-2 text-xs text-white"
              />
              <span className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[11px] text-white/40">
                <span>
                  Se vería así:{" "}
                  <span className="font-semibold text-white/70">
                    {(subdominioInput.trim() ? slugify(subdominioInput) : "su-negocio") + ".hakunnafit.com"}
                  </span>
                </span>
                {subdominioInput.trim() &&
                  (checkingSubdominio ? (
                    <span>· comprobando...</span>
                  ) : subdominioCheck?.reserved ? (
                    <span className="text-red-400">· reservado, prueba otro</span>
                  ) : subdominioCheck?.available === false ? (
                    <span className="text-red-400">· ya está en uso</span>
                  ) : subdominioCheck?.available === true ? (
                    <span className="text-emerald-400">· disponible</span>
                  ) : null)}
              </span>
            </label>

            <label className="mt-3 block">
              <span className="mb-1 block text-[11px] text-white/50">Notas / mensaje</span>
              <textarea
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                rows={2}
                placeholder="Cualquier detalle que te haya contado..."
                className="w-full rounded-lg border border-white/15 bg-white/5 p-2 text-xs text-white placeholder:text-white/30"
              />
            </label>

            {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

            <button
              disabled={isPending}
              onClick={handleSubmit}
              className="mt-5 w-full rounded-full py-2.5 text-xs font-semibold text-white disabled:opacity-60"
              style={{ background: "linear-gradient(90deg,#00C8FF,#6D2EFF,#FF2DB8)" }}
            >
              {isPending ? "Creando..." : "Crear solicitud"}
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] text-white/50">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 w-full rounded-lg border border-white/15 bg-white/5 px-2 text-xs text-white"
      />
    </label>
  );
}
