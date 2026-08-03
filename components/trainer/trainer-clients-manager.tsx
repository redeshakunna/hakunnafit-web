"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Trash2,
  X,
  MessageCircle,
  TrendingUp,
  CalendarClock,
  Copy,
  Check,
  Link2,
  Users,
  Dumbbell,
  PauseCircle,
  AlertTriangle,
} from "lucide-react";
import type { TrainerRow, PlanOfrecido } from "@/lib/admin-actions";
import { PLAN_CLIENT_CAP, planLabel } from "@/lib/catalog";
import { calculateImc } from "@/lib/imc";
import { daysSinceLastTraining, isInactivityAlert } from "@/lib/training-stats";
import {
  STATUS_META,
  STATUS_DOT,
  IMC_CATEGORY_CLASS,
  initials,
  avatarColor,
  cop,
  ACTIVIDAD_OPTIONS,
  HORARIOS_ENTRENO,
} from "@/lib/client-ui";
import { createOwnClient, updateOwnClient, deleteOwnClient, getOwnClients, type ClientRow, type ClientStatus } from "@/lib/trainer-clients-actions";
import {
  ACCESO_EQUIPO,
  EXPERIENCIA_CROSSFIT,
  EXPERIENCIA_PESAS,
  OBJETIVOS_CARRERA,
  OBJETIVOS_CROSSFIT,
  SUPERFICIES,
  emptyPerfilCrossfit,
  emptyPerfilRunning,
  perfilShapeForBranch,
  type PerfilCrossfit,
  type PerfilRunning,
} from "@/lib/client-profile-types";

/** Se calcula con la fórmula estándar (peso/altura²), no con un modelo de
 * IA — ver lib/imc.ts para la justificación completa. */
function ImcPreview({ pesoKg, alturaCm }: { pesoKg: number | null; alturaCm: number | null }) {
  const imc = calculateImc(pesoKg, alturaCm);
  if (!imc) return null;
  return (
    <div className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold ${IMC_CATEGORY_CLASS[imc.category]}`}>
      IMC {imc.value} — {imc.label}
    </div>
  );
}

export type FormState = {
  fullName: string;
  email: string;
  whatsapp: string;
  sexo: string;
  objetivo: string;
  nivel: string;
  actividad: string;
  pesoActual: string;
  altura: string;
  planElegido: string;
  diasPorSemana: string;
  horarioEntreno: string;
  status: ClientStatus;
  pausadoMotivo: string;
  sesionesContratadas: string;
  perfilRunning: PerfilRunning;
  perfilCrossfit: PerfilCrossfit;
};

export const EMPTY_FORM: FormState = {
  fullName: "",
  email: "",
  whatsapp: "",
  sexo: "",
  objetivo: "",
  nivel: "",
  actividad: "",
  pesoActual: "",
  altura: "",
  planElegido: "",
  diasPorSemana: "",
  horarioEntreno: "",
  status: "pendiente_evaluacion",
  pausadoMotivo: "",
  sesionesContratadas: "",
  perfilRunning: emptyPerfilRunning(),
  perfilCrossfit: emptyPerfilCrossfit(),
};

export function clientToForm(c: ClientRow): FormState {
  const rama = c.perfil_deportivo && "objetivoCarrera" in c.perfil_deportivo ? "running" : c.perfil_deportivo && "experienciaCrossfit" in c.perfil_deportivo ? "crossfit" : null;
  return {
    fullName: c.full_name,
    email: c.email ?? "",
    whatsapp: c.whatsapp ?? "",
    sexo: c.sexo ?? "",
    objetivo: c.objetivo ?? "",
    nivel: c.nivel ?? "",
    actividad: c.actividad ?? "",
    pesoActual: c.peso_actual != null ? String(c.peso_actual) : "",
    altura: c.altura != null ? String(c.altura) : "",
    planElegido: c.plan_elegido ?? "",
    diasPorSemana: c.dias_por_semana != null ? String(c.dias_por_semana) : "",
    horarioEntreno: c.horario_entreno ?? "",
    status: c.status,
    pausadoMotivo: c.pausado_motivo ?? "",
    sesionesContratadas: c.sesiones_contratadas != null ? String(c.sesiones_contratadas) : "",
    perfilRunning: rama === "running" ? (c.perfil_deportivo as PerfilRunning) : emptyPerfilRunning(),
    perfilCrossfit: rama === "crossfit" ? (c.perfil_deportivo as PerfilCrossfit) : emptyPerfilCrossfit(),
  };
}

type StatusFilter = "todos" | ClientStatus;
type SortBy = "recientes" | "nombre";

export function TrainerClientsManager({
  trainer,
  initialClients,
  nextEvalByClient = {},
  clientIdsWithRoutine = [],
  lastTrainingByClient = {},
}: {
  trainer: TrainerRow;
  initialClients: ClientRow[];
  nextEvalByClient?: Record<string, string>;
  clientIdsWithRoutine?: string[];
  lastTrainingByClient?: Record<string, string>;
}) {
  const [clients, setClients] = useState<ClientRow[]>(initialClients);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos");
  const [sortBy, setSortBy] = useState<SortBy>("recientes");
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [linkCopied, setLinkCopied] = useState(false);

  const cap = PLAN_CLIENT_CAP[trainer.plan ?? "starter"];
  const atCap = clients.length >= cap;
  const registrationUrl = trainer.subdominio ? `https://${trainer.subdominio}.hakunnafit.com/registro` : null;
  const routineSet = useMemo(() => new Set(clientIdsWithRoutine), [clientIdsWithRoutine]);

  function copyRegistrationLink() {
    if (!registrationUrl) return;
    navigator.clipboard.writeText(registrationUrl).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  }

  const counts = useMemo(
    () => ({
      todos: clients.length,
      activo: clients.filter((c) => c.status === "activo").length,
      pendiente_evaluacion: clients.filter((c) => c.status === "pendiente_evaluacion").length,
      pausado: clients.filter((c) => c.status === "pausado").length,
      inactivo: clients.filter((c) => c.status === "inactivo").length,
    }),
    [clients]
  );
  const withRoutineCount = useMemo(() => clients.filter((c) => routineSet.has(c.id)).length, [clients, routineSet]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let rows = clients.filter((c) => {
      const matchesSearch =
        !q ||
        c.full_name.toLowerCase().includes(q) ||
        (c.objetivo ?? "").toLowerCase().includes(q) ||
        (c.email ?? "").toLowerCase().includes(q);
      const matchesStatus = statusFilter === "todos" || c.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
    if (sortBy === "nombre") rows = [...rows].sort((a, b) => a.full_name.localeCompare(b.full_name));
    return rows;
  }, [clients, search, statusFilter, sortBy]);

  async function refresh() {
    const rows = await getOwnClients();
    setClients(rows);
  }

  function openCreate() {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setModalMode("create");
    setError(null);
  }

  function openEdit(c: ClientRow) {
    setForm(clientToForm(c));
    setEditingId(c.id);
    setModalMode("edit");
    setError(null);
  }

  function closeModal() {
    setModalMode(null);
    setEditingId(null);
    setError(null);
  }

  const rama = perfilShapeForBranch(trainer.especialidad);

  function submitForm() {
    setError(null);
    startTransition(async () => {
      const diasPorSemana = form.diasPorSemana ? parseInt(form.diasPorSemana, 10) : null;
      const pesoActual = form.pesoActual ? parseFloat(form.pesoActual) : null;
      const altura = form.altura ? parseFloat(form.altura) : null;
      const perfilDeportivo = rama === "running" ? form.perfilRunning : rama === "crossfit" ? form.perfilCrossfit : null;
      const sesionesContratadas = form.sesionesContratadas ? parseInt(form.sesionesContratadas, 10) : null;
      if (modalMode === "create") {
        const res = await createOwnClient({
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
          perfilDeportivo,
          sesionesContratadas,
        });
        if (!res.ok) return setError(res.error ?? "No se pudo crear el cliente.");
      } else if (modalMode === "edit" && editingId) {
        const res = await updateOwnClient(editingId, {
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
          pausadoMotivo: form.pausadoMotivo,
          perfilDeportivo,
          sesionesContratadas,
        });
        if (!res.ok) return setError(res.error ?? "No se pudo guardar.");
      }
      await refresh();
      closeModal();
    });
  }

  function handleDelete(c: ClientRow) {
    if (!confirm(`¿Eliminar a ${c.full_name}? Esto borra también su historial de progreso y evaluaciones.`)) return;
    startTransition(async () => {
      await deleteOwnClient(c.id);
      await refresh();
    });
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Clientes</h1>
          <p className="mt-1 text-sm text-white/50">Gestiona y da seguimiento a todos tus clientes.</p>
        </div>
        <button
          onClick={openCreate}
          disabled={atCap}
          title={atCap ? `Llegaste al límite de ${cap} clientes de tu plan` : undefined}
          className="flex items-center gap-1.5 rounded-full bg-hf-blue px-4 py-2 text-xs font-bold text-black disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus size={14} /> Nuevo cliente
        </button>
      </div>

      {atCap && (
        <p className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-400">
          Llegaste al límite de clientes de tu plan. Sube de plan desde Mi Negocio para agregar más.
        </p>
      )}

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          icon={Users}
          accent="text-hf-blue"
          label="Clientes activos"
          value={`${counts.activo} / ${cap}`}
          progress={cap > 0 ? Math.min(100, (counts.activo / cap) * 100) : 0}
          hint={`${cap > 0 ? Math.round((counts.activo / cap) * 100) : 0}% de tu plan ${planLabel(trainer.plan)}`}
        />
        <KpiCard
          icon={CalendarClock}
          accent="text-amber-400"
          label="Por evaluar"
          value={String(counts.pendiente_evaluacion)}
          hint="Esperando evaluación inicial"
        />
        <KpiCard
          icon={Dumbbell}
          accent="text-emerald-400"
          label="Con rutina asignada"
          value={`${withRoutineCount} / ${clients.length}`}
          hint="de tus clientes"
        />
        <KpiCard
          icon={PauseCircle}
          accent="text-white/60"
          label="En pausa"
          value={String(counts.pausado)}
          hint="Retoman cuando quieran"
        />
      </div>

      {registrationUrl && (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-hf-blue/10 text-hf-blue">
              <Link2 size={14} />
            </span>
            <div>
              <p className="text-xs font-semibold text-white">Comparte tu link de registro</p>
              <p className="text-xs text-white/50">
                Mándaselo por WhatsApp a un cliente puntual para que llene sus datos antes de su evaluación.
              </p>
            </div>
          </div>
          <button
            onClick={copyRegistrationLink}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/5"
          >
            {linkCopied ? (
              <>
                <Check size={13} className="text-emerald-400" /> Copiado
              </>
            ) : (
              <>
                <Copy size={13} /> Copiar link
              </>
            )}
          </button>
        </div>
      )}

      <div className="mt-5 flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
        <Search size={15} className="text-white/40" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, objetivo o correo..."
          className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/30"
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <FilterTab label="Todos" count={counts.todos} active={statusFilter === "todos"} onClick={() => setStatusFilter("todos")} />
          <FilterTab
            label="Activos"
            count={counts.activo}
            dot="bg-emerald-400"
            active={statusFilter === "activo"}
            onClick={() => setStatusFilter("activo")}
          />
          <FilterTab
            label="Por evaluar"
            count={counts.pendiente_evaluacion}
            dot="bg-amber-400"
            active={statusFilter === "pendiente_evaluacion"}
            onClick={() => setStatusFilter("pendiente_evaluacion")}
          />
          <FilterTab
            label="En pausa"
            count={counts.pausado}
            dot="bg-white/40"
            active={statusFilter === "pausado"}
            onClick={() => setStatusFilter("pausado")}
          />
          <FilterTab
            label="Inactivos"
            count={counts.inactivo}
            dot="bg-red-400"
            active={statusFilter === "inactivo"}
            onClick={() => setStatusFilter("inactivo")}
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortBy)}
          className="rounded-full border border-white/15 bg-white/[0.03] px-3 py-1.5 text-xs font-semibold text-white/70 outline-none"
        >
          <option value="recientes" className="bg-hf-black">
            Más recientes
          </option>
          <option value="nombre" className="bg-hf-black">
            Nombre (A-Z)
          </option>
        </select>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((c) => (
          <ClientCard
            key={c.id}
            client={c}
            hasRoutine={routineSet.has(c.id)}
            nextEvaluation={nextEvalByClient[c.id]}
            lastTraining={lastTrainingByClient[c.id]}
            onEdit={() => openEdit(c)}
            onDelete={() => handleDelete(c)}
          />
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-white/40">
            {clients.length === 0 ? "Todavía no tienes clientes registrados." : "Ningún cliente coincide con tu búsqueda o filtro."}
          </div>
        )}
      </div>

      <p className="mt-3 text-center text-[11px] text-white/30">
        Mostrando {filtered.length} de {clients.length} clientes
      </p>

      {modalMode && (
        <ClientFormModal
          mode={modalMode}
          form={form}
          setForm={setForm}
          onCancel={closeModal}
          onSubmit={submitForm}
          isPending={isPending}
          error={error}
          planesOfrecidos={trainer.planes_ofrecidos}
          rama={rama}
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
  progress,
}: {
  icon: React.ElementType;
  accent: string;
  label: string;
  value: string;
  hint?: string;
  progress?: number;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center gap-2">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/5 ${accent}`}>
          <Icon size={16} />
        </span>
        <p className="text-xs font-medium text-white/60">{label}</p>
      </div>
      <p className="mt-3 text-xl font-bold text-white sm:text-2xl">{value}</p>
      {progress != null && (
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-hf-blue" style={{ width: `${progress}%` }} />
        </div>
      )}
      {hint && <p className="mt-1.5 text-[11px] text-white/40">{hint}</p>}
    </div>
  );
}

function FilterTab({
  label,
  count,
  active,
  onClick,
  dot,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  dot?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${
        active ? "border-hf-blue bg-hf-blue/15 text-white" : "border-white/10 text-white/50 hover:border-white/25 hover:text-white"
      }`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />}
      {label}
      <span className="text-white/40">{count}</span>
    </button>
  );
}

function ClientCard({
  client: c,
  hasRoutine,
  nextEvaluation,
  lastTraining,
  onEdit,
  onDelete,
}: {
  client: ClientRow;
  hasRoutine: boolean;
  nextEvaluation?: string;
  lastTraining?: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const meta = STATUS_META[c.status];
  const imc = calculateImc(c.peso_actual, c.altura);
  const daysSinceTraining = daysSinceLastTraining(lastTraining ? [lastTraining] : []);
  const inactivityAlert = c.status === "activo" && isInactivityAlert(daysSinceTraining, c.dias_por_semana);
  const since = new Date(c.created_at).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-white/20">
      <div className="flex items-start justify-between gap-2">
        <Link href={`/panel/clientes/${c.id}`} className="flex items-start gap-3">
          <div className="relative shrink-0">
            <div className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold ${avatarColor(c.id)}`}>
              {initials(c.full_name)}
            </div>
            <span
              className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#0a0d16] ${STATUS_DOT[c.status]}`}
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-white hover:underline">{c.full_name}</p>
            <p className="mt-0.5 text-xs font-medium text-hf-blue">{c.objetivo || "Sin objetivo definido"}</p>
            <p className="mt-0.5 text-[11px] text-white/35">Cliente desde {since}</p>
          </div>
        </Link>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.className}`}>{meta.label}</span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2">
          <p className="text-sm font-bold text-white">{c.peso_actual != null ? `${c.peso_actual} kg` : "—"}</p>
          <p className="text-[10px] uppercase tracking-wide text-white/35">Peso actual</p>
        </div>
        <div className={`rounded-xl border border-white/10 px-3 py-2 ${imc ? IMC_CATEGORY_CLASS[imc.category] : "bg-white/[0.02]"}`}>
          <p className="text-sm font-bold text-white">{imc ? imc.value : "—"}</p>
          <p className="text-[10px] uppercase tracking-wide text-white/50">{imc ? imc.label : "IMC"}</p>
        </div>
      </div>

      {(c.plan_elegido || c.dias_por_semana != null || c.horario_entreno) && (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-white/40">
          {c.plan_elegido && <span>Plan: {c.plan_elegido}</span>}
          {c.dias_por_semana != null && <span>{c.dias_por_semana}x/semana</span>}
          {c.horario_entreno && <span>{c.horario_entreno}</span>}
        </div>
      )}

      <div className="mt-3 flex items-center gap-1.5 text-[11px] font-medium">
        <Dumbbell size={12} className={hasRoutine ? "text-emerald-400" : "text-white/25"} />
        <span className={hasRoutine ? "text-white/70" : "text-white/35"}>
          {hasRoutine ? "Rutina asignada" : "Sin rutina asignada"}
        </span>
      </div>

      {c.status === "pausado" ? (
        <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-[11px]">
          <p className="font-semibold text-white/70">
            En pausa{c.pausado_en ? ` desde ${new Date(c.pausado_en).toLocaleDateString("es-CO")}` : ""}
          </p>
          {c.pausado_motivo && <p className="mt-0.5 text-white/40">{c.pausado_motivo}</p>}
        </div>
      ) : inactivityAlert ? (
        <div className="mt-3 flex items-center gap-1.5 rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2 text-[11px] font-semibold text-red-400">
          <AlertTriangle size={12} className="shrink-0" />
          No entrena hace {daysSinceTraining} días
        </div>
      ) : nextEvaluation ? (
        <div className="mt-3 flex items-center gap-1.5 text-[11px] text-white/50">
          <CalendarClock size={12} className="shrink-0" />
          Próxima evaluación: {new Date(nextEvaluation).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })}
        </div>
      ) : c.status === "pendiente_evaluacion" ? (
        <Link
          href={`/panel/clientes/${c.id}?tab=evaluaciones`}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-hf-blue/15 px-3 py-2 text-center text-[11px] font-semibold text-hf-blue hover:bg-hf-blue/25"
        >
          <CalendarClock size={13} /> Agendar evaluación inicial
        </Link>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
        <Link
          href={`/panel/clientes/${c.id}`}
          className="flex items-center gap-1 rounded-full border border-white/15 px-2.5 py-1 text-[11px] font-semibold text-white/70 hover:border-white/30 hover:text-white"
        >
          <TrendingUp size={12} /> Ver perfil
        </Link>
        <button
          onClick={onEdit}
          className="rounded-full border border-white/15 px-2.5 py-1 text-[11px] font-semibold text-white/70 hover:border-white/30 hover:text-white"
        >
          Editar
        </button>
        {c.whatsapp && (
          <a
            href={`https://wa.me/${c.whatsapp.replace(/\D/g, "")}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 rounded-full border border-white/15 px-2.5 py-1 text-[11px] font-semibold text-white/70 hover:border-white/30 hover:text-white"
          >
            <MessageCircle size={12} /> WhatsApp
          </a>
        )}
        <button
          onClick={onDelete}
          className="ml-auto flex items-center gap-1 rounded-full border border-red-500/20 px-2.5 py-1 text-[11px] font-semibold text-red-400/80 hover:border-red-500/40 hover:text-red-400"
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  );
}

export function ClientFormModal({
  mode,
  form,
  setForm,
  onCancel,
  onSubmit,
  isPending,
  error,
  planesOfrecidos,
  rama = null,
}: {
  mode: "create" | "edit";
  form: FormState;
  setForm: (f: FormState) => void;
  onCancel: () => void;
  onSubmit: () => void;
  isPending: boolean;
  error: string | null;
  planesOfrecidos: PlanOfrecido[];
  rama?: "running" | "crossfit" | null;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onCancel}>
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-[#0a0d16] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">{mode === "create" ? "Nuevo cliente" : "Editar cliente"}</h2>
          <button onClick={onCancel} className="text-white/40 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <ClientFormFields form={form} setForm={setForm} planesOfrecidos={planesOfrecidos} rama={rama} />

        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold text-white/70 hover:border-white/30"
          >
            Cancelar
          </button>
          <button
            onClick={onSubmit}
            disabled={isPending || !form.fullName.trim()}
            className="rounded-full bg-hf-blue px-4 py-2 text-xs font-bold text-black disabled:opacity-40"
          >
            {isPending ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Grid de campos del formulario de cliente — extraído de ClientFormModal
 * para poder reusarse también en edición en línea (sin ventana emergente),
 * ver components/trainer/trainer-client-detail.tsx. Mismo form/setForm que
 * usa el modal, así ambos lugares comparten una sola fuente de verdad de
 * qué campos existen y cómo se validan/envían (ver submitEdit).
 */
export function ClientFormFields({
  form,
  setForm,
  planesOfrecidos,
  rama = null,
}: {
  form: FormState;
  setForm: (f: FormState) => void;
  planesOfrecidos: PlanOfrecido[];
  rama?: "running" | "crossfit" | null;
}) {
  return (
    <>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Nombre completo *" span2>
            <input
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              className="input"
            />
          </Field>
          <Field label="Correo">
            <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="input" />
          </Field>
          <Field label="WhatsApp">
            <input
              value={form.whatsapp}
              onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
              className="input"
            />
          </Field>
          <Field label="Sexo">
            <select value={form.sexo} onChange={(e) => setForm({ ...form, sexo: e.target.value })} className="input">
              <option value="">—</option>
              <option value="femenino">Femenino</option>
              <option value="masculino">Masculino</option>
              <option value="otro">Otro</option>
            </select>
          </Field>
          <Field label="Nivel">
            <select value={form.nivel} onChange={(e) => setForm({ ...form, nivel: e.target.value })} className="input">
              <option value="">—</option>
              <option value="principiante">Principiante</option>
              <option value="intermedio">Intermedio</option>
              <option value="avanzado">Avanzado</option>
            </select>
          </Field>
          <Field label="Actividad diaria" span2>
            <select
              value={form.actividad}
              onChange={(e) => setForm({ ...form, actividad: e.target.value })}
              className="input"
            >
              <option value="">—</option>
              {ACTIVIDAD_OPTIONS.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Peso (kg)">
            <input
              type="number"
              step="0.1"
              min={0}
              value={form.pesoActual}
              onChange={(e) => setForm({ ...form, pesoActual: e.target.value })}
              className="input"
            />
          </Field>
          <Field label="Estatura (cm)">
            <input
              type="number"
              step="0.1"
              min={0}
              value={form.altura}
              onChange={(e) => setForm({ ...form, altura: e.target.value })}
              className="input"
            />
          </Field>
          {form.pesoActual && form.altura && (
            <div className="col-span-full -mt-1">
              <ImcPreview pesoKg={parseFloat(form.pesoActual)} alturaCm={parseFloat(form.altura)} />
            </div>
          )}
          <Field label="Objetivo" span2>
            <input
              value={form.objetivo}
              onChange={(e) => setForm({ ...form, objetivo: e.target.value })}
              placeholder="Ej. Perder grasa, ganar fuerza..."
              className="input"
            />
          </Field>
          <Field label="Plan elegido">
            {planesOfrecidos.length > 0 ? (
              <select
                value={form.planElegido}
                onChange={(e) => setForm({ ...form, planElegido: e.target.value })}
                className="input"
              >
                <option value="">—</option>
                {planesOfrecidos.map((p) => (
                  <option key={p.nombre} value={p.nombre}>
                    {p.nombre} ({p.precioCop != null ? cop.format(p.precioCop) : "Personalizado"})
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={form.planElegido}
                onChange={(e) => setForm({ ...form, planElegido: e.target.value })}
                placeholder="Aún no tienes planes en Mi Negocio"
                className="input"
              />
            )}
          </Field>
          <Field label="Días por semana">
            <input
              type="number"
              min={0}
              max={7}
              value={form.diasPorSemana}
              onChange={(e) => setForm({ ...form, diasPorSemana: e.target.value })}
              className="input"
            />
          </Field>
          <Field label="Sesiones contratadas (opcional)">
            <input
              type="number"
              min={0}
              value={form.sesionesContratadas}
              onChange={(e) => setForm({ ...form, sesionesContratadas: e.target.value })}
              placeholder="Ej. 24"
              className="input"
            />
          </Field>
          <Field label="Horario de entreno" span2>
            <select
              value={form.horarioEntreno}
              onChange={(e) => setForm({ ...form, horarioEntreno: e.target.value })}
              className="input"
            >
              <option value="">Selecciona un horario</option>
              {HORARIOS_ENTRENO.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Estado" span2>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as ClientStatus })}
              className="input"
            >
              {Object.entries(STATUS_META).map(([key, meta]) => (
                <option key={key} value={key}>
                  {meta.label}
                </option>
              ))}
            </select>
          </Field>
          {form.status === "pausado" && (
            <Field label="Motivo de la pausa" span2>
              <input
                value={form.pausadoMotivo}
                onChange={(e) => setForm({ ...form, pausadoMotivo: e.target.value })}
                placeholder="Ej. Vacaciones, lesión, viaje..."
                className="input"
              />
            </Field>
          )}

          {rama === "running" && (
            <>
              <p className="col-span-full mt-1 text-[11px] font-semibold uppercase tracking-wide text-white/40">Sobre su running</p>
              <Field label="Objetivo de carrera">
                <select
                  value={form.perfilRunning.objetivoCarrera ?? ""}
                  onChange={(e) => setForm({ ...form, perfilRunning: { ...form.perfilRunning, objetivoCarrera: e.target.value || null } })}
                  className="input"
                >
                  <option value="">—</option>
                  {OBJETIVOS_CARRERA.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Fecha de carrera objetivo">
                <input
                  type="date"
                  value={form.perfilRunning.fechaCarreraObjetivo ?? ""}
                  onChange={(e) => setForm({ ...form, perfilRunning: { ...form.perfilRunning, fechaCarreraObjetivo: e.target.value || null } })}
                  className="input"
                />
              </Field>
              <Field label="Mejor marca">
                <input
                  value={form.perfilRunning.mejorMarca ?? ""}
                  onChange={(e) => setForm({ ...form, perfilRunning: { ...form.perfilRunning, mejorMarca: e.target.value || null } })}
                  placeholder="Ej. 10K en 52:30"
                  className="input"
                />
              </Field>
              <Field label="Kilometraje semanal">
                <input
                  type="number"
                  min={0}
                  value={form.perfilRunning.kilometrajeSemanal ?? ""}
                  onChange={(e) => setForm({ ...form, perfilRunning: { ...form.perfilRunning, kilometrajeSemanal: e.target.value ? Number(e.target.value) : null } })}
                  className="input"
                />
              </Field>
              <Field label="Ritmo objetivo">
                <input
                  value={form.perfilRunning.ritmoObjetivo ?? ""}
                  onChange={(e) => setForm({ ...form, perfilRunning: { ...form.perfilRunning, ritmoObjetivo: e.target.value || null } })}
                  placeholder="Ej. 5:30 min/km"
                  className="input"
                />
              </Field>
              <Field label="Superficie habitual">
                <select
                  value={form.perfilRunning.superficieHabitual ?? ""}
                  onChange={(e) => setForm({ ...form, perfilRunning: { ...form.perfilRunning, superficieHabitual: e.target.value || null } })}
                  className="input"
                >
                  <option value="">—</option>
                  {SUPERFICIES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Años corriendo">
                <input
                  type="number"
                  min={0}
                  value={form.perfilRunning.experienciaAnios ?? ""}
                  onChange={(e) => setForm({ ...form, perfilRunning: { ...form.perfilRunning, experienciaAnios: e.target.value ? Number(e.target.value) : null } })}
                  className="input"
                />
              </Field>
              <Field label="Lesiones o molestias" span2>
                <input
                  value={form.perfilRunning.lesiones ?? ""}
                  onChange={(e) => setForm({ ...form, perfilRunning: { ...form.perfilRunning, lesiones: e.target.value || null } })}
                  className="input"
                />
              </Field>
            </>
          )}

          {rama === "crossfit" && (
            <>
              <p className="col-span-full mt-1 text-[11px] font-semibold uppercase tracking-wide text-white/40">Sobre su crossfit</p>
              <Field label="Experiencia en crossfit">
                <select
                  value={form.perfilCrossfit.experienciaCrossfit ?? ""}
                  onChange={(e) => setForm({ ...form, perfilCrossfit: { ...form.perfilCrossfit, experienciaCrossfit: e.target.value || null } })}
                  className="input"
                >
                  <option value="">—</option>
                  {EXPERIENCIA_CROSSFIT.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Experiencia con pesas">
                <select
                  value={form.perfilCrossfit.experienciaPesas ?? ""}
                  onChange={(e) => setForm({ ...form, perfilCrossfit: { ...form.perfilCrossfit, experienciaPesas: e.target.value || null } })}
                  className="input"
                >
                  <option value="">—</option>
                  {EXPERIENCIA_PESAS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Objetivo" span2>
                <select
                  value={form.perfilCrossfit.objetivoCrossfit ?? ""}
                  onChange={(e) => setForm({ ...form, perfilCrossfit: { ...form.perfilCrossfit, objetivoCrossfit: e.target.value || null } })}
                  className="input"
                >
                  <option value="">—</option>
                  {OBJETIVOS_CROSSFIT.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Marcas actuales (benchmarks)" span2>
                <input
                  value={form.perfilCrossfit.benchmarks ?? ""}
                  onChange={(e) => setForm({ ...form, perfilCrossfit: { ...form.perfilCrossfit, benchmarks: e.target.value || null } })}
                  placeholder="Ej. Back Squat 80kg, Deadlift 100kg..."
                  className="input"
                />
              </Field>
              <Field label="Acceso a equipo">
                <select
                  value={form.perfilCrossfit.accesoEquipo ?? ""}
                  onChange={(e) => setForm({ ...form, perfilCrossfit: { ...form.perfilCrossfit, accesoEquipo: e.target.value || null } })}
                  className="input"
                >
                  <option value="">—</option>
                  {ACCESO_EQUIPO.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Limitaciones de movilidad">
                <input
                  value={form.perfilCrossfit.limitaciones ?? ""}
                  onChange={(e) => setForm({ ...form, perfilCrossfit: { ...form.perfilCrossfit, limitaciones: e.target.value || null } })}
                  className="input"
                />
              </Field>
            </>
          )}
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
    </>
  );
}

function Field({ label, span2, children }: { label: string; span2?: boolean; children: React.ReactNode }) {
  return (
    <label className={`flex flex-col gap-1 ${span2 ? "sm:col-span-2" : ""}`}>
      <span className="text-[11px] font-semibold text-white/50">{label}</span>
      {children}
    </label>
  );
}

