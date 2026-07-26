"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, Copy, CreditCard, Facebook, Instagram, Mail, MessageCircle, RefreshCw, X } from "lucide-react";
import {
  uploadLeadAvatar,
  generatePaymentLink,
  getPaymentLinkUrl,
  sendPaymentLinkEmail,
  type LeadRow,
  type PlanKey,
  type PagoCiclo,
} from "@/lib/admin-actions";
import type { PlanPrices } from "@/lib/plan-settings-actions";
import { PLANS, STARTER_LANDING_TEMPLATES, DEFAULT_STARTER_TEMPLATE } from "@/lib/catalog";
import Link from "next/link";
import { fmtDate, planLabels } from "./admin-ui";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://hakunnafit.com";

// Estados del nuevo flujo guiado — Hakunna Fit no es autoregistro: cada
// solicitud pasa por revisión y aprobación antes de que exista cualquier
// cuenta, y el entrenador solo se crea de verdad al final del onboarding.
const estadoLabels: Record<string, string> = {
  solicitud_recibida: "Solicitud recibida",
  en_revision: "En revisión",
  aprobada: "Aprobada",
  en_onboarding: "En onboarding",
  informacion_completada: "Información completada",
  rechazada: "Rechazada",
  cancelada: "Cancelada",
  entrenador_creado: "Entrenador creado",
};

const estadoDots: Record<string, string> = {
  solicitud_recibida: "bg-amber-400",
  en_revision: "bg-white/40",
  aprobada: "bg-hf-blue",
  en_onboarding: "bg-hf-purple",
  informacion_completada: "bg-emerald-400",
  rechazada: "bg-red-400",
  cancelada: "bg-red-400",
  entrenador_creado: "bg-emerald-400",
};

const pagoLabels: Record<string, string> = {
  sin_generar: "Sin generar",
  pendiente: "Pendiente de pago",
  en_proceso: "En proceso (Wompi)",
  pagado: "Pagado",
  rechazado: "Rechazado",
};

const pagoDotClasses: Record<string, string> = {
  sin_generar: "bg-white/30",
  pendiente: "bg-amber-400",
  en_proceso: "bg-hf-blue",
  pagado: "bg-emerald-400",
  rechazado: "bg-red-400",
};

const pagoBadgeClasses: Record<string, string> = {
  sin_generar: "border-white/15 bg-white/5 text-white/50",
  pendiente: "border-amber-500/30 bg-amber-500/10 text-amber-400",
  en_proceso: "border-hf-blue/30 bg-hf-blue/10 text-hf-blue",
  pagado: "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  rechazado: "border-red-500/30 bg-red-500/10 text-red-400",
};

const cicloLabels: Record<PagoCiclo, string> = {
  mensual: "Mensual",
  semestral: "Semestral (6 meses)",
  anual: "Anual",
};

const cop = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

function cicloAmountCop(plan: PlanKey, ciclo: PagoCiclo, prices: PlanPrices): number {
  const p = prices[plan];
  return ciclo === "mensual" ? p.monthlyCop : ciclo === "semestral" ? p.semesterCop : p.annualCop;
}

const answerLabels: Record<string, string> = {
  running: "Running",
  crossfit: "Crossfit",
  gym: "Modo Gym",
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

function fmtDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-CO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export function LeadEditModal({
  lead,
  isPending,
  planPrices,
  onClose,
  onPatch,
  onApprove,
  onReject,
  onResendLink,
  onRequestInfo,
}: {
  lead: LeadRow | null;
  isPending: boolean;
  planPrices: PlanPrices;
  onClose: () => void;
  onPatch: (leadId: string, fields: Partial<LeadRow>) => void;
  onApprove: (leadId: string) => void;
  onReject: (leadId: string, motivo?: string) => void;
  onResendLink: (leadId: string) => void;
  onRequestInfo: (leadId: string, mensaje: string) => void;
}) {
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [requestingInfo, setRequestingInfo] = useState(false);
  const [infoMessage, setInfoMessage] = useState("");
  const [payingCycle, setPayingCycle] = useState<PagoCiclo>("mensual");
  const [generatingPayment, setGeneratingPayment] = useState(false);
  const [copyingPaymentLink, setCopyingPaymentLink] = useState(false);
  const [sendingPaymentWhatsapp, setSendingPaymentWhatsapp] = useState(false);
  const [sendingPaymentEmail, setSendingPaymentEmail] = useState(false);

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !lead) return;
    setUploadingAvatar(true);
    const formData = new FormData();
    formData.set("foto", file);
    const result = await uploadLeadAvatar(lead.id, formData);
    setUploadingAvatar(false);
    if (!result.ok) {
      alert(result.error ?? "No se pudo subir la foto.");
      return;
    }
    onPatch(lead.id, { avatar_url: result.url ?? null });
  }

  function copyOnboardingLink() {
    if (!lead?.onboarding_token) return;
    const url = `${SITE_URL}/onboarding/${lead.onboarding_token}`;
    navigator.clipboard?.writeText(url);
  }

  function sendOnboardingLinkByWhatsapp() {
    if (!lead?.onboarding_token || !lead.whatsapp) return;
    const url = `${SITE_URL}/onboarding/${lead.onboarding_token}`;
    const message = `Hola ${lead.nombre}, tu solicitud en Hakunna Fit fue aprobada. Completa tu información aquí: ${url}`;
    const digits = lead.whatsapp.replace(/[^\d]/g, "");
    window.open(`https://api.whatsapp.com/send?phone=${digits}&text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }

  async function handleGeneratePaymentLink() {
    if (!lead) return;
    setGeneratingPayment(true);
    const result = await generatePaymentLink(lead.id, payingCycle);
    setGeneratingPayment(false);
    if (!result.ok) {
      alert(result.error ?? "No se pudo generar el link de pago.");
      return;
    }
    onPatch(lead.id, { pago_estado: "pendiente", pago_ciclo: payingCycle });
  }

  async function handleCopyPaymentLink() {
    if (!lead) return;
    setCopyingPaymentLink(true);
    const result = await getPaymentLinkUrl(lead.id);
    setCopyingPaymentLink(false);
    if (!result.ok || !result.url) {
      alert(result.error ?? "No se pudo obtener el link de pago.");
      return;
    }
    navigator.clipboard?.writeText(result.url);
  }

  async function handleSendPaymentWhatsapp() {
    if (!lead?.whatsapp) return;
    setSendingPaymentWhatsapp(true);
    const result = await getPaymentLinkUrl(lead.id);
    setSendingPaymentWhatsapp(false);
    if (!result.ok || !result.url) {
      alert(result.error ?? "No se pudo obtener el link de pago.");
      return;
    }
    const message = `Hola ${lead.nombre}, para activar tu plan en Hakunna Fit realiza el pago aquí: ${result.url}`;
    const digits = lead.whatsapp.replace(/[^\d]/g, "");
    window.open(`https://api.whatsapp.com/send?phone=${digits}&text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }

  async function handleSendPaymentEmail() {
    if (!lead) return;
    setSendingPaymentEmail(true);
    const result = await sendPaymentLinkEmail(lead.id);
    setSendingPaymentEmail(false);
    if (!result.ok) {
      alert(result.error ?? "No se pudo enviar el correo.");
      return;
    }
  }

  const canApprove =
    lead &&
    lead.plan &&
    lead.pago_estado === "pagado" &&
    ["solicitud_recibida", "en_revision", "rechazada"].includes(lead.estado);
  const hasOnboardingLink = lead && ["aprobada", "en_onboarding", "informacion_completada"].includes(lead.estado);

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

            <div className="flex items-start gap-3 pr-10">
              {lead.plan === "starter" && (
                <div className="relative mt-1 h-14 w-14 shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={lead.avatar_url || "/images/NO_image.png"} alt="" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    aria-label="Cambiar foto"
                    className="absolute bottom-0 right-0 flex h-5 w-5 items-center justify-center rounded-full border border-white/20 bg-[#0b0f1a] text-white/70 hover:text-white disabled:opacity-50"
                  >
                    <Camera size={10} />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <label className="block">
                  <span className="mb-1 block text-[11px] text-white/50">Nombre</span>
                  <input
                    key={`nombre-${lead.id}`}
                    defaultValue={lead.nombre}
                    onBlur={(e) => e.target.value.trim() && onPatch(lead.id, { nombre: e.target.value })}
                    className="h-9 w-full rounded-lg border border-white/15 bg-transparent px-2 text-base font-bold text-white"
                  />
                </label>
                <span className="mt-2 inline-flex items-center gap-1.5 text-[11px] text-white/50">
                  <span className={`h-1.5 w-1.5 rounded-full ${estadoDots[lead.estado] ?? "bg-white/30"}`} />
                  {estadoLabels[lead.estado] ?? lead.estado}
                </span>
              </div>
            </div>

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
                  disabled={lead.estado !== "solicitud_recibida" && lead.estado !== "en_revision"}
                  onChange={(e) => onPatch(lead.id, { plan: (e.target.value || null) as PlanKey | null })}
                  className="h-9 w-full rounded-lg border border-white/15 bg-white/5 px-2 text-xs text-white disabled:opacity-50"
                >
                  <option value="" className="bg-[#0b0f1a] text-white">Sin especificar</option>
                  {PLANS.map((p) => (
                    <option key={p.key} value={p.key} className="bg-[#0b0f1a] text-white">
                      {p.label}
                    </option>
                  ))}
                </select>
              </label>

              {lead.especialidad && (
                <label className="block">
                  <span className="mb-1 block text-[11px] text-white/50">Rama</span>
                  <input
                    disabled
                    value={answerLabels[lead.especialidad] ?? lead.especialidad}
                    className="h-9 w-full rounded-lg border border-white/10 bg-white/[0.02] px-2 text-xs text-white/50"
                  />
                </label>
              )}
            </div>

            {lead.subdominio_propuesto && (
              <p className="mt-3 text-[11px] text-white/40">
                Subdominio propuesto: <span className="text-white/70">{lead.subdominio_propuesto}.hakunnafit.com</span>
              </p>
            )}

            {lead.plan === "starter" && (
              <label className="mt-3 block">
                <span className="mb-1 block text-[11px] text-white/50">Modelo de landing</span>
                <select
                  value={lead.landing_template ?? DEFAULT_STARTER_TEMPLATE}
                  onChange={(e) => onPatch(lead.id, { landing_template: e.target.value })}
                  className="h-9 w-full max-w-xs rounded-lg border border-white/15 bg-white/5 px-2 text-xs text-white"
                >
                  {STARTER_LANDING_TEMPLATES.map((t) => (
                    <option key={t.key} value={t.key} className="bg-[#0b0f1a] text-white">
                      {t.label} — {t.tagline}
                    </option>
                  ))}
                </select>
              </label>
            )}

            {lead.plan === "starter" && (
              <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-3">
                <p className="text-[11px] font-semibold text-white/60">
                  Información adicional para su página (opcional — normalmente se completa en el onboarding)
                </p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 flex items-center gap-1 text-[11px] text-white/50">
                      <Instagram size={11} /> Instagram
                    </span>
                    <input
                      key={`ig-${lead.id}`}
                      defaultValue={lead.instagram ?? ""}
                      placeholder="@usuario"
                      onBlur={(e) => onPatch(lead.id, { instagram: e.target.value })}
                      className="h-9 w-full rounded-lg border border-white/15 bg-white/5 px-2 text-xs text-white placeholder:text-white/30"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 flex items-center gap-1 text-[11px] text-white/50">
                      <Facebook size={11} /> Facebook
                    </span>
                    <input
                      key={`fb-${lead.id}`}
                      defaultValue={lead.facebook ?? ""}
                      placeholder="/usuario"
                      onBlur={(e) => onPatch(lead.id, { facebook: e.target.value })}
                      className="h-9 w-full rounded-lg border border-white/15 bg-white/5 px-2 text-xs text-white placeholder:text-white/30"
                    />
                  </label>
                  <label className="block sm:col-span-2">
                    <span className="mb-1 flex items-center gap-1 text-[11px] text-white/50">
                      <Mail size={11} /> Correo público (para mostrar en la landing, opcional)
                    </span>
                    <input
                      key={`email-pub-${lead.id}`}
                      type="email"
                      defaultValue={lead.email_publico ?? ""}
                      placeholder="contacto@tunegocio.com"
                      onBlur={(e) => onPatch(lead.id, { email_publico: e.target.value })}
                      className="h-9 w-full rounded-lg border border-white/15 bg-white/5 px-2 text-xs text-white placeholder:text-white/30"
                    />
                  </label>
                </div>
                <label className="mt-3 block">
                  <span className="mb-1 block text-[11px] text-white/50">Biografía / presentación</span>
                  <textarea
                    key={`bio-${lead.id}`}
                    defaultValue={lead.biografia ?? ""}
                    onBlur={(e) => onPatch(lead.id, { biografia: e.target.value })}
                    rows={2}
                    placeholder="Cuéntale a sus visitantes quién es y qué lo hace diferente..."
                    className="w-full rounded-lg border border-white/15 bg-white/5 p-2 text-xs text-white placeholder:text-white/30"
                  />
                </label>
              </div>
            )}

            <label className="mt-3 block">
              <span className="mb-1 block text-[11px] text-white/50">Comentario del solicitante</span>
              <textarea
                key={`mensaje-${lead.id}`}
                defaultValue={lead.mensaje ?? ""}
                onBlur={(e) => onPatch(lead.id, { mensaje: e.target.value })}
                rows={2}
                placeholder="Sin comentario"
                className="w-full rounded-lg border border-white/15 bg-white/5 p-2 text-xs text-white placeholder:text-white/30"
              />
            </label>

            {lead.revision_notas && (
              <div className="mt-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
                <p className="text-[11px] font-semibold text-amber-400">Nota interna</p>
                <p className="mt-1 text-xs text-white/70">{lead.revision_notas}</p>
              </div>
            )}

            {lead.plan && (
              <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold text-white/60">
                    <CreditCard size={12} /> Pago del plan a Hakunna Fit
                  </p>
                  <span
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px] font-semibold ${
                      pagoBadgeClasses[lead.pago_estado] ?? pagoBadgeClasses.sin_generar
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${pagoDotClasses[lead.pago_estado] ?? "bg-white/30"}`} />
                    {pagoLabels[lead.pago_estado] ?? lead.pago_estado}
                  </span>
                </div>

                {lead.pago_monto_cop && (
                  <p className="mt-2 text-[11px] text-white/50">
                    Último generado: {cop.format(lead.pago_monto_cop)}
                    {lead.pago_ciclo ? ` · ${cicloLabels[lead.pago_ciclo as PagoCiclo] ?? lead.pago_ciclo}` : ""}
                  </p>
                )}

                {lead.pago_estado !== "pagado" && (
                  <>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <select
                        value={payingCycle}
                        onChange={(e) => setPayingCycle(e.target.value as PagoCiclo)}
                        className="h-8 rounded-lg border border-white/15 bg-white/5 px-2 text-[11px] text-white"
                      >
                        <option value="mensual" className="bg-[#0b0f1a] text-white">Mensual</option>
                        <option value="semestral" className="bg-[#0b0f1a] text-white">Semestral (6 meses)</option>
                        <option value="anual" className="bg-[#0b0f1a] text-white">Anual</option>
                      </select>
                      <button
                        type="button"
                        disabled={generatingPayment}
                        onClick={handleGeneratePaymentLink}
                        className="flex items-center gap-1.5 rounded-full border border-hf-blue/30 px-3 py-1.5 text-[11px] font-semibold text-hf-blue hover:border-hf-blue/50 disabled:opacity-50"
                      >
                        <CreditCard size={11} />
                        {generatingPayment ? "Generando..." : lead.pago_referencia ? "Generar nuevo link" : "Generar link de pago"}
                      </button>
                    </div>
                    {lead.plan && (
                      <p className="mt-1.5 text-[10.5px] text-white/40">
                        Vas a generar: <span className="text-white/70">{cop.format(cicloAmountCop(lead.plan, payingCycle, planPrices))}</span> ·{" "}
                        {cicloLabels[payingCycle]}
                      </p>
                    )}
                  </>
                )}

                {lead.pago_referencia && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={copyingPaymentLink}
                      onClick={handleCopyPaymentLink}
                      className="flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-[11px] font-semibold text-white/70 hover:border-white/30 hover:text-white disabled:opacity-50"
                    >
                      <Copy size={11} /> {copyingPaymentLink ? "Copiando..." : "Copiar link"}
                    </button>
                    {lead.whatsapp && (
                      <button
                        type="button"
                        disabled={sendingPaymentWhatsapp}
                        onClick={handleSendPaymentWhatsapp}
                        className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 px-3 py-1.5 text-[11px] font-semibold text-emerald-400 hover:border-emerald-500/50 disabled:opacity-50"
                      >
                        <MessageCircle size={11} /> Enviar por WhatsApp
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={sendingPaymentEmail}
                      onClick={handleSendPaymentEmail}
                      className="flex items-center gap-1.5 rounded-full border border-hf-purple/30 px-3 py-1.5 text-[11px] font-semibold text-hf-purple hover:border-hf-purple/50 disabled:opacity-50"
                    >
                      <Mail size={11} /> {sendingPaymentEmail ? "Enviando..." : "Enviar por correo"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {hasOnboardingLink && (
              <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02] p-3">
                <p className="text-[11px] font-semibold text-white/60">Enlace de onboarding</p>
                <p className="mt-1 break-all text-[11px] text-white/50">
                  {SITE_URL}/onboarding/{lead.onboarding_token}
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-[10.5px] text-white/40">
                  <span>Vence: {fmtDateTime(lead.onboarding_token_expires_at)}</span>
                  <span>· Abierto: {lead.onboarding_token_used_at ? fmtDateTime(lead.onboarding_token_used_at) : "todavía no"}</span>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={copyOnboardingLink}
                    className="flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-[11px] font-semibold text-white/70 hover:border-white/30 hover:text-white"
                  >
                    <Copy size={11} /> Copiar enlace
                  </button>
                  {lead.whatsapp && (
                    <button
                      type="button"
                      onClick={sendOnboardingLinkByWhatsapp}
                      className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 px-3 py-1.5 text-[11px] font-semibold text-emerald-400 hover:border-emerald-500/50"
                    >
                      <MessageCircle size={11} /> Enviar por WhatsApp
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => onResendLink(lead.id)}
                    className="flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-[11px] font-semibold text-white/70 hover:border-white/30 hover:text-white disabled:opacity-50"
                  >
                    <RefreshCw size={11} /> Reenviar (nuevo enlace)
                  </button>
                </div>
              </div>
            )}

            <div className="mt-5 grid grid-cols-2 gap-2 border-t border-white/10 pt-4 text-[11px] text-white/50">
              <span>Fuente</span>
              <span className="text-right text-white">
                {lead.fuente === "manual" ? "Agregada manualmente" : "Formulario web"}
              </span>
              <span>Fecha</span>
              <span className="text-right text-white">{fmtDate(lead.created_at)}</span>
            </div>

            {lead.estado === "entrenador_creado" ? (
              <p className="mt-5 rounded-full border border-emerald-500/30 bg-emerald-500/10 py-2.5 text-center text-xs font-semibold text-emerald-400">
                Ya es entrenador — revísalo en Entrenadores
              </p>
            ) : lead.estado === "informacion_completada" ? (
              <Link
                href={`/panel-hakunna/revision/${lead.id}`}
                className="mt-5 flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-2.5 text-center text-xs font-semibold text-emerald-400 hover:border-emerald-500/50"
              >
                Completó el onboarding — revisar y crear entrenador
              </Link>
            ) : (
              <>
                {requestingInfo ? (
                  <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-3">
                    <label className="block">
                      <span className="mb-1 block text-[11px] text-white/50">Qué necesitas preguntarle</span>
                      <textarea
                        rows={3}
                        value={infoMessage}
                        onChange={(e) => setInfoMessage(e.target.value)}
                        placeholder="Ej: ¿Podrías confirmarnos tu ciudad exacta?"
                        className="w-full rounded-lg border border-white/15 bg-white/5 p-2 text-xs text-white placeholder:text-white/30"
                      />
                    </label>
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => {
                          setRequestingInfo(false);
                          setInfoMessage("");
                        }}
                        className="flex-1 rounded-full border border-white/15 py-1.5 text-xs text-white/60"
                      >
                        Cancelar
                      </button>
                      <button
                        disabled={isPending || !infoMessage.trim()}
                        onClick={() => {
                          onRequestInfo(lead.id, infoMessage.trim());
                          setRequestingInfo(false);
                          setInfoMessage("");
                        }}
                        className="flex-1 rounded-full py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                        style={{ background: "linear-gradient(90deg,#00C8FF,#6D2EFF,#FF2DB8)" }}
                      >
                        {isPending ? "..." : "Enviar correo"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-5 flex flex-col gap-2">
                    {canApprove && (
                      <button
                        disabled={isPending}
                        onClick={() => onApprove(lead.id)}
                        className="w-full rounded-full py-2.5 text-xs font-semibold text-white disabled:opacity-60"
                        style={{ background: "linear-gradient(90deg,#00C8FF,#6D2EFF,#FF2DB8)" }}
                      >
                        {isPending ? "Aprobando..." : `Aprobar solicitud${lead.plan ? ` (${planLabels[lead.plan]})` : ""}`}
                      </button>
                    )}
                    {!lead.plan && (
                      <p className="text-center text-[10.5px] text-white/40">
                        Asigna un plan arriba para poder aprobar esta solicitud.
                      </p>
                    )}
                    {lead.plan && lead.pago_estado !== "pagado" && (
                      <p className="text-center text-[10.5px] text-white/40">
                        Falta confirmar el pago del plan (arriba) para poder aprobar esta solicitud.
                      </p>
                    )}
                    {(lead.estado === "solicitud_recibida" || lead.estado === "en_revision") && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setRequestingInfo(true)}
                          className="flex-1 rounded-full border border-white/15 py-2 text-xs font-semibold text-white/70 hover:border-white/30 hover:text-white"
                        >
                          Pedir información
                        </button>
                        <button
                          disabled={isPending}
                          onClick={() => {
                            const motivo = window.prompt("Motivo del rechazo (opcional):") ?? undefined;
                            onReject(lead.id, motivo || undefined);
                          }}
                          className="flex-1 rounded-full border border-red-500/25 py-2 text-xs font-semibold text-red-400 hover:border-red-500/45 disabled:opacity-50"
                        >
                          Rechazar
                        </button>
                      </div>
                    )}
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
