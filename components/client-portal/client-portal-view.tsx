"use client";

// Portal del cliente final (/mi-progreso/[token]) — alcance básico pedido
// por el negocio: ver su hoja de vida, su rutina asignada, su próxima cita,
// aprobar/rechazar las sesiones que le propuso el entrenador, ver su
// historial de peso/fotos y subir una foto de avance nueva. Sin login (ver
// lib/client-portal-actions.ts para el porqué del link permanente por token
// en vez de cuenta con Supabase Auth).
//
// Nota de alcance: los bloques de rutina que vienen de la biblioteca
// compartida de ejercicios (ejercicioId, no nombreLibre) se muestran con un
// nombre genérico acá — traer el nombre real requeriría exponer
// getExercisesByIds() sin sesión de entrenador, que hoy está protegida por
// requireTrainer(). Si se vuelve confuso para los clientes, es la próxima
// mejora natural de este componente.

import { useRef, useState, useTransition } from "react";
import { CalendarClock, Loader2, MessageCircle, Video, ImagePlus } from "lucide-react";
import { BrandMark } from "@/components/hakunnafit/starter-templates/brand-mark";
import { whatsappHref } from "@/components/hakunnafit/starter-templates/types";
import { ClientHojaDeVida } from "@/components/trainer/client-hoja-de-vida";
import { blockKindOf, DIAS_SEMANA, type RoutineDay, type RoutineExerciseBlock } from "@/lib/routine-types";
import type { MeasurementRow } from "@/lib/trainer-clients-actions";
import {
  addPortalProgressPhoto,
  approvePortalProposalItem,
  getPortalReplacementSuggestions,
  rejectAndReplacePortalItem,
  type ClientPortalData,
  type SuggestedSlot,
} from "@/lib/client-portal-actions";

export function ClientPortalView({ token, initialData }: { token: string; initialData: ClientPortalData }) {
  const [data, setData] = useState(initialData);
  const { client, trainer, routine, nextAppointment, pendingProposal, measurements } = data;
  const firstName = client.full_name.split(" ")[0];
  const waHref = whatsappHref(trainer.whatsapp, `Hola ${trainer.businessName}, te escribo desde mi portal de HakunnaFit.`);

  return (
    <div className="min-h-screen bg-hf-black px-4 py-8 text-white">
      <div className="mx-auto w-full max-w-2xl">
        <div className="flex items-center justify-between gap-3">
          <BrandMark logoUrl={trainer.logoUrl} businessName={trainer.businessName} className="h-9 w-36" />
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
        </div>

        <p className="mt-6 text-lg font-bold text-white">Hola, {firstName}</p>
        <p className="mt-1 text-sm text-white/50">Este es tu portal en {trainer.businessName}.</p>

        {nextAppointment && (
          <div
            className="mt-5 flex items-center gap-3 rounded-2xl border p-4"
            style={{ borderColor: `${trainer.colorPrimario}40`, backgroundColor: `${trainer.colorPrimario}12` }}
          >
            <CalendarClock size={18} style={{ color: trainer.colorPrimario }} className="shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">
                Tu próxima cita:{" "}
                {new Date(nextAppointment.scheduledAt).toLocaleString("es-CO", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                  timeZone: "America/Bogota",
                })}
              </p>
              <p className="mt-0.5 text-xs text-white/50">
                {nextAppointment.duracionMin} min · {nextAppointment.modalidad === "virtual" ? "Virtual" : "Presencial"}
              </p>
            </div>
            {nextAppointment.modalidad === "virtual" && nextAppointment.meetLink && (
              <a
                href={nextAppointment.meetLink}
                target="_blank"
                rel="noreferrer"
                className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-bold text-black"
                style={{ backgroundColor: trainer.colorPrimario }}
              >
                <Video size={13} /> Unirme
              </a>
            )}
          </div>
        )}

        {pendingProposal && pendingProposal.items.some((i) => i.status === "pendiente") && (
          <ProposalSection token={token} trainerColor={trainer.colorPrimario} proposal={pendingProposal} onChange={(p) => setData((d) => ({ ...d, pendingProposal: p }))} />
        )}

        <ClientHojaDeVida client={client} />

        {routine && (
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-white/40">Tu rutina</p>
            {routine.resumen_frecuencia && <p className="mt-1 text-xs text-white/50">{routine.resumen_frecuencia}</p>}
            <div className="mt-3 space-y-3">
              {routine.dias.map((day, i) => (
                <RoutineDayCard key={i} day={day} />
              ))}
            </div>
          </div>
        )}

        <ProgressSection token={token} measurements={measurements} onPhoto={(m) => setData((d) => ({ ...d, measurements: [m, ...d.measurements] }))} />

        <p className="mt-8 text-center text-[11px] text-white/25">Portal de HakunnaFit — {trainer.businessName}</p>
      </div>
    </div>
  );
}

function RoutineDayCard({ day }: { day: RoutineDay }) {
  const dayLabel = day.diaSemana != null ? DIAS_SEMANA.find((d) => d.value === day.diaSemana)?.label : null;
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <p className="text-sm font-semibold text-white">
        {day.nombre}
        {dayLabel ? ` · ${dayLabel}` : ""}
      </p>
      {day.descanso ? (
        <p className="mt-1 text-xs text-white/40">Descanso</p>
      ) : (
        <div className="mt-2 space-y-1.5">
          {day.bloques.map((block, i) => (
            <ExerciseBlockRow key={i} block={block} />
          ))}
        </div>
      )}
    </div>
  );
}

function ExerciseBlockRow({ block }: { block: RoutineExerciseBlock }) {
  const kind = blockKindOf(block);
  const name = block.nombreLibre?.trim() || (block.ejercicioId ? "Ejercicio de la biblioteca" : "Ejercicio");

  if (kind === "running") {
    const b = block as Extract<RoutineExerciseBlock, { tipo: "running" }>;
    return (
      <div className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-xs text-white/80">
        <p className="font-semibold text-white">{name}</p>
        <p className="mt-0.5 text-white/50">
          {[b.distanciaKm != null ? `${b.distanciaKm} km` : null, b.ritmoObjetivo, b.duracionMin != null ? `${b.duracionMin} min` : null, b.zonaFc]
            .filter(Boolean)
            .join(" · ") || "—"}
        </p>
        {b.notas && <p className="mt-0.5 text-white/40">{b.notas}</p>}
      </div>
    );
  }

  if (kind === "crossfit") {
    const b = block as Extract<RoutineExerciseBlock, { tipo: "crossfit" }>;
    return (
      <div className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-xs text-white/80">
        <p className="font-semibold text-white">{name}</p>
        <p className="mt-0.5 text-white/50">
          {[b.formato?.toUpperCase(), b.rondas != null ? `${b.rondas} rondas` : null, b.duracionMin != null ? `${b.duracionMin} min` : null]
            .filter(Boolean)
            .join(" · ") || "—"}
        </p>
        {b.movimientos && <p className="mt-0.5 text-white/60">{b.movimientos}</p>}
        {b.notas && <p className="mt-0.5 text-white/40">{b.notas}</p>}
      </div>
    );
  }

  const b = block as Extract<RoutineExerciseBlock, { tipo?: "fuerza" }>;
  return (
    <div className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2 text-xs text-white/80">
      <p className="font-semibold text-white">{name}</p>
      <p className="mt-0.5 text-white/50">
        {b.series} series · {b.repeticiones} reps{b.descansoSegundos != null ? ` · ${b.descansoSegundos}s descanso` : ""}
      </p>
      {b.notas && <p className="mt-0.5 text-white/40">{b.notas}</p>}
    </div>
  );
}

function ProposalSection({
  token,
  trainerColor,
  proposal,
  onChange,
}: {
  token: string;
  trainerColor: string;
  proposal: NonNullable<ClientPortalData["pendingProposal"]>;
  onChange: (p: ClientPortalData["pendingProposal"]) => void;
}) {
  const [openReject, setOpenReject] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestedSlot[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function approve(itemId: string) {
    setError(null);
    setBusyItemId(itemId);
    startTransition(async () => {
      const res = await approvePortalProposalItem(token, proposal.proposalId, itemId);
      setBusyItemId(null);
      if (!res.ok) return setError(res.error ?? "No se pudo aprobar esta sesión.");
      onChange({ ...proposal, items: proposal.items.map((it) => (it.id === itemId ? { ...it, status: "aprobada" } : it)) });
    });
  }

  function openRejectFlow(itemId: string) {
    setError(null);
    setOpenReject(itemId);
    setSuggestions([]);
    setLoadingSuggestions(true);
    startTransition(async () => {
      const res = await getPortalReplacementSuggestions(token, proposal.proposalId, itemId);
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
      const res = await rejectAndReplacePortalItem(token, proposal.proposalId, itemId, iso);
      setBusyItemId(null);
      if (!res.ok) return setError(res.error ?? "No se pudo agendar el reemplazo — intenta con otro horario.");
      setOpenReject(null);
      setSuggestions([]);
      onChange({ ...proposal, items: proposal.items.map((it) => (it.id === itemId ? { ...it, status: "aprobada", scheduledAt: iso } : it)) });
    });
  }

  return (
    <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-white/40">Sesiones por aprobar</p>
      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      <div className="mt-3 space-y-2.5">
        {proposal.items.map((item) => {
          if (item.status !== "pendiente") return null;
          const dateLabel = new Date(item.scheduledAt).toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Bogota" });
          const timeLabel = new Date(item.scheduledAt).toLocaleTimeString("es-CO", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: "America/Bogota" });
          const busy = busyItemId === item.id;
          return (
            <div key={item.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <p className="text-sm font-semibold capitalize text-white">{dateLabel}</p>
              <p className="text-xs text-white/50">
                {timeLabel} · {item.durationMin} min · {item.modalidad === "virtual" ? "Virtual" : "Presencial"}
              </p>

              {openReject !== item.id ? (
                <div className="mt-2.5 flex gap-2">
                  <button
                    onClick={() => approve(item.id)}
                    disabled={busy}
                    className="flex-1 rounded-lg py-2 text-xs font-bold text-black disabled:opacity-50"
                    style={{ backgroundColor: trainerColor }}
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
  );
}

function ProgressSection({
  token,
  measurements,
  onPhoto,
}: {
  token: string;
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
      const res = await addPortalProgressPhoto(token, formData);
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
          className="flex items-center gap-1.5 rounded-full bg-hf-blue px-3 py-1.5 text-[11px] font-bold text-black disabled:opacity-50"
        >
          {uploading ? <Loader2 size={12} className="animate-spin" /> : <ImagePlus size={12} />}
          {uploading ? "Subiendo..." : "Subir foto de avance"}
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

      <PortalWeightChart measurements={withWeight} />

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

/** Mismo patrón de gráfico SVG liviano que trainer-client-detail.tsx (sin
 * librería nueva), adaptado para el portal público del cliente. */
function PortalWeightChart({ measurements }: { measurements: MeasurementRow[] }) {
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

  return (
    <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <p className="text-[11px] font-semibold text-white/50">Evolución de peso</p>
      <svg viewBox={`0 0 ${w} ${h}`} className="mt-2 h-28 w-full">
        <polyline points={polyline} fill="none" stroke="#00C8FF" strokeWidth="2" />
        {coords.map((c, i) => (
          <circle key={i} cx={c.x} cy={c.y} r="3" fill="#00C8FF" />
        ))}
      </svg>
      <div className="mt-1 flex justify-between text-[11px] text-white/40">
        <span>{min} kg</span>
        <span>{max} kg</span>
      </div>
    </div>
  );
}
