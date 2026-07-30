"use client";

// Módulo Agenda (/panel/agenda) — calendario real de citas con vista Día
// (timeline por hora, como en el diseño de referencia), Semana y Mes,
// KPIs del día, banner de tips estilo HakAI (reglas simples sobre datos
// reales, ver getOwnAgendaTips), sincronización con Google Calendar y
// recordatorios por WhatsApp.

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Search,
  SlidersHorizontal,
  RefreshCw,
  Sparkles,
  AlertTriangle,
  CalendarDays,
  Clock,
  type LucideIcon,
} from "lucide-react";
import type { TrainerRow } from "@/lib/admin-actions";
import type { ClientRow } from "@/lib/trainer-clients-actions";
import {
  getOwnAgendaEvents,
  getOwnAgendaTips,
  getOwnWeeklyTrainingOverlay,
  createOwnAppointment,
  updateOwnAppointment,
  cancelOwnAppointment,
  resyncOwnAgendaToGoogle,
  type AgendaEventRow,
  type AgendaTip,
  type WeeklyTrainingOverlayRow,
  type AppointmentStatus,
  type AppointmentModalidad,
} from "@/lib/trainer-agenda-actions";
import { AGENDA_WORKING_HOURS, APPOINTMENT_STATUS_LABELS } from "@/lib/agenda-constants";
import { TrainerAgendaDetailPanel } from "@/components/trainer/trainer-agenda-detail-panel";
import { TrainerAgendaSettingsMenu } from "@/components/trainer/trainer-agenda-settings-menu";

type ViewTab = "dia" | "semana" | "mes";

const STATUS_CARD_CLASS: Record<AppointmentStatus, string> = {
  pendiente: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  confirmada: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  no_asistio: "border-red-500/30 bg-red-500/10 text-red-200",
  completada: "border-hf-blue/30 bg-hf-blue/10 text-hf-blue",
  cancelada: "border-white/10 bg-white/5 text-white/40",
};

const ROW_HEIGHT = 72;

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}
function mondayIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}
function startOfWeek(d: Date): Date {
  return addDays(startOfDay(d), -mondayIndex(d));
}
function formatHour(d: Date): string {
  return d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}
function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function toDateInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function buildMonthGrid(monthDate: Date): Date[] {
  const firstOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const gridStart = addDays(firstOfMonth, -mondayIndex(firstOfMonth));
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}

function computeDisplayHours(events: AgendaEventRow[], day: Date): { start: number; end: number } {
  let start = AGENDA_WORKING_HOURS.start;
  let end = AGENDA_WORKING_HOURS.end;
  for (const ev of events) {
    const d = new Date(ev.scheduledAt);
    if (!isSameDay(d, day)) continue;
    start = Math.min(start, d.getHours());
    const endHour = Math.ceil((d.getHours() * 60 + d.getMinutes() + ev.durationMin) / 60);
    end = Math.max(end, endHour);
  }
  return { start, end };
}

function computeFreeGaps(events: AgendaEventRow[], day: Date, hours: { start: number; end: number }): { start: Date; end: Date }[] {
  const windowStart = new Date(day);
  windowStart.setHours(hours.start, 0, 0, 0);
  const windowEnd = new Date(day);
  windowEnd.setHours(hours.end, 0, 0, 0);

  const busy = events
    .map((e) => ({ start: new Date(e.scheduledAt), end: new Date(new Date(e.scheduledAt).getTime() + e.durationMin * 60_000) }))
    .sort((a, b) => a.start.getTime() - b.start.getTime());

  const gaps: { start: Date; end: Date }[] = [];
  let cursor = windowStart;
  for (const b of busy) {
    if (b.start.getTime() - cursor.getTime() >= 30 * 60_000) gaps.push({ start: cursor, end: b.start });
    if (b.end.getTime() > cursor.getTime()) cursor = b.end;
  }
  if (windowEnd.getTime() - cursor.getTime() >= 30 * 60_000) gaps.push({ start: cursor, end: windowEnd });
  return gaps;
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
  const [tab, setTab] = useState<ViewTab>("dia");
  const [selectedDay, setSelectedDay] = useState(() => startOfDay(new Date()));
  const [monthCursor, setMonthCursor] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [events, setEvents] = useState<AgendaEventRow[]>([]);
  const [tips, setTips] = useState<AgendaTip[]>([]);
  const [overlay, setOverlay] = useState<WeeklyTrainingOverlayRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"todos" | AppointmentStatus>("todos");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [editing, setEditing] = useState<AgendaEventRow | "new" | null>(null);
  const [newApptDefault, setNewApptDefault] = useState<Date | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [isPending, startTransition] = useTransition();

  const grid = useMemo(() => buildMonthGrid(monthCursor), [monthCursor]);
  const rangeStart = grid[0];
  const rangeEnd = grid[grid.length - 1];

  useEffect(() => {
    setLoading(true);
    getOwnAgendaEvents(rangeStart.toISOString(), new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), rangeEnd.getDate(), 23, 59).toISOString())
      .then(setEvents)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monthCursor]);

  useEffect(() => {
    getOwnAgendaTips(selectedDay.toISOString()).then(setTips);
  }, [selectedDay]);

  useEffect(() => {
    getOwnWeeklyTrainingOverlay().then(setOverlay);
  }, []);

  async function refresh() {
    const rows = await getOwnAgendaEvents(
      rangeStart.toISOString(),
      new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), rangeEnd.getDate(), 23, 59).toISOString()
    );
    setEvents(rows);
    getOwnAgendaTips(selectedDay.toISOString()).then(setTips);
  }

  function goToDay(d: Date) {
    const day = startOfDay(d);
    setSelectedDay(day);
    if (day.getMonth() !== monthCursor.getMonth() || day.getFullYear() !== monthCursor.getFullYear()) {
      setMonthCursor(new Date(day.getFullYear(), day.getMonth(), 1));
    }
  }

  function navigate(direction: 1 | -1) {
    if (tab === "dia") goToDay(addDays(selectedDay, direction));
    else if (tab === "semana") goToDay(addDays(selectedDay, direction * 7));
    else {
      const next = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + direction, 1);
      setMonthCursor(next);
      setSelectedDay(next);
    }
  }

  const dayEvents = useMemo(() => events.filter((e) => isSameDay(new Date(e.scheduledAt), selectedDay)), [events, selectedDay]);

  const visibleDayEvents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return dayEvents
      .filter((e) => (!q || e.clientFullName.toLowerCase().includes(q)) && (statusFilter === "todos" || e.status === statusFilter))
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  }, [dayEvents, search, statusFilter]);

  const selectedEvent = events.find((e) => e.id === selectedEventId) ?? null;

  const kpis = useMemo(() => {
    const total = dayEvents.length;
    const confirmadas = dayEvents.filter((e) => e.status === "confirmada").length;
    const pendientes = dayEvents.filter((e) => e.status === "pendiente").length;
    const noAsistio = dayEvents.filter((e) => e.status === "no_asistio").length;
    const bookedMinutes = dayEvents.reduce((s, e) => s + e.durationMin, 0);
    const windowMinutes = (AGENDA_WORKING_HOURS.end - AGENDA_WORKING_HOURS.start) * 60;
    const horasLibres = Math.max(0, Math.floor((windowMinutes - bookedMinutes) / 60));
    const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);
    return { total, confirmadas, pendientes, noAsistio, horasLibres, pct };
  }, [dayEvents]);

  function handleCancel(ev: AgendaEventRow) {
    if (!confirm("¿Cancelar esta cita?")) return;
    startTransition(async () => {
      await cancelOwnAppointment(ev.id);
      if (selectedEventId === ev.id) setSelectedEventId(null);
      await refresh();
    });
  }

  async function handleSync() {
    setSyncing(true);
    await resyncOwnAgendaToGoogle(
      rangeStart.toISOString(),
      new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), rangeEnd.getDate(), 23, 59).toISOString()
    );
    await refresh();
    setSyncing(false);
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Agenda de Sesiones</h1>
          <p className="mt-1 text-sm text-white/50">Organiza tus citas, valoraciones y seguimientos con tus clientes.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setNewApptDefault(null);
              setEditing("new");
            }}
            className="flex items-center gap-1.5 rounded-full bg-hf-blue px-4 py-2 text-xs font-bold text-black"
          >
            <Plus size={14} /> Nueva cita
          </button>
          {googleConfigured && (
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-2 text-xs font-semibold text-white/70 hover:border-white/30 hover:text-white disabled:opacity-50"
            >
              <RefreshCw size={13} className={syncing ? "animate-spin" : ""} /> Sincronizar
            </button>
          )}
          <TrainerAgendaSettingsMenu
            clients={clients}
            googleConfigured={googleConfigured}
            googleConnected={googleConnected}
            googleEmail={googleEmail}
          />
        </div>
      </div>

      {/* KPIs */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <KpiCard icon={CalendarDays} label="Hoy" value={String(kpis.total)} hint="citas" />
        <KpiCard icon={Sparkles} accent="text-emerald-400" label="Confirmadas" value={String(kpis.confirmadas)} hint={`${kpis.pct(kpis.confirmadas)}%`} />
        <KpiCard icon={Clock} accent="text-amber-400" label="Pendientes" value={String(kpis.pendientes)} hint={`${kpis.pct(kpis.pendientes)}%`} />
        <KpiCard icon={X} accent="text-red-400" label="No asistió" value={String(kpis.noAsistio)} hint={`${kpis.pct(kpis.noAsistio)}%`} />
        <KpiCard icon={Clock} accent="text-hf-blue" label="Horas libres" value={`${kpis.horasLibres}h`} hint="disponibles" />
      </div>

      {/* Tips estilo HakAI */}
      {tips.length > 0 && (
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-violet-500/20 bg-violet-500/[0.06] p-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-violet-300">
            <Sparkles size={16} />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold text-violet-300">HakAI te recomienda</p>
            <div className="mt-1 space-y-0.5">
              {tips.map((tip) => (
                <p key={tip.id} className="flex items-center gap-1.5 text-xs text-white/70">
                  {tip.tone === "warning" && <AlertTriangle size={11} className="shrink-0 text-amber-400" />}
                  {tip.message}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tabs + navegador de fecha + buscador */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1">
          {(["dia", "semana", "mes"] as ViewTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold capitalize transition-colors ${
                tab === t ? "bg-hf-blue text-black" : "text-white/50 hover:text-white"
              }`}
            >
              {t === "dia" ? "Hoy" : t}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-1)} className="rounded-full p-1.5 text-white/50 hover:bg-white/5 hover:text-white">
            <ChevronLeft size={16} />
          </button>
          <label className="relative flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold capitalize text-white/80">
            <CalendarDays size={13} className="text-white/40" />
            {tab === "mes"
              ? monthCursor.toLocaleDateString("es-CO", { month: "long", year: "numeric" })
              : selectedDay.toLocaleDateString("es-CO", { weekday: tab === "dia" ? "long" : undefined, day: "numeric", month: "long", year: "numeric" })}
            <input
              type="date"
              value={toDateInputValue(selectedDay)}
              onChange={(e) => e.target.value && goToDay(new Date(`${e.target.value}T00:00:00`))}
              className="absolute inset-0 cursor-pointer opacity-0"
            />
          </label>
          <button onClick={() => navigate(1)} className="rounded-full p-1.5 text-white/50 hover:bg-white/5 hover:text-white">
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5">
            <Search size={13} className="text-white/40" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar cliente..."
              className="w-32 bg-transparent text-xs text-white outline-none placeholder:text-white/30"
            />
          </label>
          <div className="relative">
            <button
              onClick={() => setFiltersOpen((v) => !v)}
              className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1.5 text-xs font-semibold text-white/70 hover:border-white/30 hover:text-white"
            >
              <SlidersHorizontal size={13} /> Filtros
            </button>
            {filtersOpen && (
              <div className="absolute right-0 z-20 mt-2 w-44 rounded-xl border border-white/10 bg-[#0a0d16] p-1.5 shadow-xl">
                {(["todos", "pendiente", "confirmada", "no_asistio", "completada"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => {
                      setStatusFilter(s);
                      setFiltersOpen(false);
                    }}
                    className={`block w-full rounded-lg px-2.5 py-1.5 text-left text-xs ${
                      statusFilter === s ? "bg-hf-blue/15 font-semibold text-hf-blue" : "text-white/70 hover:bg-white/5"
                    }`}
                  >
                    {s === "todos" ? "Todos los estados" : APPOINTMENT_STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Contenido principal */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_320px]">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          {loading && <p className="text-xs text-white/40">Cargando...</p>}
          {!loading && tab === "dia" && (
            <DayTimeline
              day={selectedDay}
              events={visibleDayEvents}
              selectedEventId={selectedEventId}
              onSelectEvent={setSelectedEventId}
              onQuickAdd={(d) => {
                setNewApptDefault(d);
                setEditing("new");
              }}
            />
          )}
          {!loading && tab === "semana" && (
            <WeekView
              weekStart={startOfWeek(selectedDay)}
              events={events}
              onSelectDay={(d) => {
                goToDay(d);
                setTab("dia");
              }}
              onSelectEvent={setSelectedEventId}
            />
          )}
          {!loading && tab === "mes" && (
            <MonthGrid
              grid={grid}
              month={monthCursor}
              events={events}
              selectedDay={selectedDay}
              onSelectDay={(d) => {
                goToDay(d);
                setTab("dia");
              }}
            />
          )}

          {overlay.length > 0 && tab !== "mes" && (
            <div className="mt-4 border-t border-white/10 pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-white/40">Entrenos recurrentes de la semana</p>
              <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-7">
                {["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"].map((label, idx) => {
                  const names = overlay.filter((o) => o.weekday === idx);
                  return (
                    <div key={label} className="rounded-lg bg-white/[0.02] p-2">
                      <p className="text-[9px] font-bold uppercase text-white/30">{label.slice(0, 3)}</p>
                      {names.length === 0 && <p className="text-[10px] text-white/15">—</p>}
                      {names.map((n, i) => (
                        <p key={i} className="truncate text-[10px] text-white/60">
                          {n.clientFullName}
                        </p>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <TrainerAgendaDetailPanel
          event={selectedEvent}
          onReprogram={(ev) => setEditing(ev)}
          onChanged={refresh}
        />
      </div>

      {editing && (
        <AppointmentModal
          clients={clients}
          initial={editing === "new" ? null : editing}
          defaultDate={newApptDefault ?? selectedDay}
          onClose={() => {
            setEditing(null);
            setNewApptDefault(null);
          }}
          onSaved={async () => {
            setEditing(null);
            setNewApptDefault(null);
            await refresh();
          }}
          onCancelAppointment={handleCancel}
        />
      )}
    </div>
  );
}

function KpiCard({
  icon: Icon,
  accent,
  label,
  value,
  hint,
}: {
  icon: LucideIcon;
  accent?: string;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <Icon size={16} className={accent ?? "text-white/40"} />
      <p className="mt-2 text-lg font-bold text-white">{value}</p>
      <p className="text-[11px] text-white/40">
        {label} · <span className={accent ?? "text-white/40"}>{hint}</span>
      </p>
    </div>
  );
}

function DayTimeline({
  day,
  events,
  selectedEventId,
  onSelectEvent,
  onQuickAdd,
}: {
  day: Date;
  events: AgendaEventRow[];
  selectedEventId: string | null;
  onSelectEvent: (id: string) => void;
  onQuickAdd: (date: Date) => void;
}) {
  const hours = useMemo(() => computeDisplayHours(events, day), [events, day]);
  const gaps = useMemo(() => computeFreeGaps(events, day, hours), [events, day, hours]);
  const totalHeight = (hours.end - hours.start) * ROW_HEIGHT;

  function minutesFromStart(d: Date): number {
    return (d.getHours() - hours.start) * 60 + d.getMinutes();
  }

  if (events.length === 0 && gaps.length === 1) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <CalendarDays size={28} className="text-white/15" />
        <p className="mt-2 text-sm text-white/40">No hay citas este día.</p>
      </div>
    );
  }

  return (
    <div className="flex">
      <div className="w-14 shrink-0">
        {Array.from({ length: hours.end - hours.start + 1 }, (_, i) => hours.start + i).map((h) => (
          <div key={h} style={{ height: ROW_HEIGHT }} className="-translate-y-2 text-[11px] text-white/30">
            {String(h).padStart(2, "0")}:00
          </div>
        ))}
      </div>
      <div className="relative flex-1 border-l border-white/10" style={{ height: totalHeight }}>
        {Array.from({ length: hours.end - hours.start }, (_, i) => i).map((i) => (
          <div key={i} className="absolute left-0 right-0 border-t border-white/5" style={{ top: i * ROW_HEIGHT }} />
        ))}

        {gaps.map((g, i) => {
          const top = (minutesFromStart(g.start) / 60) * ROW_HEIGHT;
          const height = Math.max(((g.end.getTime() - g.start.getTime()) / 60000 / 60) * ROW_HEIGHT, 32);
          return (
            <button
              key={i}
              onClick={() => onQuickAdd(g.start)}
              className="absolute left-2 right-2 flex items-center justify-between rounded-lg border border-dashed border-white/10 px-3 text-[11px] text-white/25 hover:border-white/25 hover:text-white/50"
              style={{ top, height }}
            >
              <span>
                Espacio libre {formatHour(g.start)} - {formatHour(g.end)}
              </span>
              <Plus size={12} />
            </button>
          );
        })}

        {events.map((ev) => {
          const start = new Date(ev.scheduledAt);
          const top = (minutesFromStart(start) / 60) * ROW_HEIGHT;
          const height = Math.max((ev.durationMin / 60) * ROW_HEIGHT, 44);
          return (
            <button
              key={ev.id}
              onClick={() => onSelectEvent(ev.id)}
              className={`absolute left-2 right-2 overflow-hidden rounded-xl border px-3 py-1.5 text-left transition-shadow ${STATUS_CARD_CLASS[ev.status]} ${
                selectedEventId === ev.id ? "ring-2 ring-white/60" : ""
              }`}
              style={{ top, height }}
            >
              <p className="truncate text-xs font-semibold">{ev.clientFullName}</p>
              <p className="truncate text-[10px] opacity-70">
                {ev.titulo || "Cita"} · {ev.durationMin} min · {APPOINTMENT_STATUS_LABELS[ev.status]}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function WeekView({
  weekStart,
  events,
  onSelectDay,
  onSelectEvent,
}: {
  weekStart: Date;
  events: AgendaEventRow[];
  onSelectDay: (d: Date) => void;
  onSelectEvent: (id: string) => void;
}) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-7">
      {days.map((d) => {
        const dayEvents = events
          .filter((e) => isSameDay(new Date(e.scheduledAt), d))
          .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
        const isToday = isSameDay(d, new Date());
        return (
          <div key={d.toDateString()} className="rounded-xl bg-white/[0.02] p-2">
            <button onClick={() => onSelectDay(d)} className="mb-1.5 block w-full text-left">
              <p className={`text-[10px] font-bold uppercase ${isToday ? "text-hf-blue" : "text-white/40"}`}>
                {d.toLocaleDateString("es-CO", { weekday: "short" })}
              </p>
              <p className="text-xs font-semibold text-white/80">{d.getDate()}</p>
            </button>
            <div className="space-y-1">
              {dayEvents.map((ev) => (
                <button
                  key={ev.id}
                  onClick={() => {
                    onSelectDay(d);
                    onSelectEvent(ev.id);
                  }}
                  className={`block w-full truncate rounded-md border px-1.5 py-1 text-left text-[10px] ${STATUS_CARD_CLASS[ev.status]}`}
                >
                  {formatHour(new Date(ev.scheduledAt))} {ev.clientFullName}
                </button>
              ))}
              {dayEvents.length === 0 && <p className="text-[10px] text-white/15">—</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MonthGrid({
  grid,
  month,
  events,
  selectedDay,
  onSelectDay,
}: {
  grid: Date[];
  month: Date;
  events: AgendaEventRow[];
  selectedDay: Date;
  onSelectDay: (d: Date) => void;
}) {
  const eventsByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const ev of events) {
      const key = startOfDay(new Date(ev.scheduledAt)).toDateString();
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [events]);

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-semibold uppercase text-white/30">
        {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1">
        {grid.map((d, i) => {
          const inMonth = d.getMonth() === month.getMonth();
          const isToday = isSameDay(d, new Date());
          const isSelected = isSameDay(d, selectedDay);
          const count = eventsByDay.get(d.toDateString()) ?? 0;
          return (
            <button
              key={i}
              onClick={() => onSelectDay(d)}
              className={`flex aspect-square flex-col items-center justify-center gap-0.5 rounded-lg text-xs transition-colors ${
                isSelected ? "bg-hf-blue font-bold text-black" : inMonth ? "text-white/70 hover:bg-white/5" : "text-white/20 hover:bg-white/5"
              } ${isToday && !isSelected ? "ring-1 ring-hf-blue/60" : ""}`}
            >
              <span>{d.getDate()}</span>
              {count > 0 && <span className={`h-1 w-1 rounded-full ${isSelected ? "bg-black" : "bg-hf-blue"}`} />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const TITULOS_SUGERIDOS = ["Valoración inicial", "Seguimiento", "Entrenamiento personalizado", "Toma de medidas"];

function AppointmentModal({
  clients,
  initial,
  defaultDate,
  onClose,
  onSaved,
  onCancelAppointment,
}: {
  clients: ClientRow[];
  initial: AgendaEventRow | null;
  defaultDate: Date;
  onClose: () => void;
  onSaved: () => void;
  onCancelAppointment: (ev: AgendaEventRow) => void;
}) {
  const [clientId, setClientId] = useState(initial?.clientId ?? clients[0]?.id ?? "");
  const [scheduledAt, setScheduledAt] = useState(() => {
    if (initial) return toDatetimeLocalValue(initial.scheduledAt);
    return toDatetimeLocalValue(defaultDate.toISOString());
  });
  const [durationMin, setDurationMin] = useState(initial?.durationMin ?? 60);
  const [titulo, setTitulo] = useState(initial?.titulo ?? "");
  const [notas, setNotas] = useState(initial?.notas ?? "");
  const [modalidad, setModalidad] = useState<AppointmentModalidad>(initial?.modalidad ?? "presencial");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit() {
    setError(null);
    if (!clientId) return setError("Selecciona un cliente.");
    if (!scheduledAt) return setError("Selecciona fecha y hora.");
    startTransition(async () => {
      const iso = new Date(scheduledAt).toISOString();
      const res = initial
        ? await updateOwnAppointment(initial.id, { scheduledAt: iso, durationMin, titulo, notas, modalidad })
        : await createOwnAppointment({ clientId, scheduledAt: iso, durationMin, titulo, notas, modalidad });
      if (!res.ok) return setError(res.error ?? "No se pudo guardar la cita.");
      onSaved();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0a0d16] p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">{initial ? "Editar cita" : "Nueva cita"}</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-white/50">Cliente</span>
            <select value={clientId} onChange={(e) => setClientId(e.target.value)} disabled={Boolean(initial)} className="input disabled:opacity-50">
              {clients.map((c) => (
                <option key={c.id} value={c.id} className="bg-[#0a0d16]">
                  {c.full_name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-white/50">Fecha y hora</span>
            <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} className="input" />
          </label>

          <div className="grid grid-cols-2 gap-3">
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
              <span className="text-[11px] font-semibold text-white/50">Modalidad</span>
              <select value={modalidad} onChange={(e) => setModalidad(e.target.value as AppointmentModalidad)} className="input">
                <option value="presencial" className="bg-[#0a0d16]">
                  Presencial
                </option>
                <option value="virtual" className="bg-[#0a0d16]">
                  Virtual
                </option>
              </select>
            </label>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-white/50">Título</span>
            <input value={titulo ?? ""} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej. Valoración inicial" list="titulos-sugeridos" className="input" />
            <datalist id="titulos-sugeridos">
              {TITULOS_SUGERIDOS.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-white/50">Notas (opcional)</span>
            <textarea value={notas ?? ""} onChange={(e) => setNotas(e.target.value)} rows={2} className="input resize-none" />
          </label>
        </div>

        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

        <div className="mt-5 flex items-center justify-between gap-2">
          {initial ? (
            <button
              onClick={() => {
                onCancelAppointment(initial);
                onClose();
              }}
              className="text-xs font-semibold text-red-400/80 hover:text-red-400"
            >
              Cancelar cita
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold text-white/70">
              Cerrar
            </button>
            <button
              onClick={submit}
              disabled={isPending}
              className="rounded-full bg-hf-blue px-4 py-2 text-xs font-bold text-black disabled:opacity-40"
            >
              {isPending ? "Guardando..." : "Guardar cita"}
            </button>
          </div>
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
