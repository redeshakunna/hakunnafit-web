"use client";

// Ficha completa de un cliente — /panel/clientes/[id]. A diferencia del
// modal rápido que vivía antes en trainer-clients-manager.tsx, esta es una
// página propia con más espacio para mostrar la evolución real del cliente.
//
// Nota de honestidad de datos: el mockup de referencia incluía métricas que
// hoy no existen en el esquema (racha de entrenamientos, % de grasa
// corporal, "semana X de 12" con adherencia, "índice de transformación",
// alertas automáticas, último acceso). Ninguna de esas se simula acá — todo
// lo que se muestra sale de clients/measurements/evaluations/weekly_plans
// real. Cuando se construya el check-off de rutinas y el tracking de grasa
// corporal, esta pantalla es el lugar natural para sumarlas.

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  MessageCircle,
  Pencil,
  CalendarClock,
  Dumbbell,
  Plus,
  Check,
} from "lucide-react";
import type { TrainerRow } from "@/lib/admin-actions";
import { calculateImc } from "@/lib/imc";
import { IMC_CATEGORY_CLASS, STATUS_META, STATUS_DOT, initials, avatarColor } from "@/lib/client-ui";
import {
  updateOwnClient,
  getOwnClientMeasurements,
  addOwnClientMeasurement,
  getOwnClientEvaluations,
  scheduleOwnEvaluation,
  updateOwnEvaluationStatus,
  type ClientRow,
  type MeasurementRow,
  type EvaluationRow,
} from "@/lib/trainer-clients-actions";
import type { RoutineRow } from "@/lib/trainer-routines-actions";
import { ClientHojaDeVida } from "@/components/trainer/client-hoja-de-vida";
import { ClientFormModal, clientToForm, type FormState } from "@/components/trainer/trainer-clients-manager";

type Tab = "resumen" | "progreso" | "evaluaciones" | "rutina";

export function TrainerClientDetail({
  trainer,
  client: initialClient,
  initialMeasurements,
  initialEvaluations,
  routines,
}: {
  trainer: TrainerRow;
  client: ClientRow;
  initialMeasurements: MeasurementRow[];
  initialEvaluations: EvaluationRow[];
  routines: RoutineRow[];
}) {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get("tab") as Tab | null) ?? "resumen";

  const [client, setClient] = useState(initialClient);
  const [tab, setTab] = useState<Tab>(initialTab);
  const [measurements, setMeasurements] = useState<MeasurementRow[]>(initialMeasurements);
  const [evaluations, setEvaluations] = useState<EvaluationRow[]>(initialEvaluations);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<FormState>(clientToForm(initialClient));
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const meta = STATUS_META[client.status];
  const imc = calculateImc(client.peso_actual, client.altura);
  const since = new Date(client.created_at).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });

  const pesoDelta = useMemo(() => {
    const withWeight = measurements.filter((m) => m.peso != null);
    if (withWeight.length < 2) return null;
    const oldest = withWeight[withWeight.length - 1].peso!;
    const newest = withWeight[0].peso!;
    return Math.round((newest - oldest) * 10) / 10;
  }, [measurements]);

  const evaluacionesCompletadas = evaluations.filter((e) => e.status === "completada").length;
  const nextEvaluation = evaluations
    .filter((e) => e.status === "pendiente" && new Date(e.scheduled_at) >= new Date())
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime())[0];

  function openEdit() {
    setForm(clientToForm(client));
    setError(null);
    setEditing(true);
  }

  function submitEdit() {
    setError(null);
    startTransition(async () => {
      const diasPorSemana = form.diasPorSemana ? parseInt(form.diasPorSemana, 10) : null;
      const pesoActual = form.pesoActual ? parseFloat(form.pesoActual) : null;
      const altura = form.altura ? parseFloat(form.altura) : null;
      const res = await updateOwnClient(client.id, {
        fullName: form.fullName,
        email: form.email,
        whatsapp: form.whatsapp,
        sexo: form.sexo,
        objetivo: form.objetivo,
        nivel: form.nivel,
        actividad: form.actividad,
        pesoActual,
        altura,
        planElegido: form.planElegido,
        diasPorSemana,
        horarioEntreno: form.horarioEntreno,
        status: form.status,
      });
      if (!res.ok) return setError(res.error ?? "No se pudo guardar.");
      setClient({
        ...client,
        full_name: form.fullName.trim(),
        email: form.email || null,
        whatsapp: form.whatsapp || null,
        sexo: form.sexo || null,
        objetivo: form.objetivo || null,
        nivel: form.nivel || null,
        actividad: form.actividad || null,
        peso_actual: pesoActual,
        altura,
        plan_elegido: form.planElegido || null,
        dias_por_semana: diasPorSemana,
        horario_entreno: form.horarioEntreno || null,
        status: form.status,
      });
      setEditing(false);
    });
  }

  return (
    <div className="mx-auto max-w-5xl">
      <Link href="/panel/clientes" className="flex items-center gap-1.5 text-xs font-semibold text-white/50 hover:text-white">
        <ArrowLeft size={14} /> Volver a clientes
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="relative shrink-0">
            <div className={`flex h-16 w-16 items-center justify-center rounded-full text-xl font-bold ${avatarColor(client.id)}`}>
              {initials(client.full_name)}
            </div>
            <span
              className={`absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-hf-black ${STATUS_DOT[client.status]}`}
            />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-white">{client.full_name}</h1>
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${meta.className}`}>{meta.label}</span>
            </div>
            <p className="mt-1 text-sm font-medium text-hf-blue">{client.objetivo || "Sin objetivo definido"}</p>
            <p className="mt-1 text-xs text-white/40">Cliente desde {since}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {client.whatsapp && (
            <a
              href={`https://wa.me/${client.whatsapp.replace(/\D/g, "")}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-2 text-xs font-semibold text-white/80 hover:border-white/30 hover:text-white"
            >
              <MessageCircle size={13} /> WhatsApp
            </a>
          )}
          <button
            onClick={openEdit}
            className="flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-2 text-xs font-semibold text-white/80 hover:border-white/30 hover:text-white"
          >
            <Pencil size={13} /> Editar
          </button>
          <button
            onClick={() => setTab("evaluaciones")}
            className="flex items-center gap-1.5 rounded-full bg-hf-blue px-3 py-2 text-xs font-bold text-black"
          >
            <CalendarClock size={13} /> Agendar evaluación
          </button>
        </div>
      </div>

      {nextEvaluation && (
        <div className="mt-4 flex items-center gap-2 rounded-xl border border-hf-blue/30 bg-hf-blue/10 px-4 py-2.5 text-xs font-semibold text-hf-blue">
          <CalendarClock size={14} />
          Próxima evaluación:{" "}
          {new Date(nextEvaluation.scheduled_at).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })}
        </div>
      )}

      <ClientHojaDeVida client={client} />

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <MiniKpi
          label="Peso actual"
          value={client.peso_actual != null ? `${client.peso_actual} kg` : "—"}
          hint={pesoDelta != null ? `${pesoDelta > 0 ? "+" : ""}${pesoDelta} kg desde el inicio` : undefined}
        />
        <div className={`rounded-2xl border border-white/10 p-4 ${imc ? IMC_CATEGORY_CLASS[imc.category] : "bg-white/[0.03]"}`}>
          <p className="text-[11px] uppercase tracking-wide text-white/50">IMC</p>
          <p className="mt-1.5 text-xl font-bold text-white">{imc ? imc.value : "—"}</p>
          {imc && <p className="mt-0.5 text-[11px] text-white/60">{imc.label}</p>}
        </div>
        <MiniKpi label="Mediciones" value={String(measurements.length)} hint="registradas" />
        <MiniKpi label="Evaluaciones" value={`${evaluacionesCompletadas} / ${evaluations.length}`} hint="completadas" />
        <MiniKpi label="Rutinas" value={String(routines.length)} hint="asignadas" />
      </div>

      <div className="mt-5 flex gap-2">
        <TabButton label="Resumen" active={tab === "resumen"} onClick={() => setTab("resumen")} />
        <TabButton label="Progreso" active={tab === "progreso"} onClick={() => setTab("progreso")} />
        <TabButton label="Evaluaciones" active={tab === "evaluaciones"} onClick={() => setTab("evaluaciones")} />
        <TabButton label="Rutina" active={tab === "rutina"} onClick={() => setTab("rutina")} />
      </div>

      {tab === "resumen" && (
        <ResumenTab client={client} measurements={measurements} evaluations={evaluations} routines={routines} />
      )}

      {tab === "progreso" && (
        <ProgresoTab clientId={client.id} measurements={measurements} setMeasurements={setMeasurements} />
      )}

      {tab === "evaluaciones" && (
        <EvaluacionesTab clientId={client.id} evaluations={evaluations} setEvaluations={setEvaluations} />
      )}

      {tab === "rutina" && <RutinaTab routines={routines} />}

      {editing && (
        <ClientFormModal
          mode="edit"
          form={form}
          setForm={setForm}
          onCancel={() => setEditing(false)}
          onSubmit={submitEdit}
          isPending={isPending}
          error={error}
          planesOfrecidos={trainer.planes_ofrecidos}
        />
      )}
    </div>
  );
}

function MiniKpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-[11px] uppercase tracking-wide text-white/50">{label}</p>
      <p className="mt-1.5 text-xl font-bold text-white">{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-white/40">{hint}</p>}
    </div>
  );
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
        active ? "bg-hf-blue text-black" : "border border-white/15 text-white/60 hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}

/** Gráfico de línea liviano en SVG puro — sin librería nueva, coherente con
 * "Simplicidad" del proyecto. Se dibuja solo con >= 2 mediciones de peso. */
function WeightChart({ measurements }: { measurements: MeasurementRow[] }) {
  const points = measurements
    .filter((m) => m.peso != null)
    .slice()
    .reverse(); // measurements viene desc por fecha; el chart necesita orden cronológico

  if (points.length < 2) {
    return (
      <div className="flex h-40 items-center justify-center rounded-2xl border border-dashed border-white/15 text-center text-xs text-white/35">
        Registra al menos 2 mediciones de peso para ver la evolución.
      </div>
    );
  }

  const weights = points.map((p) => p.peso!);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const range = max - min || 1;
  const w = 640;
  const h = 160;
  const pad = 20;
  const stepX = points.length > 1 ? (w - pad * 2) / (points.length - 1) : 0;

  const coords = points.map((p, i) => {
    const x = pad + i * stepX;
    const y = pad + (1 - (p.peso! - min) / range) * (h - pad * 2);
    return { x, y, peso: p.peso!, fecha: p.fecha };
  });

  const polyline = coords.map((c) => `${c.x},${c.y}`).join(" ");
  const areaPath = `M${coords[0].x},${h - pad} L${coords.map((c) => `${c.x},${c.y}`).join(" L")} L${coords[coords.length - 1].x},${h - pad} Z`;

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wide text-white/40">Evolución del peso</p>
        <p className="text-[11px] text-white/40">
          {new Date(points[0].fecha).toLocaleDateString("es-CO")} — {new Date(points[points.length - 1].fecha).toLocaleDateString("es-CO")}
        </p>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="mt-3 h-40 w-full">
        <path d={areaPath} fill="rgba(0,200,255,0.08)" />
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

type ActivityItem = { date: string; label: string; detail?: string };

function ResumenTab({
  client,
  measurements,
  evaluations,
  routines,
}: {
  client: ClientRow;
  measurements: MeasurementRow[];
  evaluations: EvaluationRow[];
  routines: RoutineRow[];
}) {
  const activity: ActivityItem[] = useMemo(() => {
    const items: ActivityItem[] = [];
    for (const m of measurements) {
      items.push({
        date: m.created_at,
        label: m.peso != null ? `Registró peso: ${m.peso} kg` : "Registró una medición",
        detail: m.notas ?? undefined,
      });
    }
    for (const e of evaluations) {
      items.push({
        date: e.created_at,
        label:
          e.status === "completada"
            ? `Evaluación completada — ${new Date(e.scheduled_at).toLocaleDateString("es-CO")}`
            : `Evaluación agendada para ${new Date(e.scheduled_at).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })}`,
      });
    }
    for (const r of routines) {
      items.push({ date: r.created_at, label: `Rutina creada — ${r.dias_por_semana}x/semana` });
    }
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 8);
  }, [measurements, evaluations, routines]);

  return (
    <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
      <WeightChart measurements={measurements} />

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-white/40">Actividad reciente</p>
        <div className="mt-3 space-y-3">
          {activity.length === 0 && <p className="text-xs text-white/35">Todavía no hay actividad registrada.</p>}
          {activity.map((item, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-hf-blue" />
              <div>
                <p className="text-xs text-white/80">{item.label}</p>
                <p className="mt-0.5 text-[11px] text-white/35">
                  {new Date(item.date).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })}
                  {item.detail ? ` · ${item.detail}` : ""}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {!client.rutina_actual && routines.length === 0 && (
        <div className="rounded-2xl border border-dashed border-white/15 p-4 text-center text-xs text-white/35 lg:col-span-2">
          Este cliente todavía no tiene rutina asignada.{" "}
          <Link href="/panel/entrenamientos" className="font-semibold text-hf-blue hover:underline">
            Crear una en Entrenamientos →
          </Link>
        </div>
      )}
    </div>
  );
}

function ProgresoTab({
  clientId,
  measurements,
  setMeasurements,
}: {
  clientId: string;
  measurements: MeasurementRow[];
  setMeasurements: (m: MeasurementRow[]) => void;
}) {
  const [newWeight, setNewWeight] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [isPending, startTransition] = useTransition();

  function addMeasurement() {
    const peso = newWeight ? parseFloat(newWeight) : null;
    startTransition(async () => {
      await addOwnClientMeasurement(clientId, { peso, notas: newNotes || null });
      setNewWeight("");
      setNewNotes("");
      const rows = await getOwnClientMeasurements(clientId);
      setMeasurements(rows);
    });
  }

  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex flex-wrap gap-2">
        <input
          type="number"
          step="0.1"
          placeholder="Peso (kg)"
          value={newWeight}
          onChange={(e) => setNewWeight(e.target.value)}
          className="w-28 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white outline-none"
        />
        <input
          placeholder="Nota (opcional)"
          value={newNotes}
          onChange={(e) => setNewNotes(e.target.value)}
          className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white outline-none"
        />
        <button
          onClick={addMeasurement}
          disabled={isPending || !newWeight}
          className="flex items-center gap-1 rounded-xl bg-hf-blue px-3 py-2 text-xs font-bold text-black disabled:opacity-40"
        >
          <Plus size={13} /> Agregar
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {measurements.length === 0 && <p className="text-xs text-white/40">Sin mediciones registradas.</p>}
        {measurements.map((m) => (
          <div key={m.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2">
            <span className="text-xs text-white/70">{new Date(m.fecha).toLocaleDateString("es-CO")}</span>
            <span className="text-xs font-semibold text-white">{m.peso != null ? `${m.peso} kg` : "—"}</span>
            {m.notas && <span className="text-[11px] text-white/40">{m.notas}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function EvaluacionesTab({
  clientId,
  evaluations,
  setEvaluations,
}: {
  clientId: string;
  evaluations: EvaluationRow[];
  setEvaluations: (e: EvaluationRow[]) => void;
}) {
  const [newEvalDate, setNewEvalDate] = useState("");
  const [isPending, startTransition] = useTransition();

  function addEvaluation() {
    if (!newEvalDate) return;
    startTransition(async () => {
      await scheduleOwnEvaluation(clientId, new Date(newEvalDate).toISOString());
      setNewEvalDate("");
      const rows = await getOwnClientEvaluations(clientId);
      setEvaluations(rows);
    });
  }

  function markDone(id: string) {
    startTransition(async () => {
      await updateOwnEvaluationStatus(id, "completada");
      const rows = await getOwnClientEvaluations(clientId);
      setEvaluations(rows);
    });
  }

  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex flex-wrap gap-2">
        <input
          type="datetime-local"
          value={newEvalDate}
          onChange={(e) => setNewEvalDate(e.target.value)}
          className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-white outline-none"
        />
        <button
          onClick={addEvaluation}
          disabled={isPending || !newEvalDate}
          className="flex items-center gap-1 rounded-xl bg-hf-blue px-3 py-2 text-xs font-bold text-black disabled:opacity-40"
        >
          <CalendarClock size={13} /> Agendar
        </button>
      </div>

      <div className="mt-4 space-y-2">
        {evaluations.length === 0 && <p className="text-xs text-white/40">Sin evaluaciones agendadas.</p>}
        {evaluations.map((ev) => (
          <div key={ev.id} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2">
            <span className="text-xs text-white/70">
              {new Date(ev.scheduled_at).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })}
            </span>
            <div className="flex items-center gap-2">
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  ev.status === "completada" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                }`}
              >
                {ev.status === "completada" ? "Completada" : "Pendiente"}
              </span>
              {ev.status !== "completada" && (
                <button onClick={() => markDone(ev.id)} className="flex items-center gap-1 text-[11px] font-semibold text-white/50 hover:text-white">
                  <Check size={12} /> Marcar hecha
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RutinaTab({ routines }: { routines: RoutineRow[] }) {
  return (
    <div className="mt-4 space-y-3">
      {routines.length === 0 && (
        <div className="rounded-2xl border border-dashed border-white/15 p-6 text-center text-xs text-white/35">
          Este cliente todavía no tiene rutina.{" "}
          <Link href="/panel/entrenamientos" className="font-semibold text-hf-blue hover:underline">
            Crear una en Entrenamientos →
          </Link>
        </div>
      )}
      {routines.map((r) => (
        <div key={r.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-white">
              <Dumbbell size={15} className="text-emerald-400" />
              {r.dias_por_semana}x/semana
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                r.status === "aprobado"
                  ? "bg-emerald-500/10 text-emerald-400"
                  : r.status === "revisando"
                    ? "bg-amber-500/10 text-amber-400"
                    : "bg-white/10 text-white/60"
              }`}
            >
              {r.status === "aprobado" ? "Aprobada" : r.status === "revisando" ? "En revisión" : "Pendiente"}
            </span>
          </div>
          {r.horario && <p className="mt-1.5 text-xs text-white/50">Horario: {r.horario}</p>}
          {r.resumen_frecuencia && <p className="mt-1 text-xs text-white/50">{r.resumen_frecuencia}</p>}
          <p className="mt-2 text-[11px] text-white/35">
            {r.dias.filter((d) => !d.descanso).length} día(s) de entreno · {r.dias.filter((d) => d.descanso).length} de descanso
          </p>
          <Link href="/panel/entrenamientos" className="mt-3 inline-block text-[11px] font-semibold text-hf-blue hover:underline">
            Ver / editar en Entrenamientos →
          </Link>
        </div>
      ))}
    </div>
  );
}
