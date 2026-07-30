"use client";

// Panel lateral "Detalles de la cita" — se muestra junto al timeline del día
// en /panel/agenda. Trae bajo demanda los datos del cliente (perfil +
// última medición) cuando cambia la cita seleccionada, en vez de que el
// componente padre tenga que cargar esto para todas las citas visibles.

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, CheckCircle2, XCircle, CalendarClock, MessageCircle, UserRound, StickyNote, Video, MapPin } from "lucide-react";
import { initials, avatarColor } from "@/lib/client-ui";
import { calculateImc } from "@/lib/imc";
import { getOwnClient, getOwnClientMeasurements, type ClientRow, type MeasurementRow } from "@/lib/trainer-clients-actions";
import {
  updateOwnAppointment,
  buildAppointmentWhatsappReminder,
  APPOINTMENT_STATUS_LABELS,
  type AgendaEventRow,
  type AppointmentStatus,
} from "@/lib/trainer-agenda-actions";

const STATUS_BADGE_CLASS: Record<AppointmentStatus, string> = {
  pendiente: "bg-amber-500/10 text-amber-400",
  confirmada: "bg-emerald-500/10 text-emerald-400",
  no_asistio: "bg-red-500/10 text-red-400",
  completada: "bg-hf-blue/10 text-hf-blue",
  cancelada: "bg-white/10 text-white/40",
};

export function TrainerAgendaDetailPanel({
  event,
  onClose,
  onReprogram,
  onChanged,
}: {
  event: AgendaEventRow | null;
  onClose?: () => void;
  onReprogram: (event: AgendaEventRow) => void;
  onChanged: () => void | Promise<void>;
}) {
  const [client, setClient] = useState<ClientRow | null>(null);
  const [measurements, setMeasurements] = useState<MeasurementRow[]>([]);
  const [notes, setNotes] = useState(event?.notas ?? "");
  const [editingNotes, setEditingNotes] = useState(false);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    setNotes(event?.notas ?? "");
    setEditingNotes(false);
    if (!event) {
      setClient(null);
      setMeasurements([]);
      return;
    }
    let cancelled = false;
    Promise.all([getOwnClient(event.clientId), getOwnClientMeasurements(event.clientId)]).then(([c, m]) => {
      if (!cancelled) {
        setClient(c);
        setMeasurements(m);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [event]);

  if (!event) {
    return (
      <div className="hidden h-full items-center justify-center rounded-2xl border border-dashed border-white/15 p-8 text-center text-xs text-white/30 lg:flex">
        Selecciona una cita para ver sus detalles.
      </div>
    );
  }

  const latestMeasurement = measurements[0] ?? null;
  const imc = client ? calculateImc(latestMeasurement?.peso ?? client.peso_actual, client.altura) : null;
  const grasaCorporal = latestMeasurement?.medidas?.grasa_corporal;

  async function setStatus(status: AppointmentStatus) {
    setIsPending(true);
    await updateOwnAppointment(event!.id, { status });
    setIsPending(false);
    await onChanged();
  }

  async function saveNotes() {
    setIsPending(true);
    await updateOwnAppointment(event!.id, { notas: notes });
    setIsPending(false);
    setEditingNotes(false);
    await onChanged();
  }

  return (
    <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Detalles de la cita</p>
        {onClose && (
          <button onClick={onClose} className="text-white/40 hover:text-white lg:hidden">
            <X size={16} />
          </button>
        )}
      </div>

      <div className="mt-4 flex items-center gap-3">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${avatarColor(event.clientId)}`}
        >
          {initials(event.clientFullName)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-white">{event.clientFullName}</p>
          <span className={`mt-0.5 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold ${STATUS_BADGE_CLASS[event.status]}`}>
            {APPOINTMENT_STATUS_LABELS[event.status]}
          </span>
        </div>
      </div>

      <p className="mt-2 text-[11px] text-white/40">
        {client?.objetivo || "Sin objetivo registrado"}
        {client?.created_at && ` · Cliente desde ${new Date(client.created_at).toLocaleDateString("es-CO", { month: "short", year: "numeric" })}`}
      </p>

      {client && (latestMeasurement?.peso ?? client.peso_actual) != null && (
        <div className="mt-4 grid grid-cols-3 gap-2">
          <MiniStat label="Peso (kg)" value={String(latestMeasurement?.peso ?? client.peso_actual)} />
          <MiniStat label="IMC" value={imc ? String(imc.value) : "—"} />
          <MiniStat label="Grasa corporal" value={grasaCorporal != null ? `${grasaCorporal}%` : "—"} />
        </div>
      )}

      <div className="mt-4 space-y-2 border-t border-white/10 pt-4 text-xs text-white/70">
        <div className="flex items-center gap-2">
          <CalendarClock size={13} className="text-white/40" />
          {new Date(event.scheduledAt).toLocaleString("es-CO", { dateStyle: "full", timeStyle: "short" })} ({event.durationMin} min)
        </div>
        <div className="flex items-center gap-2">
          {event.modalidad === "virtual" ? <Video size={13} className="text-white/40" /> : <MapPin size={13} className="text-white/40" />}
          {event.modalidad === "virtual" ? "Virtual" : "Presencial"}
        </div>
        <div className="flex items-center gap-2">
          <UserRound size={13} className="text-white/40" />
          Sesión #{event.sessionNumber}
          {client?.sesiones_contratadas ? ` de ${client.sesiones_contratadas}` : ""}
        </div>
      </div>

      <div className="mt-4 border-t border-white/10 pt-4">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-white/50">
            <StickyNote size={12} /> Notas rápidas
          </p>
          {!editingNotes && (
            <button onClick={() => setEditingNotes(true)} className="text-[11px] font-semibold text-hf-blue hover:underline">
              Editar
            </button>
          )}
        </div>
        {editingNotes ? (
          <div className="mt-2">
            <textarea
              value={notes ?? ""}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-white/10 bg-white/[0.03] p-2 text-xs text-white outline-none focus:border-white/30"
            />
            <div className="mt-2 flex gap-2">
              <button
                onClick={saveNotes}
                disabled={isPending}
                className="rounded-full bg-hf-blue px-3 py-1 text-[11px] font-bold text-black disabled:opacity-50"
              >
                Guardar
              </button>
              <button onClick={() => setEditingNotes(false)} className="text-[11px] font-semibold text-white/50">
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-1.5 text-xs text-white/60">{event.notas || "Sin notas."}</p>
        )}
      </div>

      {latestMeasurement && (
        <div className="mt-4 border-t border-white/10 pt-4 text-xs text-white/60">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-white/50">Última sesión</p>
          <p className="mt-1.5">
            {new Date(latestMeasurement.fecha).toLocaleDateString("es-CO", { dateStyle: "medium" })}
            {latestMeasurement.peso != null ? ` · ${latestMeasurement.peso} kg` : ""}
          </p>
        </div>
      )}

      <div className="mt-auto space-y-3 border-t border-white/10 pt-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-white/50">Acciones rápidas</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setStatus("completada")}
            disabled={isPending}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-emerald-500/25 bg-emerald-500/10 py-2 text-xs font-semibold text-emerald-400 hover:border-emerald-500/50 disabled:opacity-50"
          >
            <CheckCircle2 size={14} /> Llegó
          </button>
          <button
            onClick={() => setStatus("no_asistio")}
            disabled={isPending}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-red-500/25 bg-red-500/10 py-2 text-xs font-semibold text-red-400 hover:border-red-500/50 disabled:opacity-50"
          >
            <XCircle size={14} /> No asistió
          </button>
          <button
            onClick={() => onReprogram(event)}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-white/15 py-2 text-xs font-semibold text-white/70 hover:border-white/30 hover:text-white"
          >
            <CalendarClock size={14} /> Reprogramar
          </button>
          {event.clientWhatsapp ? (
            <a
              href={buildAppointmentWhatsappReminder({
                clientFullName: event.clientFullName,
                clientWhatsapp: event.clientWhatsapp,
                scheduledAt: event.scheduledAt,
                titulo: event.titulo,
              })}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-1.5 rounded-xl border border-white/15 py-2 text-xs font-semibold text-white/70 hover:border-white/30 hover:text-white"
            >
              <MessageCircle size={14} /> WhatsApp
            </a>
          ) : (
            <span className="flex items-center justify-center gap-1.5 rounded-xl border border-white/5 py-2 text-xs font-semibold text-white/20">
              <MessageCircle size={14} /> Sin WhatsApp
            </span>
          )}
          <Link
            href={`/panel/clientes/${event.clientId}`}
            className="col-span-2 flex items-center justify-center gap-1.5 rounded-xl border border-white/15 py-2 text-xs font-semibold text-white/70 hover:border-white/30 hover:text-white"
          >
            <UserRound size={14} /> Abrir perfil
          </Link>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/[0.02] p-2.5 text-center">
      <p className="text-sm font-bold text-white">{value}</p>
      <p className="text-[10px] text-white/40">{label}</p>
    </div>
  );
}
