"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Inbox, Mail, PhoneCall, CheckCircle2, XCircle } from "lucide-react";
import {
  convertLeadToTrainer,
  updateLeadEstado,
  updateLead,
  type LeadRow,
  type PlanKey,
} from "@/lib/admin-actions";
import { KpiCard } from "./kpi-card";
import { Pill, fmtDate, planLabels, planTone } from "./admin-ui";
import { LeadEditModal } from "./lead-edit-modal";

const estadoTone: Record<string, "neutral" | "good" | "warn" | "bad"> = {
  nuevo: "warn",
  contactado: "neutral",
  convertido: "good",
  descartado: "bad",
};

const estadoLabels: Record<string, string> = {
  nuevo: "Nuevo",
  contactado: "Contactado",
  convertido: "Entrenador aprobado",
  descartado: "Descartado",
};

export function SolicitudesView({ initialLeads }: { initialLeads: LeadRow[] }) {
  const router = useRouter();
  const [leads, setLeads] = useState(initialLeads);
  const [search, setSearch] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("todos");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);
  const [convertPlan, setConvertPlan] = useState<PlanKey>("pro");
  const [convertProximoCobro, setConvertProximoCobro] = useState("");
  const [isPending, startTransition] = useTransition();

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
  const nuevas = leads.filter((l) => l.estado === "nuevo").length;
  const contactadas = leads.filter((l) => l.estado === "contactado").length;
  const convertidas = leads.filter((l) => l.estado === "convertido").length;
  const descartadas = leads.filter((l) => l.estado === "descartado").length;

  function selectLead(id: string) {
    setSelectedId(id);
    setConverting(false);
    const lead = leads.find((l) => l.id === id);
    setConvertPlan(lead?.plan ?? "pro");
    setConvertProximoCobro("");
  }

  function patch(leadId: string, fields: Partial<LeadRow>) {
    setLeads((ls) => ls.map((l) => (l.id === leadId ? { ...l, ...fields } : l)));
    startTransition(async () => {
      const result = await updateLead({
        leadId,
        nombre: fields.nombre,
        negocio: fields.negocio,
        email: fields.email,
        whatsapp: fields.whatsapp,
        ciudad: fields.ciudad,
        plan: fields.plan,
        mensaje: fields.mensaje,
      });
      if (!result.ok) alert(result.error ?? "No se pudo guardar el cambio.");
      router.refresh();
    });
  }

  function handleEstado(id: string, estado: string) {
    setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, estado } : l)));
    startTransition(async () => {
      await updateLeadEstado(id, estado);
      router.refresh();
    });
  }

  function handleApprove(leadId: string) {
    startTransition(async () => {
      const result = await convertLeadToTrainer({ leadId });
      if (result.ok) {
        setLeads((ls) => ls.map((l) => (l.id === leadId ? { ...l, estado: "convertido" } : l)));
        router.refresh();
      } else {
        alert(result.error ?? "No se pudo aprobar la solicitud.");
      }
    });
  }

  function handleConvert() {
    if (!selected) return;
    startTransition(async () => {
      const result = await convertLeadToTrainer({
        leadId: selected.id,
        plan: convertPlan,
        proximoCobro: convertProximoCobro || null,
      });
      if (result.ok) {
        setLeads((ls) => ls.map((l) => (l.id === selected.id ? { ...l, estado: "convertido" } : l)));
        setConverting(false);
        router.refresh();
      } else {
        alert(result.error ?? "No se pudo convertir la solicitud.");
      }
    });
  }

  return (
    <div>
      <div>
        <h1 className="text-xl font-bold text-white">Solicitudes</h1>
        <p className="mt-1 text-sm text-white/50">Gestiona todas las solicitudes de demo.</p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <KpiCard icon={<Inbox size={17} />} label="Total solicitudes" value={total} tone="blue" />
        <KpiCard icon={<Mail size={17} />} label="Nuevas" value={nuevas} tone="amber" />
        <KpiCard icon={<PhoneCall size={17} />} label="Contactadas" value={contactadas} tone="purple" />
        <KpiCard icon={<CheckCircle2 size={17} />} label="Convertidas" value={convertidas} tone="green" />
        <KpiCard icon={<XCircle size={17} />} label="Descartadas" value={descartadas} tone="pink" />
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
          <option value="nuevo" className="bg-[#0b0f1a] text-white">{estadoLabels.nuevo}</option>
          <option value="contactado" className="bg-[#0b0f1a] text-white">{estadoLabels.contactado}</option>
          <option value="convertido" className="bg-[#0b0f1a] text-white">{estadoLabels.convertido}</option>
          <option value="descartado" className="bg-[#0b0f1a] text-white">{estadoLabels.descartado}</option>
        </select>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-white/[0.03] text-xs uppercase text-white/40">
            <tr>
              <th className="px-4 py-3">Solicitante</th>
              <th className="px-4 py-3">Negocio</th>
              <th className="px-4 py-3">Plan interesado</th>
              <th className="px-4 py-3">Estado</th>
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
                <td className="px-4 py-3 text-white/70">
                  <p>{l.negocio ?? "—"}</p>
                  {l.ciudad && <p className="text-white/40">{l.ciudad}</p>}
                </td>
                <td className="px-4 py-3">
                  {l.plan ? <Pill tone={planTone(l.plan)}>{planLabels[l.plan]}</Pill> : <Pill>Sin especificar</Pill>}
                </td>
                <td className="px-4 py-3">
                  <Pill tone={estadoTone[l.estado] ?? "neutral"}>{estadoLabels[l.estado] ?? l.estado}</Pill>
                </td>
                <td className="px-4 py-3 text-white/50">{fmtDate(l.created_at)}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-white/40">
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
        converting={converting}
        convertPlan={convertPlan}
        convertProximoCobro={convertProximoCobro}
        onClose={() => setSelectedId(null)}
        onPatch={patch}
        onEstadoChange={handleEstado}
        onApprove={handleApprove}
        onStartConvert={() => setConverting(true)}
        onCancelConvert={() => setConverting(false)}
        onConvertPlanChange={setConvertPlan}
        onConvertProximoCobroChange={setConvertProximoCobro}
        onConfirmConvert={handleConvert}
      />
    </div>
  );
}
