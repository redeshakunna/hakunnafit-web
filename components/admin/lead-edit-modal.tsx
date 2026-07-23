"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { LeadRow, PlanKey } from "@/lib/admin-actions";
import { PLANS } from "@/lib/catalog";
import { fmtDate, planLabels } from "./admin-ui";

const estadoLabels: Record<string, string> = {
  nuevo: "Nuevo",
  contactado: "Contactado",
  convertido: "Entrenador aprobado",
  descartado: "Descartado",
};

const answerLabels: Record<string, string> = {
  fuerza: "Fuerza / musculación",
  perdida_peso: "Pérdida de peso",
  funcional: "Entrenamiento funcional",
  otro: "Otro",
  whatsapp: "WhatsApp",
  excel: "Excel / hojas de cálculo",
  papel: "Papel",
  otra_app: "Otra app",
  wompi: "Wompi",
  stripe: "Stripe",
  mercado_pago: "Mercado Pago",
  aun_no_se: "Aún no sabe",
  si: "Sí",
  no: "No",
  tal_vez: "Tal vez",
};

export function LeadEditModal({
  lead,
  isPending,
  converting,
  convertPlan,
  convertProximoCobro,
  onClose,
  onPatch,
  onEstadoChange,
  onApprove,
  onStartConvert,
  onCancelConvert,
  onConvertPlanChange,
  onConvertProximoCobroChange,
  onConfirmConvert,
}: {
  lead: LeadRow | null;
  isPending: boolean;
  converting: boolean;
  convertPlan: PlanKey;
  convertProximoCobro: string;
  onClose: () => void;
  onPatch: (leadId: string, fields: Partial<LeadRow>) => void;
  onEstadoChange: (leadId: string, estado: string) => void;
  onApprove: (leadId: string) => void;
  onStartConvert: () => void;
  onCancelConvert: () => void;
  onConvertPlanChange: (plan: PlanKey) => void;
  onConvertProximoCobroChange: (date: string) => void;
  onConfirmConvert: () => void;
}) {
  return (
    <AnimatePresence>
      {lead && (
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

            <label className="block pr-10">
              <span className="mb-1 block text-[11px] text-white/50">Nombre</span>
              <input
                key={`nombre-${lead.id}`}
                defaultValue={lead.nombre}
                onBlur={(e) => e.target.value.trim() && onPatch(lead.id, { nombre: e.target.value })}
                className="h-9 w-full rounded-lg border border-white/15 bg-transparent px-2 text-base font-bold text-white"
              />
            </label>
            <label className="mt-2 block pr-10">
              <span className="mb-1 block text-[11px] text-white/50">Negocio</span>
              <input
                key={`negocio-${lead.id}`}
                defaultValue={lead.negocio ?? ""}
                onBlur={(e) => onPatch(lead.id, { negocio: e.target.value })}
                className="h-9 w-full rounded-lg border border-white/15 bg-white/5 px-2 text-xs text-white"
              />
            </label>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-[11px] text-white/50">Correo</span>
                <input
                  key={`email-${lead.id}`}
                  type="email"
                  defaultValue={lead.email}
                  onBlur={(e) => e.target.value.trim() && onPatch(lead.id, { email: e.target.value })}
                  className="h-9 w-full rounded-lg border border-white/15 bg-white/5 px-2 text-xs text-white"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-[11px] text-white/50">WhatsApp</span>
                <input
                  key={`wa-${lead.id}`}
                  defaultValue={lead.whatsapp ?? ""}
                  onBlur={(e) => onPatch(lead.id, { whatsapp: e.target.value })}
                  className="h-9 w-full rounded-lg border border-white/15 bg-white/5 px-2 text-xs text-white"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-[11px] text-white/50">Ciudad</span>
                <input
                  key={`ciudad-${lead.id}`}
                  defaultValue={lead.ciudad ?? ""}
                  onBlur={(e) => onPatch(lead.id, { ciudad: e.target.value })}
                  className="h-9 w-full rounded-lg border border-white/15 bg-white/5 px-2 text-xs text-white"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-[11px] text-white/50">Plan interesado</span>
                <select
                  value={lead.plan ?? ""}
                  onChange={(e) => onPatch(lead.id, { plan: (e.target.value || null) as PlanKey | null })}
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

              <label className="block">
                <span className="mb-1 block text-[11px] text-white/50">Estado</span>
                <select
                  value={lead.estado}
                  disabled={lead.estado === "convertido"}
                  onChange={(e) => onEstadoChange(lead.id, e.target.value)}
                  className="h-9 w-full rounded-lg border border-white/15 bg-white/5 px-2 text-xs text-white disabled:opacity-50"
                >
                  <option value="nuevo" className="bg-[#0b0f1a] text-white">{estadoLabels.nuevo}</option>
                  <option value="contactado" className="bg-[#0b0f1a] text-white">{estadoLabels.contactado}</option>
                  <option value="descartado" className="bg-[#0b0f1a] text-white">{estadoLabels.descartado}</option>
                  {lead.estado === "convertido" && (
                    <option value="convertido" className="bg-[#0b0f1a] text-white">{estadoLabels.convertido}</option>
                  )}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-[11px] text-white/50">Clientes actuales</span>
                <input
                  disabled
                  value={lead.num_clientes ?? "—"}
                  className="h-9 w-full rounded-lg border border-white/10 bg-white/[0.02] px-2 text-xs text-white/50"
                />
              </label>
            </div>

            {lead.subdominio_propuesto && (
              <p className="mt-3 text-[11px] text-white/40">
                Subdominio propuesto: <span className="text-white/70">{lead.subdominio_propuesto}.hakunnafit.com</span>
              </p>
            )}

            {lead.plan === "starter" && lead.especialidad && (
              <p className="mt-1 text-[11px] text-white/40">
                Especialidad: <span className="text-white/70">{answerLabels[lead.especialidad] ?? lead.especialidad}</span>
              </p>
            )}
            {lead.plan === "pro" && (
              <>
                {lead.metodo_actual && (
                  <p className="mt-1 text-[11px] text-white/40">
                    Gestión actual: <span className="text-white/70">{answerLabels[lead.metodo_actual] ?? lead.metodo_actual}</span>
                  </p>
                )}
                {lead.pasarela_interes && (
                  <p className="mt-1 text-[11px] text-white/40">
                    Pasarela de interés: <span className="text-white/70">{answerLabels[lead.pasarela_interes] ?? lead.pasarela_interes}</span>
                  </p>
                )}
              </>
            )}
            {lead.plan === "elite" && (
              <>
                {lead.tiene_dominio && (
                  <p className="mt-1 text-[11px] text-white/40">
                    ¿Tiene dominio propio? <span className="text-white/70">{answerLabels[lead.tiene_dominio] ?? lead.tiene_dominio}</span>
                  </p>
                )}
                {lead.tiene_logo && (
                  <p className="mt-1 text-[11px] text-white/40">
                    ¿Tiene logo/marca? <span className="text-white/70">{answerLabels[lead.tiene_logo] ?? lead.tiene_logo}</span>
                  </p>
                )}
                {lead.interes_tienda && (
                  <p className="mt-1 text-[11px] text-white/40">
                    ¿Le interesa la tienda? <span className="text-white/70">{answerLabels[lead.interes_tienda] ?? lead.interes_tienda}</span>
                  </p>
                )}
              </>
            )}

            <label className="mt-3 block">
              <span className="mb-1 block text-[11px] text-white/50">Mensaje</span>
              <textarea
                key={`mensaje-${lead.id}`}
                defaultValue={lead.mensaje ?? ""}
                onBlur={(e) => onPatch(lead.id, { mensaje: e.target.value })}
                rows={3}
                placeholder="Sin mensaje"
                className="w-full rounded-lg border border-white/15 bg-white/5 p-2 text-xs text-white placeholder:text-white/30"
              />
            </label>

            <div className="mt-5 grid grid-cols-2 gap-2 border-t border-white/10 pt-4 text-[11px] text-white/50">
              <span>Fuente</span>
              <span className="text-right text-white">
                {lead.fuente === "manual" ? "Agregada manualmente" : "Formulario web"}
              </span>
              <span>Fecha</span>
              <span className="text-right text-white">{fmtDate(lead.created_at)}</span>
            </div>

            {lead.estado === "convertido" ? (
              <p className="mt-5 rounded-full border border-emerald-500/30 bg-emerald-500/10 py-2.5 text-center text-xs font-semibold text-emerald-400">
                Ya es entrenador — revísalo en Entrenadores
              </p>
            ) : (
              <>
                {lead.plan && !converting && (
                  <button
                    disabled={isPending}
                    onClick={() => onApprove(lead.id)}
                    className="mt-5 w-full rounded-full py-2.5 text-xs font-semibold text-white disabled:opacity-60"
                    style={{ background: "linear-gradient(90deg,#00C8FF,#6D2EFF,#FF2DB8)" }}
                  >
                    {isPending ? "Aprobando..." : `Aprobar entrenador (${planLabels[lead.plan]})`}
                  </button>
                )}

                {!lead.plan && !converting && (
                  <button
                    onClick={onStartConvert}
                    className="mt-5 w-full rounded-full py-2.5 text-xs font-semibold text-white"
                    style={{ background: "linear-gradient(90deg,#00C8FF,#6D2EFF,#FF2DB8)" }}
                  >
                    Convertir en entrenador
                  </button>
                )}

                {converting && (
                  <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-3">
                    <label className="block">
                      <span className="mb-1 block text-[11px] text-white/50">Plan definitivo</span>
                      <select
                        value={convertPlan}
                        onChange={(e) => onConvertPlanChange(e.target.value as PlanKey)}
                        className="h-9 w-full rounded-lg border border-white/15 bg-white/5 px-2 text-xs text-white"
                      >
                        {PLANS.map((p) => (
                          <option key={p.key} value={p.key} className="bg-[#0b0f1a] text-white">
                            {p.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="mt-2 block">
                      <span className="mb-1 block text-[11px] text-white/50">Próximo cobro</span>
                      <input
                        type="date"
                        value={convertProximoCobro}
                        onChange={(e) => onConvertProximoCobroChange(e.target.value)}
                        className="h-9 w-full rounded-lg border border-white/15 bg-white/5 px-2 text-xs text-white [color-scheme:dark]"
                      />
                    </label>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={onCancelConvert}
                        className="flex-1 rounded-full border border-white/15 py-1.5 text-xs text-white/60"
                      >
                        Cancelar
                      </button>
                      <button
                        disabled={isPending}
                        onClick={onConfirmConvert}
                        className="flex-1 rounded-full py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                        style={{ background: "linear-gradient(90deg,#00C8FF,#6D2EFF,#FF2DB8)" }}
                      >
                        {isPending ? "..." : "Confirmar"}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
