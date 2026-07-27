"use client";

import { useMemo, useState, useTransition } from "react";
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
} from "lucide-react";
import type { TrainerRow, PlanOfrecido } from "@/lib/admin-actions";
import { PLAN_CLIENT_CAP, planLabel } from "@/lib/catalog";
import { calculateImc } from "@/lib/imc";
import {
  createOwnClient,
  updateOwnClient,
  deleteOwnClient,
  getOwnClients,
  getOwnClientMeasurements,
  addOwnClientMeasurement,
  getOwnClientEvaluations,
  scheduleOwnEvaluation,
  updateOwnEvaluationStatus,
  type ClientRow,
  type ClientStatus,
  type MeasurementRow,
  type EvaluationRow,
} from "@/lib/trainer-clients-actions";

const STATUS_META: Record<ClientStatus, { label: string; className: string }> = {
  pendiente_evaluacion: { label: "Por evaluar", className: "bg-amber-500/10 text-amber-400" },
  activo: { label: "Activo", className: "bg-emerald-500/10 text-emerald-400" },
  pausado: { label: "Pausado", className: "bg-white/10 text-white/60" },
  inactivo: { label: "Inactivo", className: "bg-red-500/10 text-red-400" },
};

const cop = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

const IMC_CATEGORY_CLASS: Record<string, string> = {
  bajo_peso: "bg-sky-500/10 text-sky-400",
  normal: "bg-emerald-500/10 text-emerald-400",
  sobrepeso: "bg-amber-500/10 text-amber-400",
  obesidad: "bg-red-500/10 text-red-400",
};

const STATUS_DOT: Record<ClientStatus, string> = {
  pendiente_evaluacion: "bg-amber-400",
  activo: "bg-emerald-400",
  pausado: "bg-white/40",
  inactivo: "bg-red-400",
};

const AVATAR_COLORS = [
  "bg-sky-500/15 text-sky-300",
  "bg-violet-500/15 text-violet-300",
  "bg-emerald-500/15 text-emerald-300",
  "bg-amber-500/15 text-amber-300",
  "bg-pink-500/15 text-pink-300",
  "bg-hf-blue/15 text-hf-blue",
];

function initials(name: string) {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

function avatarColor(id: string) {
  let sum = 0;
  for (const ch of id) sum += ch.charCodeAt(0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

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

type FormState = {
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
};

const EMPTY_FORM: FormState = {
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
};

// Niveles estándar de actividad diaria (fuera del entreno con el
// entrenador) — misma clasificación que se usa para calcular gasto
// calórico, así queda lista para cuando HAKAI genere rutinas/nutrición.
const ACTIVIDAD_OPTIONS = [
  { value: "sedentario", label: "Sedentario (trabajo de oficina, poco movimiento)" },
  { value: "ligero", label: "Ligero (1-3 días de actividad/semana)" },
  { value: "moderado", label: "Moderado (3-5 días de actividad/semana)" },
  { value: "activo", label: "Activo (6-7 días de actividad/semana)" },
  { value: "muy_activo", label: "Muy activo (trabajo físico o 2 entrenos/día)" },
];

// Mismas franjas horarias que el formulario público de registro — evita
// texto libre en este campo (antes se podía escribir cualquier cosa, ej. "6").
const HORARIOS_ENTRENO = ["5:00 am", "6:00 am", "7:00 am", "12:00 pm", "4:00 pm", "6:00 pm", "7:00 pm"];

function clientToForm(c: ClientRow): FormState {
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
  };
}

type StatusFilter = "todos" | ClientStatus;
type SortBy = "recientes" | "nombre";

export function TrainerClientsManager({
  trainer,
  initialClients,
  nextEvalByClient = {},
  clientIdsWithRoutine = [],
}: {
  trainer: TrainerRow;
  initialClients: ClientRow[];
  nextEvalByClient?: Record<string, string>;
  clientIdsWithRoutine?: string[];
}) {
  const [clients, setClients] = useState<ClientRow[]>(initialClients);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("todos");
  const [sortBy, setSortBy] = useState<SortBy>("recientes");
  const [modalMode, setModalMode] = useState<"create" | "edit" | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [detailClient, setDetailClient] = useState<ClientRow | null>(null);
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

  function submitForm() {
    setError(null);
    startTransition(async () => {
      const diasPorSemana = form.diasPorSemana ? parseInt(form.diasPorSemana, 10) : null;
      const pesoActual = form.pesoActual ? parseFloat(form.pesoActual) : null;
      const altura = form.altura ? parseFloat(form.altura) : null;
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
      if (detailClient?.id === c.id) setDetailClient(null);
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
            onViewDetail={() => setDetailClient(c)}
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
        />
      )}

      {detailClient && (
        <ClientDetailModal client={detailClient} onClose={() => setDetailClient(null)} />
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
  onViewDetail,
  onEdit,
  onDelete,
}: {
  client: ClientRow;
  hasRoutine: boolean;
  nextEvaluation?: string;
  onViewDetail: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const meta = STATUS_META[c.status];
  const imc = calculateImc(c.peso_actual, c.altura);
  const since = new Date(c.created_at).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-white/20">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-3">
          <div className="relative shrink-0">
            <div className={`flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold ${avatarColor(c.id)}`}>
              {initials(c.full_name)}
            </div>
            <span
              className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#0a0d16] ${STATUS_DOT[c.status]}`}
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{c.full_name}</p>
            <p className="mt-0.5 text-xs font-medium text-hf-blue">{c.objetivo || "Sin objetivo definido"}</p>
            <p className="mt-0.5 text-[11px] text-white/35">Cliente desde {since}</p>
          </div>
        </div>
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

      {nextEvaluation ? (
        <div className="mt-3 flex items-center gap-1.5 text-[11px] text-white/50">
          <CalendarClock size={12} className="shrink-0" />
          Próxima evaluación: {new Date(nextEvaluation).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })}
        </div>
      ) : c.status === "pendiente_evaluacion" ? (
        <button
          onClick={onViewDetail}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-xl bg-hf-blue/15 px-3 py-2 text-center text-[11px] font-semibold text-hf-blue hover:bg-hf-blue/25"
        >
          <CalendarClock size={13} /> Agendar evaluación inicial
        </button>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
        <button
          onClick={onViewDetail}
          className="flex items-center gap-1 rounded-full border border-white/15 px-2.5 py-1 text-[11px] font-semibold text-white/70 hover:border-white/30 hover:text-white"
        >
          <TrendingUp size={12} /> Ver perfil
        </button>
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

function ClientFormModal({
  mode,
  form,
  setForm,
  onCancel,
  onSubmit,
  isPending,
  error,
  planesOfrecidos,
}: {
  mode: "create" | "edit";
  form: FormState;
  setForm: (f: FormState) => void;
  onCancel: () => void;
  onSubmit: () => void;
  isPending: boolean;
  error: string | null;
  planesOfrecidos: PlanOfrecido[];
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
        </div>

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

function Field({ label, span2, children }: { label: string; span2?: boolean; children: React.ReactNode }) {
  return (
    <label className={`flex flex-col gap-1 ${span2 ? "sm:col-span-2" : ""}`}>
      <span className="text-[11px] font-semibold text-white/50">{label}</span>
      {children}
    </label>
  );
}

const SEXO_LABELS: Record<string, string> = { femenino: "Femenino", masculino: "Masculino", otro: "Otro" };
const NIVEL_LABELS: Record<string, string> = { principiante: "Principiante", intermedio: "Intermedio", avanzado: "Avanzado" };
const ACTIVIDAD_LABELS: Record<string, string> = Object.fromEntries(
  ACTIVIDAD_OPTIONS.map((a) => [a.value, a.label.split(" (")[0]])
);

/**
 * "Hoja de vida" del cliente — resumen fijo al abrir su ficha, con todo lo
 * que el entrenador necesita ver de un vistazo antes de armarle una rutina:
 * datos físicos, nivel, actividad y objetivo. El IMC se calcula al vuelo
 * con lib/imc.ts a partir de peso_actual/altura (ver ese archivo para por
 * qué es una fórmula y no una llamada a un modelo de IA).
 */
function ClientHojaDeVida({ client }: { client: ClientRow }) {
  const imc = calculateImc(client.peso_actual, client.altura);

  const rows: { label: string; value: string }[] = [
    { label: "Sexo", value: client.sexo ? SEXO_LABELS[client.sexo] ?? client.sexo : "—" },
    { label: "Nivel", value: client.nivel ? NIVEL_LABELS[client.nivel] ?? client.nivel : "—" },
    { label: "Actividad", value: client.actividad ? ACTIVIDAD_LABELS[client.actividad] ?? client.actividad : "—" },
    { label: "Peso", value: client.peso_actual != null ? `${client.peso_actual} kg` : "—" },
    { label: "Estatura", value: client.altura != null ? `${client.altura} cm` : "—" },
    { label: "Plan elegido", value: client.plan_elegido || "—" },
    { label: "Días/semana", value: client.dias_por_semana != null ? String(client.dias_por_semana) : "—" },
    { label: "Horario", value: client.horario_entreno || "—" },
  ];

  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wide text-white/40">Hoja de vida</p>
        {imc && (
          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${IMC_CATEGORY_CLASS[imc.category]}`}>
            IMC {imc.value} · {imc.label}
          </span>
        )}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
        {rows.map((r) => (
          <div key={r.label}>
            <p className="text-[10px] uppercase tracking-wide text-white/30">{r.label}</p>
            <p className="text-xs font-medium text-white/80">{r.value}</p>
          </div>
        ))}
      </div>
      {client.objetivo && (
        <div className="mt-3 border-t border-white/10 pt-3">
          <p className="text-[10px] uppercase tracking-wide text-white/30">Objetivo</p>
          <p className="mt-0.5 text-xs text-white/80">{client.objetivo}</p>
        </div>
      )}
      {!imc && (client.peso_actual == null || client.altura == null) && (
        <p className="mt-3 text-[11px] text-white/30">
          Falta {client.peso_actual == null ? "peso" : "estatura"} para calcular el IMC — agrégalo editando al cliente.
        </p>
      )}
    </div>
  );
}

function ClientDetailModal({ client, onClose }: { client: ClientRow; onClose: () => void }) {
  const [tab, setTab] = useState<"progreso" | "evaluaciones">("progreso");
  const [measurements, setMeasurements] = useState<MeasurementRow[] | null>(null);
  const [evaluations, setEvaluations] = useState<EvaluationRow[] | null>(null);
  const [newWeight, setNewWeight] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newEvalDate, setNewEvalDate] = useState("");
  const [isPending, startTransition] = useTransition();

  useMemo(() => {
    getOwnClientMeasurements(client.id).then(setMeasurements);
    getOwnClientEvaluations(client.id).then(setEvaluations);
  }, [client.id]);

  function addMeasurement() {
    const peso = newWeight ? parseFloat(newWeight) : null;
    startTransition(async () => {
      await addOwnClientMeasurement(client.id, { peso, notas: newNotes || null });
      setNewWeight("");
      setNewNotes("");
      const rows = await getOwnClientMeasurements(client.id);
      setMeasurements(rows);
    });
  }

  function addEvaluation() {
    if (!newEvalDate) return;
    startTransition(async () => {
      await scheduleOwnEvaluation(client.id, new Date(newEvalDate).toISOString());
      setNewEvalDate("");
      const rows = await getOwnClientEvaluations(client.id);
      setEvaluations(rows);
    });
  }

  function markEvalDone(id: string) {
    startTransition(async () => {
      await updateOwnEvaluationStatus(id, "completada");
      const rows = await getOwnClientEvaluations(client.id);
      setEvaluations(rows);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-white/10 bg-[#0a0d16] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-white">{client.full_name}</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <ClientHojaDeVida client={client} />

        <div className="mt-4 flex gap-2">
          <button
            onClick={() => setTab("progreso")}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              tab === "progreso" ? "bg-hf-blue text-black" : "border border-white/15 text-white/60"
            }`}
          >
            Progreso
          </button>
          <button
            onClick={() => setTab("evaluaciones")}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
              tab === "evaluaciones" ? "bg-hf-blue text-black" : "border border-white/15 text-white/60"
            }`}
          >
            Evaluaciones
          </button>
        </div>

        {tab === "progreso" && (
          <div className="mt-4">
            <div className="flex gap-2">
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
                className="rounded-xl bg-hf-blue px-3 py-2 text-xs font-bold text-black disabled:opacity-40"
              >
                Agregar
              </button>
            </div>

            <div className="mt-4 space-y-2">
              {measurements === null && <p className="text-xs text-white/40">Cargando...</p>}
              {measurements?.length === 0 && <p className="text-xs text-white/40">Sin mediciones registradas.</p>}
              {measurements?.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2"
                >
                  <span className="text-xs text-white/70">{new Date(m.fecha).toLocaleDateString("es-CO")}</span>
                  <span className="text-xs font-semibold text-white">{m.peso != null ? `${m.peso} kg` : "—"}</span>
                  {m.notas && <span className="text-[11px] text-white/40">{m.notas}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === "evaluaciones" && (
          <div className="mt-4">
            <div className="flex gap-2">
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
              {evaluations === null && <p className="text-xs text-white/40">Cargando...</p>}
              {evaluations?.length === 0 && <p className="text-xs text-white/40">Sin evaluaciones agendadas.</p>}
              {evaluations?.map((ev) => (
                <div
                  key={ev.id}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2"
                >
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
                      <button
                        onClick={() => markEvalDone(ev.id)}
                        className="text-[11px] font-semibold text-white/50 hover:text-white"
                      >
                        Marcar hecha
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
