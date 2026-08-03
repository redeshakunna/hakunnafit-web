"use client";

// Pantalla pública (sin login) donde el cliente aprueba o rechaza, sesión
// por sesión, un plan propuesto por su entrenador — llega aquí desde el
// link de un solo uso que le manda el correo "propuesta-sesiones-creada"
// (ver lib/session-proposals-actions.ts). Mismo patrón de link público que
// /agenda/conectar/[token], pero con la marca real del entrenador (logo +
// colores) igual que los correos, ya que acá sí importa transmitir
// confianza de marca en una acción con consecuencias reales (agenda una
// cita de verdad al aprobar).

import { useState, useTransition } from "react";
import { CalendarCheck2, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { BrandMark } from "@/components/hakunnafit/starter-templates/brand-mark";
import {
  approveProposalItem,
  getReplacementSuggestions,
  rejectAndReplaceItem,
  type PublicProposalSession,
  type SuggestedSlot,
} from "@/lib/public-session-proposal-actions";

export function SessionApprovalScreen({
  token,
  initialProposal,
}: {
  token: string;
  initialProposal: PublicProposalSession;
}) {
  const [proposal, setProposal] = useState(initialProposal);
  const [openReject, setOpenReject] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestedSlot[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const trainer = proposal.trainer;
  const allResolved = proposal.items.every((i) => i.status !== "pendiente");
  const isCancelada = proposal.proposalStatus === "cancelada";

  function approve(itemId: string) {
    setActionError(null);
    setBusyItemId(itemId);
    startTransition(async () => {
      const res = await approveProposalItem(token, itemId);
      setBusyItemId(null);
      if (!res.ok) {
        setActionError(res.error ?? "No se pudo aprobar esta sesión.");
        return;
      }
      setProposal((p) => ({
        ...p,
        items: p.items.map((it) => (it.id === itemId ? { ...it, status: "aprobada" as const } : it)),
      }));
    });
  }

  function openRejectFlow(itemId: string) {
    setActionError(null);
    setOpenReject(itemId);
    setSuggestions([]);
    setLoadingSuggestions(true);
    startTransition(async () => {
      const res = await getReplacementSuggestions(token, itemId);
      setLoadingSuggestions(false);
      if (!res.ok) {
        setActionError(res.error ?? "No se pudieron calcular horarios alternativos.");
        setOpenReject(null);
        return;
      }
      setSuggestions(res.slots ?? []);
    });
  }

  function chooseReplacement(itemId: string, iso: string) {
    setActionError(null);
    setBusyItemId(itemId);
    startTransition(async () => {
      const res = await rejectAndReplaceItem(token, itemId, iso);
      setBusyItemId(null);
      if (!res.ok) {
        setActionError(res.error ?? "No se pudo agendar el reemplazo — intenta con otro horario.");
        return;
      }
      setOpenReject(null);
      setSuggestions([]);
      setProposal((p) => ({
        ...p,
        items: p.items.map((it) => (it.id === itemId ? { ...it, status: "aprobada" as const, scheduledAt: iso } : it)),
      }));
    });
  }

  return (
    <div className="min-h-screen bg-hf-black px-4 py-10">
      <div className="mx-auto w-full max-w-md">
        <div className="text-center">
          <div className="mx-auto flex justify-center">
            <BrandMark logoUrl={trainer.logoUrl} businessName={trainer.businessName} className="h-10 w-40" />
          </div>

          <div
            className="mx-auto mt-6 flex h-14 w-14 items-center justify-center rounded-full"
            style={{ backgroundColor: `${trainer.colorPrimario}1A` }}
          >
            <CalendarCheck2 size={24} style={{ color: trainer.colorPrimario }} />
          </div>

          <p className="mt-4 text-lg font-bold text-white">Hola, {proposal.clientFirstName}</p>
          <p className="mt-1 text-sm text-white/50">
            {isCancelada
              ? `${trainer.businessName} canceló esta propuesta — pídele una nueva si la necesitas.`
              : allResolved
                ? "Ya resolviste todas tus sesiones. ¡Gracias!"
                : `${trainer.businessName} te propuso estas sesiones — revísalas una por una.`}
          </p>
        </div>

        {actionError && (
          <p className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-center text-xs text-red-400">
            {actionError}
          </p>
        )}

        <div className="mt-6 space-y-3">
          {proposal.items.map((item) => {
            const dateLabel = new Date(item.scheduledAt).toLocaleDateString("es-CO", {
              weekday: "long",
              day: "numeric",
              month: "long",
              timeZone: "America/Bogota",
            });
            const timeLabel = new Date(item.scheduledAt).toLocaleTimeString("es-CO", {
              hour: "numeric",
              minute: "2-digit",
              hour12: true,
              timeZone: "America/Bogota",
            });
            const busy = busyItemId === item.id;
            const canAct = item.status === "pendiente" && !isCancelada;

            return (
              <div key={item.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold capitalize text-white">{dateLabel}</p>
                    <p className="text-xs text-white/50">
                      {timeLabel} · {item.durationMin} min · {item.modalidad === "virtual" ? "Virtual" : "Presencial"}
                    </p>
                  </div>
                  {item.status !== "pendiente" && (
                    <span
                      className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                        item.status === "aprobada" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                      }`}
                    >
                      {item.status === "aprobada" ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                      {item.status === "aprobada" ? "Aprobada" : "Rechazada"}
                    </span>
                  )}
                </div>

                {canAct && (
                  <>
                    {openReject !== item.id ? (
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => approve(item.id)}
                          disabled={busy}
                          className="flex-1 rounded-xl py-2 text-xs font-bold text-black disabled:opacity-50"
                          style={{ backgroundColor: trainer.colorPrimario }}
                        >
                          {busy ? "Aprobando..." : "Aceptar"}
                        </button>
                        <button
                          onClick={() => openRejectFlow(item.id)}
                          disabled={busy}
                          className="flex-1 rounded-xl border border-white/15 py-2 text-xs font-semibold text-white/70 hover:border-white/30 disabled:opacity-50"
                        >
                          No me sirve
                        </button>
                      </div>
                    ) : (
                      <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
                        <p className="text-[11px] font-semibold text-white/50">Elige un horario alternativo:</p>
                        {loadingSuggestions ? (
                          <div className="mt-2 flex items-center gap-1.5 text-xs text-white/40">
                            <Loader2 size={12} className="animate-spin" /> Buscando horarios disponibles...
                          </div>
                        ) : suggestions.length === 0 ? (
                          <p className="mt-2 text-xs text-white/40">
                            No encontramos horarios alternativos por ahora — escríbele a tu entrenador.
                          </p>
                        ) : (
                          <div className="mt-2 space-y-1.5">
                            {suggestions.map((s) => (
                              <button
                                key={s.iso}
                                onClick={() => chooseReplacement(item.id, s.iso)}
                                disabled={busy}
                                className="w-full rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-left text-xs text-white/80 hover:border-white/30 disabled:opacity-50"
                              >
                                <span className="capitalize">{s.dateLabel}</span>, {s.timeLabel}
                              </button>
                            ))}
                          </div>
                        )}
                        <button
                          onClick={() => {
                            setOpenReject(null);
                            setSuggestions([]);
                          }}
                          className="mt-2 text-[11px] font-semibold text-white/40 hover:text-white"
                        >
                          Cancelar
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>

        <p className="mt-6 text-center text-[11px] text-white/30">
          Cada sesión que apruebes se agenda de una vez en tu calendario y en el de {trainer.businessName}.
        </p>
      </div>
    </div>
  );
}
