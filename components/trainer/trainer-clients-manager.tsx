"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, Search, Trash2, X, MessageCircle, TrendingUp, CalendarClock, Copy, Check, Link2 } from "lucide-react";
import type { TrainerRow } from "@/lib/admin-actions";
import { PLAN_CLIENT_CAP, planLabel } from "@/lib/catalog";
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

type FormState = {
  fullName: string;
  email: string;
  whatsapp: string;
  sexo: string;
  objetivo: string;
  nivel: string;
  actividad: string;
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
  planElegido: "",
  diasPorSemana: "",
  horarioEntreno: "",
  status: "pendiente_evaluacion",
};

function clientToForm(c: ClientRow): FormState {
  return {
    fullName: c.full_name,
    email: c.email ?? "",
    whatsapp: c.whatsapp ?? "",
    sexo: c.sexo ?? "",
    objetivo: c.objetivo ?? "",
    nivel: c.nivel ?? "",
    actividad: c.actividad ?? "",
    planElegido: c.plan_elegido ?? "",
    diasPorSemana: c.dias_por_semana != null ? String(c.dias_por_semana) : "",
    horarioEntreno: c.horario_entreno ?? "",
    status: c.status,
  };
}

export function TrainerClientsManager({ trainer, initialClients }: { trainer: TrainerRow; initialClients: ClientRow[] }) {
  const [clients, setClients] = useState<ClientRow[]>(initialClients);
  const [search, setSearch] = useState("");
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

  function copyRegistrationLink() {
    if (!registrationUrl) return;
    navigator.clipboard.writeText(registrationUrl).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    });
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) => c.full_name.toLowerCase().includes(q) || (c.objetivo ?? "").toLowerCase().includes(q)
    );
  }, [clients, search]);

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
      if (modalMode === "create") {
        const res = await createOwnClient({
          fullName: form.fullName,
          email: form.email,
          whatsapp: form.whatsapp,
          sexo: form.sexo,
          objetivo: form.objetivo,
          nivel: form.nivel,
          actividad: form.actividad,
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
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Clientes</h1>
          <p className="mt-1 text-sm text-white/50">
            {clients.length} / {cap} clientes de tu plan {planLabel(trainer.plan)}.
          </p>
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
          placeholder="Buscar por nombre u objetivo..."
          className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/30"
        />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {filtered.map((c) => {
          const meta = STATUS_META[c.status];
          return (
            <div key={c.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-white">{c.full_name}</p>
                  <p className="mt-0.5 text-xs text-white/40">{c.objetivo || "Sin objetivo definido"}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${meta.className}`}>
                  {meta.label}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-white/40">
                {c.plan_elegido && <span>Plan: {c.plan_elegido}</span>}
                {c.dias_por_semana != null && <span>{c.dias_por_semana}x/semana</span>}
                {c.peso_actual != null && <span>{c.peso_actual} kg</span>}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setDetailClient(c)}
                  className="flex items-center gap-1 rounded-full border border-white/15 px-2.5 py-1 text-[11px] font-semibold text-white/70 hover:border-white/30 hover:text-white"
                >
                  <TrendingUp size={12} /> Progreso
                </button>
                <button
                  onClick={() => openEdit(c)}
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
                  onClick={() => handleDelete(c)}
                  className="ml-auto flex items-center gap-1 rounded-full border border-red-500/20 px-2.5 py-1 text-[11px] font-semibold text-red-400/80 hover:border-red-500/40 hover:text-red-400"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-full rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-white/40">
            {clients.length === 0 ? "Todavía no tienes clientes registrados." : "Ningún cliente coincide con tu búsqueda."}
          </div>
        )}
      </div>

      {modalMode && (
        <ClientFormModal
          mode={modalMode}
          form={form}
          setForm={setForm}
          onCancel={closeModal}
          onSubmit={submitForm}
          isPending={isPending}
          error={error}
        />
      )}

      {detailClient && (
        <ClientDetailModal client={detailClient} onClose={() => setDetailClient(null)} />
      )}
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
}: {
  mode: "create" | "edit";
  form: FormState;
  setForm: (f: FormState) => void;
  onCancel: () => void;
  onSubmit: () => void;
  isPending: boolean;
  error: string | null;
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
          <Field label="Objetivo" span2>
            <input
              value={form.objetivo}
              onChange={(e) => setForm({ ...form, objetivo: e.target.value })}
              placeholder="Ej. Perder grasa, ganar fuerza..."
              className="input"
            />
          </Field>
          <Field label="Plan elegido">
            <input
              value={form.planElegido}
              onChange={(e) => setForm({ ...form, planElegido: e.target.value })}
              className="input"
            />
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
            <input
              value={form.horarioEntreno}
              onChange={(e) => setForm({ ...form, horarioEntreno: e.target.value })}
              className="input"
            />
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
