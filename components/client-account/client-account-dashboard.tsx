"use client";

// Dashboard del cliente final con sesión real — /mi-cuenta. Reemplaza el
// portal por token (components/client-portal/client-portal-view.tsx,
// retirado junto con /mi-progreso/[token]). Misma info que el portal viejo
// (rutina, próxima cita, sesiones por aprobar, progreso) más lo que el
// portal nunca tuvo: edición de "Mi perfil" (nombre, whatsapp, foto) y "Mi
// hoja de vida" (sexo, nivel, actividad, objetivo, peso, altura). La rutina
// se queda de solo lectura a propósito — la arma y aprueba el entrenador.
//
// Rediseño (pedido explícito de Nando): esta pantalla la abre el cliente
// final desde su celular, casi siempre para dos cosas — revisar/aprobar una
// cita, o mirar su rutina de hoy. Antes era una pila plana de tarjetas
// blancas idénticas, sin relación visual con la landing de su propio
// entrenador. Ahora usa el mismo sistema de marca de 3 colores que las
// plantillas de landing (--hf-primary/--hf-secondary/--hf-tertiary, ver
// brandColorVars en starter-templates/types.ts) para que se sienta una
// continuación de esa marca, con un orden pensado mobile-first: saludo +
// cita/sesiones por aprobar arriba del todo (lo accionable), luego un
// vistazo rápido en números, luego la rutina de forma visual (selector de
// día en vez de una lista larga), luego progreso, y al final — colapsados,
// porque no es lo primero que alguien entra a mirar — los datos de perfil.

import { useMemo, useRef, useState, useTransition, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  CalendarClock,
  CalendarPlus,
  ChevronDown,
  Dumbbell,
  Flame,
  Footprints,
  Loader2,
  LogOut,
  MessageCircle,
  Moon,
  Pencil,
  Scale,
  Sparkles,
  Target,
  Video,
  ImagePlus,
  Camera,
} from "lucide-react";
import { BrandMark } from "@/components/hakunnafit/starter-templates/brand-mark";
import { whatsappHref } from "@/components/hakunnafit/starter-templates/types";
import { ClientHojaDeVida } from "@/components/trainer/client-hoja-de-vida";
import { calculateImc } from "@/lib/imc";
import { SEXO_LABELS, NIVEL_LABELS, ACTIVIDAD_OPTIONS } from "@/lib/client-ui";
import { blockKindOf, DIAS_SEMANA, type RoutineExerciseBlock } from "@/lib/routine-types";
import { branchTheme } from "@/lib/branch-theme";
import { googleCalendarUrl, downloadIcsFile, type CalendarEventInput } from "@/lib/calendar-links";
import type { MeasurementRow } from "@/lib/trainer-clients-actions";
import { logoutClient } from "@/lib/client-auth";
import {
  addOwnProgressPhoto,
  approveOwnProposalItem,
  getOwnClientDashboardData,
  getOwnReplacementSuggestions,
  rejectAndReplaceOwnItem,
  updateOwnHojaDeVida,
  updateOwnPresentation,
  uploadOwnAvatar,
  type ClientAccountData,
  type SuggestedSlot,
} from "@/lib/client-account-actions";

const GREEN = "linear-gradient(90deg,var(--hf-primary),var(--hf-secondary))";

function brandVars(trainer: ClientAccountData["trainer"]): CSSProperties {
  return {
    ["--hf-primary" as string]: trainer.colorPrimario,
    ["--hf-secondary" as string]: trainer.colorSecundario,
    ["--hf-tertiary" as string]: trainer.colorTerciario,
  } as CSSProperties;
}

/** 0=lunes...6=domingo en horario de Bogotá — mismo criterio que RoutineDay.diaSemana. */
function todayDiaSemana(): number {
  const bogota = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Bogota" }));
  return (bogota.getDay() + 6) % 7;
}

export function ClientAccountDashboard({ initialData }: { initialData: ClientAccountData }) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const { client, trainer, routine, nextAppointment, upcomingAppointments, pendingProposal, measurements } = data;
  const firstName = client.full_name.split(" ")[0];
  const waHref = whatsappHref(trainer.whatsapp, `Hola ${trainer.businessName}, te escribo desde mi cuenta de HakunnaFit.`);
  const imc = calculateImc(client.peso_actual, client.altura);
  // Antes solo se mostraba el bloque de "sesiones por aprobar" cuando había
  // ítems pendientes, y desaparecía por completo al resolverse todos — el
  // cliente perdía de vista qué se había aprobado/rechazado. Ahora se
  // muestra siempre que exista una propuesta con al menos un ítem, y es
  // ProposalSection quien distingue pendientes de ya resueltos.
  const hasProposalItems = !!pendingProposal && pendingProposal.items.length > 0;
  const theme = branchTheme(trainer.especialidad);

  async function onLogout() {
    await logoutClient();
    router.push(trainer.subdominio ? `/landing/${trainer.subdominio}` : "/");
    router.refresh();
  }

  // Se llama después de aprobar/rechazar una sesión propuesta: en vez de
  // parchear el estado local a mano (y quedar desincronizado de nextAppointment,
  // las stats, etc.), se vuelve a pedir el dashboard completo — así "Tu próxima
  // cita" y los KPIs aparecen de inmediato, sin que el cliente tenga que
  // recargar la página manualmente.
  async function refreshData() {
    const fresh = await getOwnClientDashboardData();
    if (fresh) setData(fresh);
  }

  return (
    <div className="relative min-h-screen text-white" style={brandVars(trainer)}>
      {/* Fondo fijo tipo parallax — foto de stock según la rama del
          entrenador (running/crossfit/gym, mismo mecanismo que ya usan las
          pantallas del panel, ver lib/branch-theme.ts) con un degradado
          oscuro teñido con el color de marca real del entrenador (no el
          acento genérico por rama) para que combine con el resto de la
          pantalla. Antes esta vista era bg-hf-black sólido de punta a punta,
          así que en pantallas anchas los costados quedaban vacíos. */}
      <div className="fixed inset-0 -z-10">
        <Image src={theme.heroImage} alt="" fill priority={false} sizes="100vw" className="object-cover opacity-45" />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, rgba(17,17,17,0.55) 0%, rgba(17,17,17,0.93) 45%, #111111 78%)" }}
        />
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(circle at 15% 0%, color-mix(in srgb, var(--hf-primary) 25%, transparent), transparent 55%)" }}
        />
      </div>

      {/* Header — sticky, a juego con el header de la landing del entrenador */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-hf-black/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-3 px-4 py-3">
          <BrandMark logoUrl={trainer.logoUrl} businessName={trainer.businessName} className="h-8 w-32" />
          <div className="flex items-center gap-2">
            {waHref && (
              <a
                href={waHref}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/70 hover:border-white/30 hover:text-white"
              >
                <MessageCircle size={13} /> WhatsApp
              </a>
            )}
            <button
              onClick={onLogout}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 text-white/50 hover:border-white/30 hover:text-white"
              title="Salir"
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-2xl px-4 pb-10">
        {/* Saludo — gradiente de marca, la primera franja de color que ve el cliente */}
        <div
          className="relative mt-5 overflow-hidden rounded-3xl p-5"
          style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--hf-primary) 22%, #111111), #111111 65%)" }}
        >
          <div
            className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full blur-3xl"
            style={{ backgroundColor: "color-mix(in srgb, var(--hf-secondary) 35%, transparent)" }}
          />
          <div className="relative flex items-center gap-3">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-full border-2" style={{ borderColor: "var(--hf-primary)" }}>
              {client.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={client.avatar_url} alt={client.full_name} className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center bg-white/10 text-sm font-bold text-white">
                  {client.full_name.slice(0, 1).toUpperCase()}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="font-[family-name:var(--font-hf-heading)] text-xl font-bold leading-tight text-white">Hola, {firstName}</p>
              <p className="truncate text-xs text-white/60">Tu cuenta en {trainer.businessName}</p>
            </div>
          </div>
        </div>

        {/* Lo accionable primero: sesiones por aprobar y próxima cita */}
        {hasProposalItems && pendingProposal && <ProposalSection proposal={pendingProposal} onChanged={refreshData} />}

        {nextAppointment && <NextAppointmentCard appointment={nextAppointment} trainerName={trainer.businessName} />}

        {/* Calendario/semana de citas — todas las citas ya aprobadas (reales,
            en "evaluations") de los próximos ~14 días, con su estado, para
            que el cliente tenga una vista tipo agenda y no solo la más
            próxima. */}
        {upcomingAppointments.length > 0 && <UpcomingAppointmentsSection appointments={upcomingAppointments} />}

        {/* Vistazo rápido en números */}
        <StatsRow client={client} imc={imc} routine={routine} nextAppointment={nextAppointment} />

        {/* Rutina — selector de día en vez de una lista larga */}
        {routine && <RoutineSection routine={routine} />}

        {/* Progreso */}
        <ProgressSection
          trainerColor={trainer.colorPrimario}
          measurements={measurements}
          onPhoto={(m) => setData((d) => ({ ...d, measurements: [m, ...d.measurements] }))}
        />

        {/* Mis datos — colapsado por defecto: no es lo primero que alguien
            entra a revisar, pero sigue siendo editable acá. */}
        <MiInformacion
          client={client}
          onSaved={(patch) => setData((d) => ({ ...d, client: { ...d.client, ...patch } }))}
        />

        <p className="mt-8 text-center text-[11px] text-white/25">Tu cuenta en HakunnaFit — {trainer.businessName}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Próxima cita — banner con degradado de marca (antes era una caja plana).
// ---------------------------------------------------------------------------

function NextAppointmentCard({
  appointment,
  trainerName,
}: {
  appointment: NonNullable<ClientAccountData["nextAppointment"]>;
  trainerName: string;
}) {
  const date = new Date(appointment.scheduledAt);
  const dateLabel = date.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Bogota" });
  const timeLabel = date.toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "America/Bogota" });
  const modalidadLabel = appointment.modalidad === "virtual" ? "Virtual" : "Presencial";

  const calendarEvent: CalendarEventInput = {
    title: `Sesión con ${trainerName}`,
    description: [
      `Sesión de entrenamiento con ${trainerName} (${modalidadLabel}).`,
      appointment.meetLink ? `Link de la sesión: ${appointment.meetLink}` : null,
    ]
      .filter(Boolean)
      .join(" "),
    location: appointment.modalidad === "virtual" ? appointment.meetLink ?? undefined : trainerName,
    startIso: appointment.scheduledAt,
    durationMin: appointment.duracionMin,
  };

  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white"
          style={{ background: GREEN }}
        >
          <CalendarClock size={19} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wide text-white/40">Tu próxima cita</p>
          <p className="truncate text-sm font-semibold capitalize text-white">{dateLabel}</p>
          <p className="text-xs text-white/50">
            {timeLabel} · {appointment.duracionMin} min · {modalidadLabel}
          </p>
        </div>
        {appointment.modalidad === "virtual" && appointment.meetLink && (
          <a
            href={appointment.meetLink}
            target="_blank"
            rel="noreferrer"
            className="flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2.5 text-xs font-bold text-black"
            style={{ background: GREEN }}
          >
            <Video size={13} /> Unirme
          </a>
        )}
      </div>
      <div className="mt-3 flex justify-end border-t border-white/5 pt-3">
        <AddToCalendarMenu event={calendarEvent} uid={appointment.id} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Agregar a mi calendario — el cliente puede llevarse la cita a Gmail
// (Google Calendar) o a cualquier otro calendario vía .ics estándar
// (Outlook, Apple, Yahoo...). No depende de que el entrenador/cliente hayan
// conectado Google Calendar a HakunnaFit — es un camino manual que siempre
// funciona (ver lib/calendar-links.ts).
// ---------------------------------------------------------------------------

function AddToCalendarMenu({ event, uid }: { event: CalendarEventInput; uid: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-1.5 text-[11px] font-semibold text-white/80 hover:border-white/40"
      >
        <CalendarPlus size={12} /> Agregar a mi calendario
      </button>
      {open && (
        <>
          <button className="fixed inset-0 z-10 cursor-default" aria-label="Cerrar" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1.5 w-56 overflow-hidden rounded-xl border border-white/10 bg-[#181818] p-1.5 shadow-2xl">
            <a
              href={googleCalendarUrl(event)}
              target="_blank"
              rel="noreferrer"
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2 text-xs font-medium text-white/85 hover:bg-white/5"
            >
              Google Calendar (Gmail)
            </a>
            <button
              onClick={() => {
                downloadIcsFile(event, uid);
                setOpen(false);
              }}
              className="block w-full rounded-lg px-3 py-2 text-left text-xs font-medium text-white/85 hover:bg-white/5"
            >
              Outlook / Apple / otro (.ics)
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Próximas citas — vista tipo calendario/semana: todas las citas reales
// (evaluations, ya aprobadas) de los próximos ~14 días con su estado
// (Confirmada/Completada). Pedido explícito de Nando: en /mi-cuenta solo se
// veía "Tu próxima cita" (una sola), sin forma de ver el resto de la semana
// ni de confirmar que una sesión ya quedó aprobada.
// ---------------------------------------------------------------------------

function UpcomingAppointmentsSection({ appointments }: { appointments: ClientAccountData["upcomingAppointments"] }) {
  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center gap-1.5">
        <CalendarClock size={14} style={{ color: "var(--hf-primary)" }} />
        <p className="text-xs font-bold uppercase tracking-wide text-white/40">Próximas citas</p>
      </div>
      <div className="mt-3 space-y-1.5">
        {appointments.map((a) => {
          const date = new Date(a.scheduledAt);
          const dateLabel = date.toLocaleDateString("es-CO", { weekday: "short", day: "numeric", month: "short", timeZone: "America/Bogota" });
          const timeLabel = date.toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "America/Bogota" });
          const isCompleted = a.status === "completada";
          return (
            <div key={a.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold capitalize text-white">{dateLabel}</p>
                <p className="text-[11px] text-white/50">
                  {timeLabel} · {a.duracionMin} min · {a.modalidad === "virtual" ? "Virtual" : "Presencial"}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  isCompleted ? "bg-white/10 text-white/50" : "bg-emerald-500/10 text-emerald-400"
                }`}
              >
                {isCompleted ? "Completada" : "Confirmada"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Vistazo rápido — 4 tarjetas de KPI, mismo lenguaje visual que los stats de
// la landing (círculo de icono + valor + etiqueta).
// ---------------------------------------------------------------------------

function StatsRow({
  client,
  imc,
  routine,
  nextAppointment,
}: {
  client: ClientAccountData["client"];
  imc: ReturnType<typeof calculateImc>;
  routine: ClientAccountData["routine"];
  nextAppointment: ClientAccountData["nextAppointment"];
}) {
  const diasFaltantes = useMemo(() => {
    if (!nextAppointment) return null;
    const ms = new Date(nextAppointment.scheduledAt).getTime() - Date.now();
    const dias = Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
    return dias;
  }, [nextAppointment]);

  const stats: { icon: typeof Scale; label: string; value: string }[] = [
    { icon: Scale, label: "Peso actual", value: client.peso_actual != null ? `${client.peso_actual} kg` : "—" },
    { icon: Sparkles, label: "IMC", value: imc ? `${imc.value}` : "—" },
    { icon: Dumbbell, label: "Días/semana", value: routine ? String(routine.dias_por_semana) : "—" },
    {
      icon: CalendarClock,
      label: "Próxima cita",
      value: diasFaltantes == null ? "—" : diasFaltantes === 0 ? "Hoy" : diasFaltantes === 1 ? "Mañana" : `En ${diasFaltantes} días`,
    },
  ];

  return (
    <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      {stats.map((s) => (
        <div key={s.label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-full"
            style={{ backgroundColor: "color-mix(in srgb, var(--hf-primary) 18%, transparent)", color: "var(--hf-primary)" }}
          >
            <s.icon size={15} />
          </div>
          <p className="mt-2 font-[family-name:var(--font-hf-heading)] text-base font-bold text-white">{s.value}</p>
          <p className="text-[10px] uppercase tracking-wide text-white/40">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mi rutina — selector de día tipo pills (en vez de una lista larga vertical)
// con el día de hoy resaltado si la rutina tiene diaSemana asignado.
// ---------------------------------------------------------------------------

const BLOCK_ICON: Record<string, typeof Dumbbell> = { fuerza: Dumbbell, running: Footprints, crossfit: Flame };

function RoutineSection({ routine }: { routine: NonNullable<ClientAccountData["routine"]> }) {
  const todayIdx = todayDiaSemana();
  const initialIndex = Math.max(
    0,
    routine.dias.findIndex((d) => d.diaSemana === todayIdx)
  );
  const [activeIndex, setActiveIndex] = useState(initialIndex === -1 ? 0 : initialIndex);
  const activeDay = routine.dias[activeIndex];

  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-white/40">Tu rutina</p>
          {routine.resumen_frecuencia && <p className="truncate text-xs text-white/50">{routine.resumen_frecuencia}</p>}
        </div>
        <span className="shrink-0 rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-white/50">{routine.horario}</span>
      </div>

      <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
        {routine.dias.map((day, i) => {
          const isToday = day.diaSemana === todayIdx;
          const isActive = i === activeIndex;
          const dayLabel = day.diaSemana != null ? DIAS_SEMANA.find((d) => d.value === day.diaSemana)?.label : null;
          return (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              className="relative shrink-0 rounded-xl border px-3.5 py-2 text-left transition-colors"
              style={
                isActive
                  ? { background: GREEN, borderColor: "transparent" }
                  : { borderColor: "rgba(255,255,255,0.12)", backgroundColor: "rgba(255,255,255,0.02)" }
              }
            >
              <p className={`text-xs font-bold ${isActive ? "text-black" : "text-white"}`}>{day.nombre}</p>
              {dayLabel && <p className={`text-[10px] ${isActive ? "text-black/70" : "text-white/40"}`}>{dayLabel}</p>}
              {isToday && !isActive && (
                <span
                  className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-hf-black"
                  style={{ backgroundColor: "var(--hf-primary)" }}
                  title="Hoy"
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-3">
        {activeDay.descanso ? (
          <div className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.02] p-4">
            <Moon size={17} className="text-white/40" />
            <p className="text-sm text-white/60">Día de descanso — aprovecha para recuperar.</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {activeDay.bloques.map((block, i) => (
              <ExerciseBlockRow key={i} block={block} />
            ))}
          </div>
        )}
      </div>
      <p className="mt-3 text-[11px] text-white/30">La define tu entrenador — no se puede editar desde acá.</p>
    </div>
  );
}

function ExerciseBlockRow({ block }: { block: RoutineExerciseBlock }) {
  const kind = blockKindOf(block);
  const Icon = BLOCK_ICON[kind];
  const name = block.nombreLibre?.trim() || (block.ejercicioId ? "Ejercicio de la biblioteca" : "Ejercicio");

  let detail = "—";
  if (kind === "running") {
    const b = block as Extract<RoutineExerciseBlock, { tipo: "running" }>;
    detail =
      [b.distanciaKm != null ? `${b.distanciaKm} km` : null, b.ritmoObjetivo, b.duracionMin != null ? `${b.duracionMin} min` : null, b.zonaFc]
        .filter(Boolean)
        .join(" · ") || "—";
  } else if (kind === "crossfit") {
    const b = block as Extract<RoutineExerciseBlock, { tipo: "crossfit" }>;
    detail =
      [b.formato?.toUpperCase(), b.rondas != null ? `${b.rondas} rondas` : null, b.duracionMin != null ? `${b.duracionMin} min` : null]
        .filter(Boolean)
        .join(" · ") || "—";
  } else {
    const b = block as Extract<RoutineExerciseBlock, { tipo?: "fuerza" }>;
    detail = `${b.series} series · ${b.repeticiones} reps${b.descansoSegundos != null ? ` · ${b.descansoSegundos}s descanso` : ""}`;
  }

  const notas = (block as { notas: string | null }).notas;
  const movimientos = kind === "crossfit" ? (block as Extract<RoutineExerciseBlock, { tipo: "crossfit" }>).movimientos : null;

  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5">
      <div
        className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
        style={{ backgroundColor: "color-mix(in srgb, var(--hf-primary) 16%, transparent)", color: "var(--hf-primary)" }}
      >
        <Icon size={13} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-white">{name}</p>
        <p className="mt-0.5 text-xs text-white/50">{detail}</p>
        {movimientos && <p className="mt-0.5 text-xs text-white/60">{movimientos}</p>}
        {notas && <p className="mt-0.5 text-xs text-white/40">{notas}</p>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sesiones por aprobar — igual que el portal, pero delegando en las
// acciones "Own" (resueltas por sesión, no por token). Restilizado con el
// degradado de marca en vez de un solo color plano.
// ---------------------------------------------------------------------------

function ProposalSection({
  proposal,
  onChanged,
}: {
  proposal: NonNullable<ClientAccountData["pendingProposal"]>;
  // Se llama después de aprobar o reemplazar una sesión — el padre vuelve a
  // pedir el dashboard completo (getOwnClientDashboardData) en vez de que
  // este componente parchee su propio estado, así "Tu próxima cita" y los
  // KPIs quedan sincronizados de inmediato sin recargar la página a mano.
  onChanged: () => void | Promise<void>;
}) {
  const [openReject, setOpenReject] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestedSlot[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const pendingCount = proposal.items.filter((i) => i.status === "pendiente").length;
  const aprobadasCount = proposal.items.filter((i) => i.status === "aprobada").length;

  function approve(itemId: string) {
    setError(null);
    setBusyItemId(itemId);
    startTransition(async () => {
      const res = await approveOwnProposalItem(proposal.proposalId, itemId);
      if (!res.ok) {
        setBusyItemId(null);
        return setError(res.error ?? "No se pudo aprobar esta sesión.");
      }
      await onChanged();
      setBusyItemId(null);
    });
  }

  function openRejectFlow(itemId: string) {
    setError(null);
    setOpenReject(itemId);
    setSuggestions([]);
    setLoadingSuggestions(true);
    startTransition(async () => {
      const res = await getOwnReplacementSuggestions(proposal.proposalId, itemId);
      setLoadingSuggestions(false);
      if (!res.ok) {
        setError(res.error ?? "No se pudieron calcular horarios alternativos.");
        setOpenReject(null);
        return;
      }
      setSuggestions(res.slots ?? []);
    });
  }

  function chooseReplacement(itemId: string, iso: string) {
    setError(null);
    setBusyItemId(itemId);
    startTransition(async () => {
      const res = await rejectAndReplaceOwnItem(proposal.proposalId, itemId, iso);
      if (!res.ok) {
        setBusyItemId(null);
        return setError(res.error ?? "No se pudo agendar el reemplazo — intenta con otro horario.");
      }
      setOpenReject(null);
      setSuggestions([]);
      await onChanged();
      setBusyItemId(null);
    });
  }

  return (
    <div className="mt-4 overflow-hidden rounded-2xl border" style={{ borderColor: "color-mix(in srgb, var(--hf-primary) 45%, transparent)" }}>
      <div className="flex items-center gap-2 px-4 py-2.5" style={{ background: pendingCount > 0 ? GREEN : "rgba(255,255,255,0.06)" }}>
        <Sparkles size={14} className={pendingCount > 0 ? "text-black" : "text-white/50"} />
        <p className={`text-xs font-bold uppercase tracking-wide ${pendingCount > 0 ? "text-black" : "text-white/50"}`}>
          {pendingCount > 0
            ? `${pendingCount} ${pendingCount === 1 ? "sesión espera" : "sesiones esperan"} tu aprobación`
            : `Plan de sesiones — ${aprobadasCount}/${proposal.items.length} aprobadas`}
        </p>
      </div>
      <div className="bg-white/[0.03] p-4">
        {error && <p className="mb-2 text-xs text-red-400">{error}</p>}
        <div className="space-y-2.5">
          {proposal.items.map((item) => {
            const dateLabel = new Date(item.scheduledAt).toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Bogota" });
            const timeLabel = new Date(item.scheduledAt).toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "America/Bogota" });
            const busy = busyItemId === item.id;

            // Ítems ya resueltos (aprobada/rechazada) — misma idea de badge
            // que ya usa el entrenador en su ficha (SessionProposalPanel):
            // solo informativo, sin botones de acción.
            if (item.status !== "pendiente") {
              return (
                <div key={item.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold capitalize text-white">{dateLabel}</p>
                    <p className="text-xs text-white/50">
                      {timeLabel} · {item.durationMin} min · {item.modalidad === "virtual" ? "Virtual" : "Presencial"}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      item.status === "aprobada" ? "bg-emerald-500/10 text-emerald-400" : "bg-red-500/10 text-red-400"
                    }`}
                  >
                    {item.status === "aprobada" ? "Aprobada" : "Rechazada"}
                  </span>
                </div>
              );
            }

            return (
              <div key={item.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold capitalize text-white">{dateLabel}</p>
                    <p className="text-xs text-white/50">
                      {timeLabel} · {item.durationMin} min · {item.modalidad === "virtual" ? "Virtual" : "Presencial"}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-400">Por aprobar</span>
                </div>

                {openReject !== item.id ? (
                  <div className="mt-2.5 flex gap-2">
                    <button
                      onClick={() => approve(item.id)}
                      disabled={busy}
                      className="flex-1 rounded-lg py-2 text-xs font-bold text-black disabled:opacity-50"
                      style={{ background: GREEN }}
                    >
                      {busy ? "Aprobando..." : "Aceptar"}
                    </button>
                    <button
                      onClick={() => openRejectFlow(item.id)}
                      disabled={busy}
                      className="flex-1 rounded-lg border border-white/15 py-2 text-xs font-semibold text-white/70 hover:border-white/30 disabled:opacity-50"
                    >
                      No me sirve
                    </button>
                  </div>
                ) : (
                  <div className="mt-2.5 rounded-lg border border-white/10 bg-white/[0.02] p-2.5">
                    <p className="text-[11px] font-semibold text-white/50">Elige un horario alternativo:</p>
                    {loadingSuggestions ? (
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-white/40">
                        <Loader2 size={12} className="animate-spin" /> Buscando horarios...
                      </div>
                    ) : suggestions.length === 0 ? (
                      <p className="mt-2 text-xs text-white/40">No encontramos horarios alternativos — escríbele a tu entrenador.</p>
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
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Progreso — subir foto, ver historial de peso. Recolorea el gráfico con el
// color primario de marca del entrenador (antes hf-blue fijo) y agrega el
// delta inicial→actual cuando hay al menos 2 registros de peso.
// ---------------------------------------------------------------------------

function ProgressSection({
  trainerColor,
  measurements,
  onPhoto,
}: {
  trainerColor: string;
  measurements: MeasurementRow[];
  onPhoto: (m: MeasurementRow) => void;
}) {
  const [uploading, startUpload] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photos = measurements.filter((m) => m.foto_url);
  const withWeight = measurements.filter((m) => m.peso != null);

  function pickPhoto(file: File) {
    setError(null);
    const formData = new FormData();
    formData.set("foto", file);
    startUpload(async () => {
      const res = await addOwnProgressPhoto(formData);
      if (!res.ok || !res.url) {
        setError(res.error || "No se pudo subir la foto.");
        return;
      }
      onPhoto({
        id: `local-${Date.now()}`,
        client_id: "",
        fecha: new Date().toISOString().slice(0, 10),
        peso: null,
        medidas: null,
        foto_url: res.url,
        notas: null,
        created_at: new Date().toISOString(),
      });
    });
  }

  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wide text-white/40">Tu progreso</p>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold text-black disabled:opacity-50"
          style={{ background: GREEN }}
        >
          {uploading ? <Loader2 size={12} className="animate-spin" /> : <ImagePlus size={12} />}
          {uploading ? "Subiendo..." : "Subir foto"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) pickPhoto(file);
            e.target.value = "";
          }}
        />
      </div>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

      <WeightChart measurements={withWeight} color={trainerColor} />

      {photos.length > 0 ? (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {photos.map((m) => (
            <div key={m.id} className="shrink-0 text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.foto_url!} alt={`Progreso ${m.fecha}`} className="h-24 w-24 rounded-xl object-cover" />
              <p className="mt-1 text-[10px] text-white/35">{new Date(m.fecha).toLocaleDateString("es-CO")}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-xs text-white/35">Todavía no tienes fotos de avance — sube la primera.</p>
      )}
    </div>
  );
}

/** Mismo gráfico SVG liviano ya usado en trainer-client-detail.tsx y en el
 * portal viejo (sin librería nueva), ahora coloreado con la marca del
 * entrenador en vez de un azul fijo. */
function WeightChart({ measurements, color }: { measurements: MeasurementRow[]; color: string }) {
  const points = measurements.slice().reverse();
  if (points.length < 2) return null;

  const weights = points.map((p) => p.peso!);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const range = max - min || 1;
  const w = 560;
  const h = 130;
  const pad = 16;
  const stepX = points.length > 1 ? (w - pad * 2) / (points.length - 1) : 0;
  const coords = points.map((p, i) => ({
    x: pad + i * stepX,
    y: pad + (1 - (p.peso! - min) / range) * (h - pad * 2),
  }));
  const polyline = coords.map((c) => `${c.x},${c.y}`).join(" ");
  const delta = weights[weights.length - 1] - weights[0];

  return (
    <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold text-white/50">Evolución de peso</p>
        {delta !== 0 && (
          <span className="text-[11px] font-semibold" style={{ color }}>
            {delta > 0 ? "+" : ""}
            {delta.toFixed(1)} kg desde tu primer registro
          </span>
        )}
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="mt-2 h-28 w-full">
        <polyline points={polyline} fill="none" stroke={color} strokeWidth="2" />
        {coords.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r="3" fill={color} />
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-[11px] text-white/40">
        <span>{min} kg</span>
        <span>{max} kg</span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mis datos — Mi perfil + Hoja de vida, agrupados y colapsados por defecto.
// Es información que se consulta poco frente a rutina/citas/progreso, así
// que se prioriza abajo del todo en vez de competir por atención arriba.
// ---------------------------------------------------------------------------

function MiInformacion({
  client,
  onSaved,
}: {
  client: ClientAccountData["client"];
  onSaved: (patch: Partial<ClientAccountData["client"]>) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03]">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-white/40">Mis datos</p>
        <ChevronDown size={15} className={`text-white/40 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="space-y-4 px-4 pb-4">
          <MiPerfilCard client={client} onSaved={onSaved} />
          <MiHojaDeVidaCard client={client} onSaved={onSaved} />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mi perfil — nombre, whatsapp, foto. Correo de solo lectura.
// ---------------------------------------------------------------------------

function MiPerfilCard({
  client,
  onSaved,
}: {
  client: ClientAccountData["client"];
  onSaved: (patch: Partial<ClientAccountData["client"]>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(client.full_name);
  const [whatsapp, setWhatsapp] = useState(client.whatsapp ?? "");
  const [saving, startSaving] = useTransition();
  const [uploadingPhoto, startPhotoUpload] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function save() {
    setError(null);
    startSaving(async () => {
      const res = await updateOwnPresentation({ fullName, whatsapp });
      if (!res.ok) return setError(res.error ?? "No se pudo guardar.");
      onSaved({ full_name: fullName.trim(), whatsapp: whatsapp.trim() || null });
      setEditing(false);
    });
  }

  function pickPhoto(file: File) {
    setError(null);
    const formData = new FormData();
    formData.set("foto", file);
    startPhotoUpload(async () => {
      const res = await uploadOwnAvatar(formData);
      if (!res.ok || !res.url) return setError(res.error || "No se pudo subir tu foto.");
      onSaved({ avatar_url: res.url });
    });
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wide text-white/40">Mi perfil</p>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1 text-[11px] font-semibold text-white/50 hover:text-white"
          >
            <Pencil size={11} /> Editar
          </button>
        )}
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploadingPhoto}
          className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-white/15 bg-white/5"
          title="Cambiar foto"
        >
          {client.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={client.avatar_url} alt={client.full_name} className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full w-full items-center justify-center text-sm font-bold text-white/40">
              {client.full_name.slice(0, 1).toUpperCase()}
            </span>
          )}
          <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 hover:opacity-100">
            {uploadingPhoto ? <Loader2 size={14} className="animate-spin text-white" /> : <Camera size={14} className="text-white" />}
          </span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) pickPhoto(file);
            e.target.value = "";
          }}
        />

        {!editing ? (
          <div>
            <p className="text-sm font-semibold text-white">{client.full_name}</p>
            <p className="text-xs text-white/40">{client.email || "Sin correo"}</p>
            <p className="text-xs text-white/40">{client.whatsapp || "Sin WhatsApp"}</p>
          </div>
        ) : (
          <div className="flex-1 space-y-2">
            <input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="h-9 w-full rounded-lg border border-white/15 bg-white/5 px-3 text-sm text-white focus:border-hf-blue focus:outline-none"
              placeholder="Tu nombre"
            />
            <input
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              className="h-9 w-full rounded-lg border border-white/15 bg-white/5 px-3 text-sm text-white focus:border-hf-blue focus:outline-none"
              placeholder="Tu WhatsApp"
            />
            <p className="text-[10px] text-white/30">
              Tu correo ({client.email || "sin correo"}) no se puede cambiar desde acá.
            </p>
          </div>
        )}
      </div>

      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

      {editing && (
        <div className="mt-3 flex gap-2">
          <button
            onClick={save}
            disabled={saving}
            className="flex-1 rounded-lg bg-hf-blue py-2 text-xs font-bold text-black disabled:opacity-50"
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
          <button
            onClick={() => {
              setEditing(false);
              setFullName(client.full_name);
              setWhatsapp(client.whatsapp ?? "");
              setError(null);
            }}
            className="flex-1 rounded-lg border border-white/15 py-2 text-xs font-semibold text-white/70 hover:border-white/30"
          >
            Cancelar
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Mi hoja de vida — editable. La rutina NO vive acá.
// ---------------------------------------------------------------------------

function MiHojaDeVidaCard({
  client,
  onSaved,
}: {
  client: ClientAccountData["client"];
  onSaved: (patch: Partial<ClientAccountData["client"]>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [sexo, setSexo] = useState(client.sexo ?? "");
  const [nivel, setNivel] = useState(client.nivel ?? "");
  const [actividad, setActividad] = useState(client.actividad ?? "");
  const [objetivo, setObjetivo] = useState(client.objetivo ?? "");
  const [pesoActual, setPesoActual] = useState(client.peso_actual != null ? String(client.peso_actual) : "");
  const [altura, setAltura] = useState(client.altura != null ? String(client.altura) : "");
  const [saving, startSaving] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function save() {
    setError(null);
    startSaving(async () => {
      const res = await updateOwnHojaDeVida({
        sexo: sexo || null,
        nivel: nivel || null,
        actividad: actividad || null,
        objetivo: objetivo || null,
        pesoActual: pesoActual.trim() ? parseFloat(pesoActual) : null,
        altura: altura.trim() ? parseFloat(altura) : null,
      });
      if (!res.ok) return setError(res.error ?? "No se pudo guardar.");
      onSaved({
        sexo: sexo || null,
        nivel: nivel || null,
        actividad: actividad || null,
        objetivo: objetivo || null,
        peso_actual: pesoActual.trim() ? parseFloat(pesoActual) : null,
        altura: altura.trim() ? parseFloat(altura) : null,
      });
      setEditing(false);
    });
  }

  if (!editing) {
    return (
      <div className="relative">
        <ClientHojaDeVida client={client} />
        <button
          onClick={() => setEditing(true)}
          className="absolute right-4 top-4 flex items-center gap-1 text-[11px] font-semibold text-white/50 hover:text-white"
        >
          <Pencil size={11} /> Editar
        </button>
      </div>
    );
  }

  const imc = calculateImc(pesoActual.trim() ? parseFloat(pesoActual) : null, altura.trim() ? parseFloat(altura) : null);

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wide text-white/40">Hoja de vida</p>
        {imc && <span className="text-[11px] text-white/40">IMC {imc.value} · {imc.label}</span>}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        <label className="block">
          <span className="mb-1 block text-[10px] uppercase tracking-wide text-white/30">Sexo</span>
          <select
            value={sexo}
            onChange={(e) => setSexo(e.target.value)}
            className="h-9 w-full rounded-lg border border-white/15 bg-white/5 px-2 text-xs text-white focus:border-hf-blue focus:outline-none"
          >
            <option value="">—</option>
            {Object.entries(SEXO_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[10px] uppercase tracking-wide text-white/30">Nivel</span>
          <select
            value={nivel}
            onChange={(e) => setNivel(e.target.value)}
            className="h-9 w-full rounded-lg border border-white/15 bg-white/5 px-2 text-xs text-white focus:border-hf-blue focus:outline-none"
          >
            <option value="">—</option>
            {Object.entries(NIVEL_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[10px] uppercase tracking-wide text-white/30">Actividad</span>
          <select
            value={actividad}
            onChange={(e) => setActividad(e.target.value)}
            className="h-9 w-full rounded-lg border border-white/15 bg-white/5 px-2 text-xs text-white focus:border-hf-blue focus:outline-none"
          >
            <option value="">—</option>
            {ACTIVIDAD_OPTIONS.map((a) => (
              <option key={a.value} value={a.value}>
                {a.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[10px] uppercase tracking-wide text-white/30">Peso (kg)</span>
          <input
            type="number"
            value={pesoActual}
            onChange={(e) => setPesoActual(e.target.value)}
            className="h-9 w-full rounded-lg border border-white/15 bg-white/5 px-2 text-xs text-white focus:border-hf-blue focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-[10px] uppercase tracking-wide text-white/30">Estatura (cm)</span>
          <input
            type="number"
            value={altura}
            onChange={(e) => setAltura(e.target.value)}
            className="h-9 w-full rounded-lg border border-white/15 bg-white/5 px-2 text-xs text-white focus:border-hf-blue focus:outline-none"
          />
        </label>
      </div>

      <label className="mt-2.5 block">
        <span className="mb-1 block text-[10px] uppercase tracking-wide text-white/30">
          <Target size={10} className="mr-1 inline" />
          Objetivo
        </span>
        <textarea
          value={objetivo}
          onChange={(e) => setObjetivo(e.target.value)}
          rows={2}
          className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs text-white focus:border-hf-blue focus:outline-none"
        />
      </label>

      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

      <div className="mt-3 flex gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="flex-1 rounded-lg bg-hf-blue py-2 text-xs font-bold text-black disabled:opacity-50"
        >
          {saving ? "Guardando..." : "Guardar"}
        </button>
        <button
          onClick={() => setEditing(false)}
          className="flex-1 rounded-lg border border-white/15 py-2 text-xs font-semibold text-white/70 hover:border-white/30"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
