"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Inbox, Mail, Sparkles, CheckCircle2, XCircle, Plus, Share2 } from "lucide-react";
import {
  approveSolicitud,
  rejectSolicitud,
  resendOnboardingLink,
  requestSolicitudInfo,
  updateLead,
  createLeadManual,
  type LeadRow,
  type PlanKey,
  type CreateLeadInput,
} from "@/lib/admin-actions";
import type { PlanPrices } from "@/lib/plan-settings-actions";
import { PLANS } from "@/lib/catalog";
import { KpiCard } from "./kpi-card";
import { Pill, fmtDate, planLabels, planTone } from "./admin-ui";
import { LeadEditModal } from "./lead-edit-modal";
import { NewLeadModal } from "./new-lead-modal";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://hakunnafit.com";

// Hakunna Fit no es autoregistro: cada solicitud pasa por revisión y
// aprobación antes de que exista cualquier cuenta, y por un onboarding
// guiado antes de que el entrenador quede creado de verdad.
const estadoTone: Record<string, "neutral" | "good" | "warn" | "bad"> = {
  solicitud_recibida: "warn",
  en_revision: "neutral",
  aprobada: "neutral",
  en_onboarding: "neutral",
  informacion_completada: "good",
  rechazada: "bad",
  cancelada: "bad",
  entrenador_creado: "good",
};

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

const ESTADOS_FILTRO = Object.keys(estadoLabels);

// Estado del pago del plan que el entrenador le hace a Hakunna Fit por Wompi
// (independiente del estado de la solicitud) — ver generatePaymentLink en
// lib/admin-actions.ts.
const pagoTone: Record<string, "neutral" | "good" | "warn" | "bad"> = {
  sin_generar: "neutral",
  pendiente: "warn",
  en_proceso: "neutral",
  pagado: "good",
  rechazado: "bad",
};

const pagoLabels: Record<string, string> = {
  sin_generar: "Sin generar",
  pendiente: "Pendiente de pago",
  en_proceso: "En proceso (Wompi)",
  pagado: "Pagado",
  rechazado: "Rechazado",
};

export function SolicitudesView({ initialLeads, planPrices }: { initialLeads: LeadRow[]; planPrices: PlanPrices }) {
  const router = useRouter();
  const [leads, setLeads] = useState(initialLeads);
  const [search, setSearch] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("todos");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [creatingLead, setCreatingLead] = useState(false);
  const [sharePlan, setSharePlan] = useState<PlanKey | "">("");

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      if (estadoFilter !== "todos" && l.estado !== estadoFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!l.nombre.toLowerCase().includes(q) && !l.email.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [leads, search, estadoFilter]);

  const selected = leads.find((l) => l.id === selectedId) ?? null;

  const total = leads.length;
  const pendientes = leads.filter((l) => l.estado === "solicitud_recibida" || l.estado === "en_revision").length;
  const enOnboarding = leads.filter((l) =>
    ["aprobada", "en_onboarding", "informacion_completada"].includes(l.estado)
  ).length;
  const creadas = leads.filter((l) => l.estado === "entrenador_creado").length;
  const rechazadas = leads.filter((l) => l.estado === "rechazada" || l.estado === "cancelada").length;

  function selectLead(id: string) {
    setSelectedId(id);
  }

  function patch(leadId: string, fields: Partial<LeadRow>) {
    setLeads((ls) => ls.map((l) => (l.id === leadId ? { ...l, ...fields } : l)));
    startTransition(async () => {
      const result = await updateLead({
        leadId,
        nombre: fields.nombre,
        email: fields.email,
        whatsapp: fields.whatsapp,
        ciudad: fields.ciudad,
        plan: fields.plan,
        mensaje: fields.mensaje,
        landingTemplate: fields.landing_template,
        biografia: fields.biografia,
        instagram: fields.instagram,
        facebook: fields.facebook,
        emailPublico: fields.email_publico,
        avatarUrl: fields.avatar_url,
      });
      if (!result.ok) alert(result.error ?? "No se pudo guardar el cambio.");
      router.refresh();
    });
  }

  function handleApprove(leadId: string) {
    startTransition(async () => {
      const result = await approveSolicitud(leadId);
      if (result.ok) {
        router.refresh();
        setLeads((ls) =>
          ls.map((l) => (l.id === leadId ? { ...l, estado: "aprobada" } : l))
        );
      } else {
        alert(result.error ?? "No se pudo aprobar la solicitud.");
      }
    });
  }

  function handleReject(leadId: string, motivo?: string) {
    startTransition(async () => {
      const result = await rejectSolicitud(leadId, motivo);
      if (result.ok) {
        setLeads((ls) => ls.map((l) => (l.id === leadId ? { ...l, estado: "rechazada" } : l)));
        router.refresh();
      } else {
        alert(result.error ?? "No se pudo rechazar la solicitud.");
      }
    });
  }

  function handleResendLink(leadId: string) {
    startTransition(async () => {
      const result = await resendOnboardingLink(leadId);
      if (!result.ok) alert(result.error ?? "No se pudo reenviar el enlace.");
      router.refresh();
    });
  }

  function handleRequestInfo(leadId: string, mensaje: string) {
    startTransition(async () => {
      const result = await requestSolicitudInfo(leadId, mensaje);
      if (result.ok) {
        setLeads((ls) => ls.map((l) => (l.id === leadId && l.estado === "solicitud_recibida" ? { ...l, estado: "en_revision" } : l)));
        router.refresh();
      } else {
        alert(result.error ?? "No se pudo enviar el correo.");
      }
    });
  }

  function handleCreateLead(input: CreateLeadInput) {
    startTransition(async () => {
      const result = await createLeadManual(input);
      if (!result.ok) {
        alert(result.error ?? "No se pudo crear la solicitud.");
        return;
      }
      setCreatingLead(false);
      router.refresh();
    });
  }

  function shareFormByWhatsapp() {
    const url = `${SITE_URL}/?solicitud=1${sharePlan ? `&plan=${sharePlan}` : ""}`;
    const message = `¡Hola! Completa este formulario para solicitar tu plan en HakunnaFit: ${url}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Solicitudes</h1>
          <p className="mt-1 text-sm text-white/50">Revisa, aprueba y acompaña cada solicitud de plan.</p>
        </div>
        <button
          onClick={() => setCreatingLead(true)}
          className="flex h-10 items-center gap-1.5 rounded-full px-4 text-xs font-semibold text-white"
          style={{ background: "linear-gradient(90deg,#00C8FF,#6D2EFF,#FF2DB8)" }}
        >
          <Plus size={14} /> Nueva solicitud
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.02] p-3">
        <Share2 size={15} className="text-white/40" />
        <span className="text-xs text-white/60">Compartir formulario por WhatsApp:</span>
        <select
          value={sharePlan}
          onChange={(e) => setSharePlan(e.target.value as PlanKey | "")}
          className="h-8 rounded-lg border border-white/15 bg-white/5 px-2 text-xs text-white"
        >
          <option value="" className="bg-[#0b0f1a] text-white">Cualquier plan</option>
          {PLANS.map((p) => (
            <option key={p.key} value={p.key} className="bg-[#0b0f1a] text-white">
              {p.label}
            </option>
          ))}
        </select>
        <button
          onClick={shareFormByWhatsapp}
          className="h-8 rounded-full border border-white/15 px-3 text-xs font-semibold text-white/80 hover:border-white/30 hover:text-white"
        >
          Compartir
        </button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <KpiCard icon={<Inbox size={17} />} label="Total solicitudes" value={total} tone="blue" />
        <KpiCard icon={<Mail size={17} />} label="Por revisar" value={pendientes} tone="amber" />
        <KpiCard icon={<Sparkles size={17} />} label="En onboarding" value={enOnboarding} tone="purple" />
        <KpiCard icon={<CheckCircle2 size={17} />} label="Entrenadores creados" value={creadas} tone="green" />
        <KpiCard icon={<XCircle size={17} />} label="Rechazadas" value={rechazadas} tone="pink" />
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar solicitud..."
          className="h-10 flex-1 min-w-[200px] rounded-xl border border-white/15 bg-white/5 px-4 text-sm text-white placeholder:text-white/30 focus:border-hf-blue focus:outline-none"
        />
        <select
          value={estadoFilter}
          onChange={(e) => setEstadoFilter(e.target.value)}
          className="h-10 rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white"
        >
          <option value="todos" className="bg-[#0b0f1a] text-white">Estado: todos</option>
          {ESTADOS_FILTRO.map((key) => (
            <option key={key} value={key} className="bg-[#0b0f1a] text-white">
              {estadoLabels[key]}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-white/[0.03] text-xs uppercase text-white/40">
            <tr>
              <th className="px-4 py-3">Solicitante</th>
              <th className="px-4 py-3">Ciudad</th>
              <th className="px-4 py-3">Plan interesado</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Pago</th>
              <th className="px-4 py-3">Fecha</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map((l) => (
              <tr
                key={l.id}
                onClick={() => selectLead(l.id)}
                className={`cursor-pointer transition-colors ${selectedId === l.id ? "bg-white/[0.04]" : "hover:bg-white/[0.02]"}`}
              >
                <td className="px-4 py-3">
                  <p className="font-semibold text-white">{l.nombre}</p>
                  <p className="text-white/40">{l.email}</p>
                </td>
                <td className="px-4 py-3 text-white/70">{l.ciudad ?? "—"}</td>
                <td className="px-4 py-3">
                  {l.plan ? <Pill tone={planTone(l.plan)}>{planLabels[l.plan]}</Pill> : <Pill>Sin especificar</Pill>}
                </td>
                <td className="px-4 py-3">
                  <Pill tone={estadoTone[l.estado] ?? "neutral"}>{estadoLabels[l.estado] ?? l.estado}</Pill>
                </td>
                <td className="px-4 py-3">
                  {l.plan ? (
                    <Pill tone={pagoTone[l.pago_estado] ?? "neutral"}>{pagoLabels[l.pago_estado] ?? l.pago_estado}</Pill>
                  ) : (
                    <span className="text-white/30">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-white/50">{fmtDate(l.created_at)}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-white/40">
                  No hay solicitudes que coincidan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <LeadEditModal
        lead={selected}
        isPending={isPending}
        planPrices={planPrices}
        onClose={() => setSelectedId(null)}
        onPatch={patch}
        onApprove={handleApprove}
        onReject={handleReject}
        onResendLink={handleResendLink}
        onRequestInfo={handleRequestInfo}
      />

      <NewLeadModal
        open={creatingLead}
        isPending={isPending}
        onClose={() => setCreatingLead(false)}
        onCreate={handleCreateLead}
      />
    </div>
  );
}
