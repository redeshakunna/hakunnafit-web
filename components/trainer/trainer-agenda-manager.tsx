"use client";

// Módulo Agenda (/panel/agenda) — calendario real de citas sobre
// "evaluations", con sincronización a Google Calendar (del entrenador y de
// cada cliente que haya conectado el suyo) y recordatorios por WhatsApp.
// Reemplaza el placeholder "Próximamente" (TrainerComingSoon) que tenía este
// módulo desde que se armó el sidebar completo.

import { useEffect, useMemo, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, Plus, X, Trash2, MessageCircle, CalendarCheck2, Copy, Link2 } from "lucide-react";
import type { TrainerRow } from "@/lib/admin-actions";
import type { ClientRow } from "@/lib/trainer-clients-actions";
import {
  getOwnAgendaEvents,
  createOwnAppointment,
  updateOwnAppointment,
  cancelOwnAppointment,
  buildAppointmentWhatsappReminder,
  getOwnWeeklyTrainingOverlay,
  type AgendaEventRow,
  type WeeklyTrainingOverlayRow,
} from "@/lib/trainer-agenda-actions";
import { beginTrainerGoogleConnect, disconnectOwnGoogleCalendar, generateClientCalendarConnectLink } from "@/lib/calendar-connections-actions";
import { DIAS_SEMANA } from "@/lib/routine-types";

const TITULOS_SUGERIDOS = ["Valoración inicial", "Seguimiento", "Entrenamiento personalizado", "Toma de medidas"];

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// Grilla lunes-domingo (no domingo-sábado) — coherente con DIAS_SEMANA del
// editor de rutinas (0=lunes). getDay() de JS es domingo=0, por eso se
// convierte con (getDay()+6)%7.
function mondayIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}

function buildMonthGrid(monthDate: Date): Date[] {
  const firstOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(gridStart.getDate() - mondayIndex(firstOfMonth));
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    days.push(d);
  }
  return days;
}

function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function TrainerAgendaManager({
  trainer,
  clients,
  googleConfigured,
  googleConnected,
  googleEmail,
}: {
  trainer: TrainerRow;
  clients: ClientRow[];
  googleConfigured: boolean;
  googleConnected: boolean;
  googleEmail: string | null;
}) {
  const [month, setMonth] = useState(() => startOfDay(new Date()));
  const [events, setEvents] = useState<AgendaEventRow[]>([]);
  const [overlay, setOverlay] = useState<WeeklyTrainingOverlayRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date>(startOfDay(new Date()));
  const [editing, setEditing] = useState<AgendaEventRow | "new" | null>(null);
  const [connected, setConnected] = useState(googleConnected);
  const [email, setEmail] = useState(googleEmail);
  const [isPending, startTransition] = useTransition();

  const grid = useMemo(() => buildMonthGrid(month), [month]);

  useEffect(() => {
    const start = grid[0];
    const end = grid[grid.length - 1];
    setLoading(true);
    getOwnAgendaEvents(start.toISOString(), new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59).toISOString())
      .then(setEvents)
      .finally(() => setLoading(false));
  }, [grid]);

  useEffect(() => {
    getOwnWeeklyTrainingOverlay().then(setOverlay);
  }, []);

  async function refresh() {
    const start = grid[0];
    const end = grid[grid.length - 1];
    const rows = await getOwnAgendaEvents(
      start.toISOString(),
      new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59).toISOString()
    );
    setEvents(rows);
  }

  const eventsByDay = useMemo(() => {
    const map = new Map<string, AgendaEventRow[]>();
    for (const ev of events) {
      const key = startOfDay(new Date(ev.scheduledAt)).toDateString();
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    }
    return map;
  }, [events]);

  const selectedDayEvents = (eventsByDay.get(selectedDay.toDateString()) ?? []).sort(
    (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
  );

  async function connectGoogle() {
    const res = await beginTrainerGoogleConnect();
    if (res.ok && res.url) window.location.href = res.url;
  }

  function disconnectGoogle() {
    startTransition(async () => {
      await disconnectOwnGoogleCalendar();
      setConnected(false);
      setEmail(null);
    });
  }

  function handleCancel(ev: AgendaEventRow) {
    if (!confirm("¿Cancelar esta cita?")) return;
    startTransition(async () => {
      await cancelOwnAppointment(ev.id);
      await refresh();
    });
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Agenda</h1>
          <p className="mt-1 text-sm text-white/50">Citas, valoraciones y seguimientos — sincronizados con Google Calendar.</p>
        </div>
        <button
          onClick={() => setEditing("new")}
          className="flex items-center gap-1.5 rounded-full bg-hf-blue px-4 py-2 text-xs font-bold text-black"
        >
          <Plus size={14} /> Nueva cita
        </button>
      </div>

      {!googleConfigured && (
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.02] p-4 text-xs text-white/40">
          La sincronización con Google Calendar todavía no está configurada por HakunnaFit — las citas se guardan
          igual, solo no se reflejan en Google.
        </div>
      )}

      {googleConfigured && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center gap-2">
            <CalendarCheck2 size={16} className={connected ? "text-emerald-400" : "text-white/40"} />
            <span className="text-xs font-semibold text-white/80">
              {connected ? `Google Calendar conectado${email ? ` · ${email}` : ""}` : "Tu Google Calendar no está conectado"}
            </span>
          </div>
          {connected ? (
            <button onClick={disconnectGoogle} disabled={isPending} className="text-[11px] font-semibold text-white/40 hover:text-white">
              Desconectar
            </button>
          ) : (
            <button
              onClick={connectGoogle}
              className="rounded-full border border-white/15 px-3 py-1.5 text-[11px] font-semibold text-white/80 hover:border-white/30 hover:text-white"
            >
              Conectar mi Google Calendar
            </button>
          )}
        </div>
      )}

      {/* Calendario mensual */}
      <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
            className="rounded-full p-1.5 text-white/50 hover:bg-white/5 hover:text-white"
          >
            <ChevronLeft size={16} />
          </button>
          <p className="text-sm font-bold capitalize text-white">
            {month.toLocaleDateString("es-CO", { month: "long", year: "numeric" })}
          </p>
          <button
            onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
            className="rounded-full p-1.5 text-white/50 hover:bg-white/5 hover:text-white"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase text-white/30">
          {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {grid.map((d, i) => {
            const inMonth = d.getMonth() === month.getMonth();
            const isToday = isSameDay(d, new Date());
            const isSelected = isSameDay(d, selectedDay);
            const dayEvents = eventsByDay.get(d.toDateString()) ?? [];
            return (
              <button
                key={i}
                onClick={() => setSelectedDay(startOfDay(d))}
                className={`flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg text-xs transition-colors ${
                  isSelected
                    ? "bg-hf-blue text-black font-bold"
                    : inMonth
                      ? "text-white/70 hover:bg-white/5"
                      : "text-white/20 hover:bg-white/5"
                } ${isToday && !isSelected ? "ring-1 ring-hf-blue/60" : ""}`}
              >
                <span>{d.getDate()}</span>
                {dayEvents.length > 0 && (
                  <span className={`h-1 w-1 rounded-full ${isSelected ? "bg-black" : "bg-hf-blue"}`} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Citas del día seleccionado */}
      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-white/50">
          {selectedDay.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" })}
        </p>
        <div className="mt-3 space-y-2">
          {loading && <p className="text-xs text-white/40">Cargando...</p>}
          {!loading && selectedDayEvents.length === 0 && (
            <p className="text-xs text-white/40">No hay citas este día.</p>
          )}
          {selectedDayEvents.map((ev) => (
            <div key={ev.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/[0.02] px-3 py-2.5">
              <div>
                <p className="text-xs font-semibold text-white/90">
                  {new Date(ev.scheduledAt).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })} ·{" "}
                  {ev.clientFullName}
                </p>
                <p className="mt-0.5 text-[11px] text-white/40">
                  {ev.titulo || "Cita"} · {ev.durationMin} min
                  {(ev.syncedToTrainerGoogle || ev.syncedToClientGoogle) && (
                    <span className="ml-1.5 text-emerald-400">· sincronizada con Google</span>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                {ev.clientWhatsapp && (
                  <a
                    href={buildAppointmentWhatsappReminder({
                      clientFullName: ev.clientFullName,
                      clientWhatsapp: ev.clientWhatsapp,
                      scheduledAt: ev.scheduledAt,
                      titulo: ev.titulo,
                    })}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 rounded-full border border-emerald-500/25 px-2.5 py-1 text-[10px] font-semibold text-emerald-400 hover:border-emerald-500/50"
                  >
                    <MessageCircle size={11} /> Recordar
                  </a>
                )}
                <button
                  onClick={() => setEditing(ev)}
                  className="rounded-full border border-white/15 px-2.5 py-1 text-[10px] font-semibold text-white/70 hover:border-white/30 hover:text-white"
                >
                  Editar
                </button>
                <button onClick={() => handleCancel(ev)} className="text-white/30 hover:text-red-400">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Entrenos recurrentes de la semana */}
      {overlay.length > 0 && (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Entrenos recurrentes de la semana</p>
          <p className="mt-1 text-[11px] text-white/30">
            Según el día de la semana marcado en cada rutina (módulo Entrenamientos).
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
            {DIAS_SEMANA.map((d) => {
              const clientsToday = overlay.filter((o) => o.weekday === d.value);
              return (
                <div key={d.value} className="rounded-xl bg-white/[0.02] p-2.5">
                  <p className="text-[10px] font-bold uppercase text-white/40">{d.label}</p>
                  <div className="mt-1.5 space-y-1">
                    {clientsToday.length === 0 && <p className="text-[10px] text-white/20">—</p>}
                    {clientsToday.map((o, idx) => (
                      <p key={idx} className="truncate text-[11px] text-white/70">
                        {o.clientFullName}
                      </p>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Conectar el Google de cada cliente */}
      {googleConfigured && (
        <ClientCalendarLinksCard clients={clients} />
      )}

      {editing && (
        <AppointmentModal
          clients={clients}
          initial={editing === "new" ? null : editing}
          defaultDate={selectedDay}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await refresh();
          }}
        />
      )}
    </div>
  );
}

function ClientCalendarLinksCard({ clients }: { clients: ClientRow[] }) {
  const [links, setLinks] = useState<Record<string, string>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);

  async function generate(clientId: string) {
    setLoadingId(clientId);
    const res = await generateClientCalendarConnectLink(clientId);
    setLoadingId(null);
    if (res.ok && res.url) setLinks((prev) => ({ ...prev, [clientId]: res.url! }));
  }

  if (clients.length === 0) return null;

  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Conectar el Google de tus clientes</p>
      <p className="mt-1 text-[11px] text-white/30">
        Genera un link para que cada cliente conecte su propio Google Calendar y sus citas le lleguen directo.
      </p>
      <div className="mt-3 space-y-2">
        {clients.map((c) => (
          <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/[0.02] px-3 py-2">
            <span className="text-xs font-medium text-white/80">{c.full_name}</span>
            {links[c.id] ? (
              <div className="flex items-center gap-1.5">
                {c.whatsapp && (
                  <a
                    href={`https://wa.me/${c.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(
                      `Hola ${c.full_name}! Conecta tu Google Calendar aquí para recibir tus citas: ${links[c.id]}`
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 rounded-full border border-emerald-500/25 px-2.5 py-1 text-[10px] font-semibold text-emerald-400 hover:border-emerald-500/50"
                  >
                    <MessageCircle size={11} /> Enviar por WhatsApp
                  </a>
                )}
                <button
                  onClick={() => navigator.clipboard.writeText(links[c.id])}
                  className="flex items-center gap-1 rounded-full border border-white/15 px-2.5 py-1 text-[10px] font-semibold text-white/70 hover:border-white/30 hover:text-white"
                >
                  <Copy size={11} /> Copiar link
                </button>
              </div>
            ) : (
              <button
                onClick={() => generate(c.id)}
                disabled={loadingId === c.id}
                className="flex items-center gap-1 rounded-full border border-white/15 px-2.5 py-1 text-[10px] font-semibold text-white/70 hover:border-white/30 hover:text-white disabled:opacity-50"
              >
                <Link2 size={11} /> {loadingId === c.id ? "Generando..." : "Generar link"}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AppointmentModal({
  clients,
  initial,
  defaultDate,
  onClose,
  onSaved,
}: {
  clients: ClientRow[];
  initial: AgendaEventRow | null;
  defaultDate: Date;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [clientId, setClientId] = useState(initial?.clientId ?? clients[0]?.id ?? "");
  const [scheduledAt, setScheduledAt] = useState(() => {
    if (initial) return toDatetimeLocalValue(initial.scheduledAt);
    const d = new Date(defaultDate);
    d.setHours(9, 0, 0, 0);
    return toDatetimeLocalValue(d.toISOString());
  });
  const [durationMin, setDurationMin] = useState(initial?.durationMin ?? 60);
  const [titulo, setTitulo] = useState(initial?.titulo ?? "");
  const [notas, setNotas] = useState(initial?.notas ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setError(null);
    if (!clientId) return setError("Selecciona un cliente.");
    if (!scheduledAt) return setError("Selecciona fecha y hora.");
    startTransition(async () => {
      const iso = new Date(scheduledAt).toISOString();
      const res = initial
        ? await updateOwnAppointment(initial.id, { scheduledAt: iso, durationMin, titulo, notas })
        : await createOwnAppointment({ clientId, scheduledAt: iso, durationMin, titulo, notas });
      if (!res.ok) return setError(res.error ?? "No se pudo guardar la cita.");
      onSaved();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0a0d16] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">{initial ? "Editar cita" : "Nueva cita"}</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-white/50">Cliente</span>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              disabled={Boolean(initial)}
              className="input disabled:opacity-50"
            >
              {clients.map((c) => (
                <option key={c.id} value={c.id} className="bg-[#0a0d16]">
                  {c.full_name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-white/50">Fecha y hora</span>
            <input
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="input"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-white/50">Duración (min)</span>
            <input
              type="number"
              min={15}
              step={15}
              value={durationMin}
              onChange={(e) => setDurationMin(parseInt(e.target.value, 10) || 60)}
              className="input"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-white/50">Título</span>
            <input
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej. Valoración inicial"
              list="titulos-sugeridos"
              className="input"
            />
            <datalist id="titulos-sugeridos">
              {TITULOS_SUGERIDOS.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-white/50">Notas (opcional)</span>
            <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} className="input resize-none" />
          </label>
        </div>

        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold text-white/70">
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={isPending}
            className="rounded-full bg-hf-blue px-4 py-2 text-xs font-bold text-black disabled:opacity-40"
          >
            {isPending ? "Guardando..." : "Guardar cita"}
          </button>
        </div>

        <style jsx global>{`
          .input {
            width: 100%;
            border-radius: 0.75rem;
            border: 1px solid rgba(255, 255, 255, 0.1);
            background: rgba(255, 255, 255, 0.03);
            padding: 0.5rem 0.75rem;
            font-size: 0.8rem;
            color: white;
            outline: none;
          }
          .input:focus {
            border-color: rgba(255, 255, 255, 0.3);
          }
        `}</style>
      </div>
    </div>
  );
}
