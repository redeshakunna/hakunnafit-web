"use client";

// Dashboard del cliente final con sesión real — /mi-cuenta. Reemplaza el
// portal por token (components/client-portal/client-portal-view.tsx,
// retirado junto con /mi-progreso/[token]). Misma info que el portal viejo
// (rutina, próxima cita, sesiones por aprobar, progreso) más lo que el
// portal nunca tuvo: edición de "Mi perfil" (nombre, whatsapp, foto) y "Mi
// hoja de vida" (sexo, nivel, actividad, objetivo, peso, altura). La rutina
// se queda de solo lectura a propósito — la arma y aprueba el entrenador.

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Loader2, LogOut, MessageCircle, Pencil, Video, ImagePlus, Camera } from "lucide-react";
import { BrandMark } from "@/components/hakunnafit/starter-templates/brand-mark";
import { whatsappHref } from "@/components/hakunnafit/starter-templates/types";
import { ClientHojaDeVida } from "@/components/trainer/client-hoja-de-vida";
import { calculateImc } from "@/lib/imc";
import { SEXO_LABELS, NIVEL_LABELS, ACTIVIDAD_OPTIONS } from "@/lib/client-ui";
import { blockKindOf, DIAS_SEMANA, type RoutineDay, type RoutineExerciseBlock } from "@/lib/routine-types";
import type { MeasurementRow } from "@/lib/trainer-clients-actions";
import { logoutClient } from "@/lib/client-auth";
import {
  addOwnProgressPhoto,
  approveOwnProposalItem,
  getOwnReplacementSuggestions,
  rejectAndReplaceOwnItem,
  updateOwnHojaDeVida,
  updateOwnPresentation,
  uploadOwnAvatar,
  type ClientAccountData,
  type SuggestedSlot,
} from "@/lib/client-account-actions";

export function ClientAccountDashboard({ initialData }: { initialData: ClientAccountData }) {
  const router = useRouter();
  const [data, setData] = useState(initialData);
  const { client, trainer, routine, nextAppointment, pendingProposal, measurements } = data;
  const firstName = client.full_name.split(" ")[0];
  const waHref = whatsappHref(trainer.whatsapp, `Hola ${trainer.businessName}, te escribo desde mi cuenta de HakunnaFit.`);

  async function onLogout() {
    await logoutClient();
    router.push(trainer.subdominio ? `/landing/${trainer.subdominio}` : "/");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-hf-black px-4 py-8 text-white">
      <div className="mx-auto w-full max-w-2xl">
        <div className="flex items-center justify-between gap-3">
          <BrandMark logoUrl={trainer.logoUrl} businessName={trainer.businessName} className="h-9 w-36" />
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
              className="flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/50 hover:border-white/30 hover:text-white"
            >
              <LogOut size={13} /> Salir
            </button>
          </div>
        </div>

        <p className="mt-6 text-lg font-bold text-white">Hola, {firstName}</p>
        <p className="mt-1 text-sm text-white/50">Esta es tu cuenta en {trainer.businessName}.</p>

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
          <ProposalSection
            trainerColor={trainer.colorPrimario}
            proposal={pendingProposal}
            onChange={(p) => setData((d) => ({ ...d, pendingProposal: p }))}
          />
        )}

        <MiPerfilCard
          client={client}
          onSaved={(patch) => setData((d) => ({ ...d, client: { ...d.client, ...patch } }))}
        />

        <MiHojaDeVidaCard
          client={client}
          onSaved={(patch) => setData((d) => ({ ...d, client: { ...d.client, ...patch } }))}
        />

        {routine && (
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-white/40">Tu rutina</p>
            <p className="mt-0.5 text-[11px] text-white/30">La define tu entrenador — no se puede editar desde acá.</p>
            {routine.resumen_frecuencia && <p className="mt-1 text-xs text-white/50">{routine.resumen_frecuencia}</p>}
            <div className="mt-3 space-y-3">
              {routine.dias.map((day, i) => (
                <RoutineDayCard key={i} day={day} />
              ))}
            </div>
          </div>
        )}

        <ProgressSection measurements={measurements} onPhoto={(m) => setData((d) => ({ ...d, measurements: [m, ...d.measurements] }))} />

        <p className="mt-8 text-center text-[11px] text-white/25">Tu cuenta en HakunnaFit — {trainer.businessName}</p>
      </div>
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
    <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
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
    <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
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
        <span className="mb-1 block text-[10px] uppercase tracking-wide text-white/30">Objetivo</span>
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

// ---------------------------------------------------------------------------
// Mi rutina — solo lectura (mismo render que tenía el portal por token).
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Sesiones por aprobar — igual que el portal, pero delegando en las
// acciones "Own" (resueltas por sesión, no por token).
// ---------------------------------------------------------------------------

function ProposalSection({
  trainerColor,
  proposal,
  onChange,
}: {
  trainerColor: string;
  proposal: NonNullable<ClientAccountData["pendingProposal"]>;
  onChange: (p: ClientAccountData["pendingProposal"]) => void;
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
      const res = await approveOwnProposalItem(proposal.proposalId, itemId);
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

// ---------------------------------------------------------------------------
// Progreso — subir foto, ver historial de peso.
// ---------------------------------------------------------------------------

function ProgressSection({
  measurements,
  onPhoto,
}: {
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

      <WeightChart measurements={withWeight} />

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
 * portal viejo (sin librería nueva). */
function WeightChart({ measurements }: { measurements: MeasurementRow[] }) {
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
