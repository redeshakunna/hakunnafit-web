"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { Plus, Trash2, X, Dumbbell, Moon, Library, ArrowLeft, ImageOff } from "lucide-react";
import type { TrainerRow } from "@/lib/admin-actions";
import type { ClientRow } from "@/lib/trainer-clients-actions";
import {
  getOwnClientRoutines,
  createOwnRoutine,
  updateOwnRoutine,
  deleteOwnRoutine,
  searchExercises,
  getExercisesByIds,
  type RoutineRow,
  type ExerciseRow,
} from "@/lib/trainer-routines-actions";
import {
  emptyRoutineDay,
  emptyExerciseBlock,
  resolveBlockKind,
  blockKindOf,
  categoriesForBlockKind,
  WOD_FORMATOS,
  DIAS_SEMANA,
  MUSCLE_GROUP_LABELS,
  EQUIPMENT_LABELS,
  MUSCLE_GROUP_OPTIONS,
  EQUIPMENT_OPTIONS,
  type RoutineDias,
  type RoutineDay,
  type RoutineExerciseBlock,
  type RoutineBlockKind,
  type FuerzaBlock,
  type RunningBlock,
  type CrossfitBlock,
} from "@/lib/routine-types";
import { HORARIOS_ENTRENO } from "@/lib/client-ui";

const BLOCK_KIND_LABELS: Record<RoutineBlockKind, string> = {
  fuerza: "series, repeticiones y descansos",
  running: "distancia, ritmo y zona de frecuencia cardiaca",
  crossfit: "formato de WOD, rondas y movimientos",
};

export function TrainerRoutinesManager({ trainer, clients }: { trainer: TrainerRow; clients: ClientRow[] }) {
  const kind = resolveBlockKind(trainer.especialidad);
  const [selectedClientId, setSelectedClientId] = useState<string>(clients[0]?.id ?? "");
  const [routines, setRoutines] = useState<RoutineRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<RoutineRow | "new" | null>(null);
  const [isPending, startTransition] = useTransition();

  const selectedClient = clients.find((c) => c.id === selectedClientId) ?? null;

  useEffect(() => {
    if (!selectedClientId) {
      setRoutines([]);
      return;
    }
    setLoading(true);
    getOwnClientRoutines(selectedClientId)
      .then(setRoutines)
      .finally(() => setLoading(false));
  }, [selectedClientId]);

  async function refresh() {
    if (!selectedClientId) return;
    const rows = await getOwnClientRoutines(selectedClientId);
    setRoutines(rows);
  }

  function handleDelete(r: RoutineRow) {
    if (!confirm("¿Eliminar esta rutina?")) return;
    startTransition(async () => {
      await deleteOwnRoutine(r.id);
      await refresh();
    });
  }

  if (clients.length === 0) {
    return (
      <div className="mx-auto max-w-md rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-white/40">
        Primero necesitas registrar al menos un cliente en el módulo Clientes para poder armarle una rutina.
      </div>
    );
  }

  // "Nueva rutina"/"Editar rutina" ocupa toda la pantalla (reemplaza la
  // lista) en vez de abrirse encima como ventana emergente — mismo patrón
  // de edición en línea que ya usa la ficha del cliente (ver
  // trainer-client-detail.tsx).
  if (editing && selectedClientId) {
    return (
      <RoutineEditorScreen
        kind={kind}
        clientId={selectedClientId}
        clientName={selectedClient?.full_name ?? ""}
        routine={editing === "new" ? null : editing}
        onClose={() => setEditing(null)}
        onSaved={async () => {
          setEditing(null);
          await refresh();
        }}
      />
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-xl font-bold text-white">Entrenamientos</h1>
      <p className="mt-1 text-sm text-white/50">Rutinas manuales por cliente — {BLOCK_KIND_LABELS[kind]}.</p>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
          <span className="text-xs text-white/40">Cliente</span>
          <select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            className="bg-transparent text-sm font-medium text-white outline-none"
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id} className="bg-[#0a0d16]">
                {c.full_name}
              </option>
            ))}
          </select>
        </label>

        <button
          onClick={() => setEditing("new")}
          className="flex items-center gap-1.5 rounded-full bg-hf-blue px-4 py-2 text-xs font-bold text-black"
        >
          <Plus size={14} /> Nueva rutina
        </button>
      </div>

      <div className="mt-4 space-y-3">
        {loading && <p className="text-xs text-white/40">Cargando...</p>}
        {!loading && routines.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-white/40">
            {selectedClient?.full_name ?? "Este cliente"} todavía no tiene rutinas. Crea la primera.
          </div>
        )}
        {routines.map((r) => (
          <div key={r.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-white">
                  {r.dias_por_semana} días/semana · {r.horario}
                </p>
                {r.resumen_frecuencia && <p className="mt-0.5 text-xs text-white/40">{r.resumen_frecuencia}</p>}
              </div>
              <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                {r.dias.filter((d) => !d.descanso).length} días de entreno
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {r.dias.map((d, i) => (
                <span
                  key={i}
                  className={`rounded-full px-2.5 py-1 text-[11px] ${
                    d.descanso ? "bg-white/5 text-white/30" : "bg-white/5 text-white/70"
                  }`}
                >
                  {d.nombre}
                </span>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => setEditing(r)}
                className="rounded-full border border-white/15 px-3 py-1.5 text-[11px] font-semibold text-white/70 hover:border-white/30 hover:text-white"
              >
                Editar
              </button>
              <button
                onClick={() => handleDelete(r)}
                disabled={isPending}
                className="flex items-center gap-1 rounded-full border border-red-500/20 px-3 py-1.5 text-[11px] font-semibold text-red-400/80 hover:border-red-500/40 hover:text-red-400"
              >
                <Trash2 size={11} /> Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RoutineEditorScreen({
  kind,
  clientId,
  clientName,
  routine,
  onClose,
  onSaved,
}: {
  kind: RoutineBlockKind;
  clientId: string;
  clientName: string;
  routine: RoutineRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [diasPorSemana, setDiasPorSemana] = useState(routine?.dias_por_semana ?? 3);
  const [horario, setHorario] = useState(routine?.horario ?? "");
  const [resumenFrecuencia, setResumenFrecuencia] = useState(routine?.resumen_frecuencia ?? "");
  const [notaPerfil, setNotaPerfil] = useState(routine?.nota_perfil ?? "");
  const [dias, setDias] = useState<RoutineDias>(
    routine?.dias?.length ? routine.dias : [emptyRoutineDay(1), emptyRoutineDay(2), emptyRoutineDay(3)]
  );
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function addDay() {
    setDias([...dias, emptyRoutineDay(dias.length + 1)]);
  }

  function removeDay(index: number) {
    setDias(dias.filter((_, i) => i !== index));
  }

  function updateDay(index: number, patch: Partial<RoutineDay>) {
    setDias(dias.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  }

  function addBlock(dayIndex: number) {
    updateDay(dayIndex, { bloques: [...dias[dayIndex].bloques, emptyExerciseBlock(kind)] });
  }

  function removeBlock(dayIndex: number, blockIndex: number) {
    updateDay(dayIndex, { bloques: dias[dayIndex].bloques.filter((_, i) => i !== blockIndex) });
  }

  function updateBlock(dayIndex: number, blockIndex: number, patch: Partial<RoutineExerciseBlock>) {
    const bloques = dias[dayIndex].bloques.map((b, i) => (i === blockIndex ? ({ ...b, ...patch } as RoutineExerciseBlock) : b));
    updateDay(dayIndex, { bloques });
  }

  function submit() {
    setError(null);
    if (!horario.trim()) return setError("Indica el horario habitual de entreno.");
    startTransition(async () => {
      const res = routine
        ? await updateOwnRoutine(routine.id, { diasPorSemana, horario, resumenFrecuencia, notaPerfil, dias })
        : await createOwnRoutine({ clientId, diasPorSemana, horario, resumenFrecuencia, notaPerfil, dias });
      if (!res.ok) return setError(res.error ?? "No se pudo guardar la rutina.");
      onSaved();
    });
  }

  return (
    <div className="mx-auto max-w-2xl">
      <button
        onClick={onClose}
        className="flex items-center gap-1.5 text-xs font-semibold text-white/50 hover:text-white"
      >
        <ArrowLeft size={14} /> Volver a Entrenamientos
      </button>

      <h1 className="mt-4 text-xl font-bold text-white">
        {routine ? "Editar rutina" : "Nueva rutina"} — {clientName}
      </h1>

      <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <label className="col-span-1 flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-white/50">Días/semana</span>
            <input
              type="number"
              min={1}
              max={7}
              value={diasPorSemana}
              onChange={(e) => setDiasPorSemana(parseInt(e.target.value, 10) || 1)}
              className="input"
            />
          </label>
          <label className="col-span-3 flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-white/50">Horario habitual *</span>
            <select value={horario} onChange={(e) => setHorario(e.target.value)} className="input">
              <option value="" className="bg-[#0a0d16]">Selecciona un horario</option>
              {HORARIOS_ENTRENO.map((h) => (
                <option key={h} value={h} className="bg-[#0a0d16]">
                  {h}
                </option>
              ))}
            </select>
          </label>
          <label className="col-span-4 flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-white/50">Resumen de frecuencia (opcional)</span>
            <input
              value={resumenFrecuencia ?? ""}
              onChange={(e) => setResumenFrecuencia(e.target.value)}
              placeholder="Ej. Push/Pull/Piernas x2"
              className="input"
            />
          </label>
          <label className="col-span-4 flex flex-col gap-1">
            <span className="text-[11px] font-semibold text-white/50">Nota sobre el perfil (opcional)</span>
            <textarea
              value={notaPerfil ?? ""}
              onChange={(e) => setNotaPerfil(e.target.value)}
              rows={2}
              className="input resize-none"
            />
          </label>
        </div>

        <div className="mt-5 space-y-3">
          {dias.map((day, dayIndex) => (
            <DayEditor
              key={dayIndex}
              kind={kind}
              day={day}
              onChange={(patch) => updateDay(dayIndex, patch)}
              onRemove={() => removeDay(dayIndex)}
              onAddBlock={() => addBlock(dayIndex)}
              onRemoveBlock={(bi) => removeBlock(dayIndex, bi)}
              onUpdateBlock={(bi, patch) => updateBlock(dayIndex, bi, patch)}
            />
          ))}
          <button
            onClick={addDay}
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/15 py-2 text-xs font-semibold text-white/50 hover:border-white/30 hover:text-white"
          >
            <Plus size={13} /> Agregar día
          </button>
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
            {isPending ? "Guardando..." : "Guardar rutina"}
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

function DayEditor({
  kind,
  day,
  onChange,
  onRemove,
  onAddBlock,
  onRemoveBlock,
  onUpdateBlock,
}: {
  kind: RoutineBlockKind;
  day: RoutineDay;
  onChange: (patch: Partial<RoutineDay>) => void;
  onRemove: () => void;
  onAddBlock: () => void;
  onRemoveBlock: (blockIndex: number) => void;
  onUpdateBlock: (blockIndex: number, patch: Partial<RoutineExerciseBlock>) => void;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-center gap-2">
        <input
          value={day.nombre}
          onChange={(e) => onChange({ nombre: e.target.value })}
          className="input flex-1 !py-1.5 !text-xs font-semibold"
        />
        <select
          value={day.diaSemana ?? ""}
          onChange={(e) => onChange({ diaSemana: e.target.value === "" ? null : parseInt(e.target.value, 10) })}
          title="Día de la semana (opcional) — para mostrarlo en la Agenda"
          className="input !w-auto !py-1.5 !text-[11px]"
        >
          <option value="" className="bg-[#0a0d16]">
            Sin día fijo
          </option>
          {DIAS_SEMANA.map((d) => (
            <option key={d.value} value={d.value} className="bg-[#0a0d16]">
              {d.label}
            </option>
          ))}
        </select>
        <button
          onClick={() => onChange({ descanso: !day.descanso })}
          className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            day.descanso ? "bg-white/10 text-white/60" : "border border-white/15 text-white/40"
          }`}
        >
          <Moon size={11} /> Descanso
        </button>
        <button onClick={onRemove} className="text-white/30 hover:text-red-400">
          <Trash2 size={14} />
        </button>
      </div>

      {!day.descanso && (
        <div className="mt-3 space-y-2">
          {day.bloques.map((block, blockIndex) => (
            <ExerciseBlockEditor
              key={blockIndex}
              kind={kind}
              block={block}
              onChange={(patch) => onUpdateBlock(blockIndex, patch)}
              onRemove={() => onRemoveBlock(blockIndex)}
            />
          ))}
          <button
            onClick={onAddBlock}
            className="flex items-center gap-1 text-[11px] font-semibold text-hf-blue hover:underline"
          >
            <Plus size={11} /> Agregar ejercicio
          </button>
        </div>
      )}
    </div>
  );
}

// Dispatcher: cada rama tiene su propio shape de bloque (ver
// lib/routine-types.ts), así que en vez de un solo formulario con todos los
// campos posibles (confuso e incorrecto para las otras 2 ramas), cada rama
// tiene su propio editor. blockKindOf(block) manda sobre "kind" del
// entrenador para que una rutina vieja (creada antes de este cambio, sin
// "tipo") se siga leyendo como fuerza sin importar la rama actual.
function ExerciseBlockEditor({
  kind,
  block,
  onChange,
  onRemove,
}: {
  kind: RoutineBlockKind;
  block: RoutineExerciseBlock;
  onChange: (patch: Partial<RoutineExerciseBlock>) => void;
  onRemove: () => void;
}) {
  const blockKind = blockKindOf(block);
  if (blockKind === "running") {
    return <RunningBlockEditor kind={kind} block={block as RunningBlock} onChange={onChange} onRemove={onRemove} />;
  }
  if (blockKind === "crossfit") {
    return <CrossfitBlockEditor kind={kind} block={block as CrossfitBlock} onChange={onChange} onRemove={onRemove} />;
  }
  return <FuerzaBlockEditor kind={kind} block={block as FuerzaBlock} onChange={onChange} onRemove={onRemove} />;
}

/**
 * Buscador/selector de ejercicio compartido por los 3 editores de bloque —
 * misma UI (buscar, elegir de resultados, escribir libre, o abrir la
 * biblioteca completa) parametrizada por qué categorías de exercises.category
 * le sirven a la rama actual (categoriesForBlockKind), para que un
 * entrenador de running no vea sentadillas al buscar.
 */
function ExerciseSearchField({
  nombreLibre,
  ejercicioId,
  categories,
  onSelect,
  onChangeFreeText,
  onRemove,
}: {
  nombreLibre: string | null;
  ejercicioId: string | null;
  categories: string[];
  onSelect: (ex: ExerciseRow) => void;
  onChangeFreeText: (text: string) => void;
  onRemove: () => void;
}) {
  const [query, setQuery] = useState(nombreLibre ?? "");
  const [results, setResults] = useState<ExerciseRow[]>([]);
  const [open, setOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<ExerciseRow | null>(null);

  useEffect(() => {
    if (!open || query.trim().length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(() => {
      searchExercises(query, undefined, undefined, categories).then(setResults);
    }, 250);
    return () => clearTimeout(t);
  }, [query, open, categories]);

  // Trae grupo muscular + equipo del ejercicio ya elegido (aunque venga de
  // una rutina guardada antes, donde el bloque solo tiene el id) para poder
  // mostrar la insignia "qué máquina necesita" sin duplicar esos datos
  // dentro del jsonb de la rutina.
  useEffect(() => {
    if (!ejercicioId) {
      setSelectedExercise(null);
      return;
    }
    let cancelled = false;
    getExercisesByIds([ejercicioId]).then((rows) => {
      if (!cancelled) setSelectedExercise(rows[0] ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [ejercicioId]);

  function selectExercise(ex: ExerciseRow) {
    setQuery(ex.name);
    setSelectedExercise(ex);
    onSelect(ex);
    setOpen(false);
    setPickerOpen(false);
  }

  return (
    <div className="flex items-start gap-2">
      <Dumbbell size={14} className="mt-2 shrink-0 text-white/30" />
      <div className="relative flex-1">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setSelectedExercise(null);
            onChangeFreeText(e.target.value);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Buscar ejercicio o escribir uno propio..."
          className="input !py-1.5 !text-xs"
        />
        {open && results.length > 0 && (
          <div className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-white/10 bg-[#12151f] shadow-lg">
            {results.map((ex) => (
              <button
                key={ex.id}
                onClick={() => selectExercise(ex)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-white/80 hover:bg-white/5"
              >
                {ex.image_url ? (
                  <Image
                    src={ex.image_url}
                    alt=""
                    width={28}
                    height={28}
                    unoptimized
                    className="h-7 w-7 shrink-0 rounded-md object-cover"
                  />
                ) : (
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-white/5">
                    <Dumbbell size={12} className="text-white/30" />
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate">{ex.name}</span>
                <span className="shrink-0 text-[10px] text-white/30">
                  {MUSCLE_GROUP_LABELS[ex.muscle_group] ?? ex.muscle_group}
                </span>
                <span className="shrink-0 rounded-full bg-hf-blue/10 px-1.5 py-0.5 text-[9px] font-semibold text-hf-blue">
                  {EQUIPMENT_LABELS[ex.equipment] ?? ex.equipment}
                </span>
              </button>
            ))}
          </div>
        )}
        {selectedExercise && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            <span className="rounded-full bg-white/5 px-2 py-0.5 text-[10px] text-white/50">
              {MUSCLE_GROUP_LABELS[selectedExercise.muscle_group] ?? selectedExercise.muscle_group}
            </span>
            <span className="rounded-full bg-hf-blue/10 px-2 py-0.5 text-[10px] font-semibold text-hf-blue">
              {EQUIPMENT_LABELS[selectedExercise.equipment] ?? selectedExercise.equipment}
            </span>
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        className="mt-1.5 flex shrink-0 items-center gap-1 rounded-full border border-white/15 px-2.5 py-1.5 text-[10px] font-semibold text-white/60 hover:border-white/30 hover:text-white"
      >
        <Library size={11} /> Ver biblioteca
      </button>
      <button onClick={onRemove} className="mt-1.5 text-white/30 hover:text-red-400">
        <X size={14} />
      </button>

      {pickerOpen && (
        <ExercisePickerModal categories={categories} onSelect={selectExercise} onClose={() => setPickerOpen(false)} />
      )}
    </div>
  );
}

function FuerzaBlockEditor({
  kind,
  block,
  onChange,
  onRemove,
}: {
  kind: RoutineBlockKind;
  block: FuerzaBlock;
  onChange: (patch: Partial<RoutineExerciseBlock>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-xl bg-white/[0.03] p-3">
      <ExerciseSearchField
        nombreLibre={block.nombreLibre}
        ejercicioId={block.ejercicioId}
        categories={categoriesForBlockKind(kind)}
        onSelect={(ex) => onChange({ ejercicioId: ex.id, nombreLibre: ex.name })}
        onChangeFreeText={(text) => onChange({ ejercicioId: null, nombreLibre: text })}
        onRemove={onRemove}
      />
      <div className="mt-2 grid grid-cols-3 gap-2 pl-6">
        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] text-white/40">Series</span>
          <input
            type="number"
            min={1}
            value={block.series}
            onChange={(e) => onChange({ series: parseInt(e.target.value, 10) || 1 })}
            className="input !py-1 !text-xs"
          />
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] text-white/40">Repeticiones</span>
          <input
            value={block.repeticiones}
            onChange={(e) => onChange({ repeticiones: e.target.value })}
            placeholder="8-12"
            className="input !py-1 !text-xs"
          />
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] text-white/40">Descanso (seg)</span>
          <input
            type="number"
            min={0}
            value={block.descansoSegundos ?? 0}
            onChange={(e) => onChange({ descansoSegundos: parseInt(e.target.value, 10) || 0 })}
            className="input !py-1 !text-xs"
          />
        </label>
      </div>
    </div>
  );
}

function RunningBlockEditor({
  kind,
  block,
  onChange,
  onRemove,
}: {
  kind: RoutineBlockKind;
  block: RunningBlock;
  onChange: (patch: Partial<RoutineExerciseBlock>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-xl bg-white/[0.03] p-3">
      <ExerciseSearchField
        nombreLibre={block.nombreLibre}
        ejercicioId={block.ejercicioId}
        categories={categoriesForBlockKind(kind)}
        onSelect={(ex) => onChange({ ejercicioId: ex.id, nombreLibre: ex.name })}
        onChangeFreeText={(text) => onChange({ ejercicioId: null, nombreLibre: text })}
        onRemove={onRemove}
      />
      <div className="mt-2 grid grid-cols-2 gap-2 pl-6 sm:grid-cols-4">
        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] text-white/40">Distancia (km)</span>
          <input
            type="number"
            min={0}
            step={0.1}
            value={block.distanciaKm ?? ""}
            onChange={(e) => onChange({ distanciaKm: e.target.value === "" ? null : parseFloat(e.target.value) })}
            placeholder="5"
            className="input !py-1 !text-xs"
          />
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] text-white/40">Ritmo objetivo</span>
          <input
            value={block.ritmoObjetivo ?? ""}
            onChange={(e) => onChange({ ritmoObjetivo: e.target.value })}
            placeholder="5:30 min/km"
            className="input !py-1 !text-xs"
          />
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] text-white/40">Duración (min)</span>
          <input
            type="number"
            min={0}
            value={block.duracionMin ?? ""}
            onChange={(e) => onChange({ duracionMin: e.target.value === "" ? null : parseInt(e.target.value, 10) })}
            placeholder="30"
            className="input !py-1 !text-xs"
          />
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] text-white/40">Zona FC</span>
          <input
            value={block.zonaFc ?? ""}
            onChange={(e) => onChange({ zonaFc: e.target.value })}
            placeholder="Z2"
            className="input !py-1 !text-xs"
          />
        </label>
      </div>
    </div>
  );
}

function CrossfitBlockEditor({
  kind,
  block,
  onChange,
  onRemove,
}: {
  kind: RoutineBlockKind;
  block: CrossfitBlock;
  onChange: (patch: Partial<RoutineExerciseBlock>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-xl bg-white/[0.03] p-3">
      <ExerciseSearchField
        nombreLibre={block.nombreLibre}
        ejercicioId={block.ejercicioId}
        categories={categoriesForBlockKind(kind)}
        onSelect={(ex) => onChange({ ejercicioId: ex.id, nombreLibre: ex.name })}
        onChangeFreeText={(text) => onChange({ ejercicioId: null, nombreLibre: text })}
        onRemove={onRemove}
      />
      <div className="mt-2 grid grid-cols-2 gap-2 pl-6 sm:grid-cols-3">
        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] text-white/40">Formato</span>
          <select
            value={block.formato ?? "for_time"}
            onChange={(e) => onChange({ formato: e.target.value })}
            className="input !py-1 !text-xs"
          >
            {WOD_FORMATOS.map((f) => (
              <option key={f.value} value={f.value} className="bg-[#0a0d16]">
                {f.label}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] text-white/40">Duración (min)</span>
          <input
            type="number"
            min={0}
            value={block.duracionMin ?? ""}
            onChange={(e) => onChange({ duracionMin: e.target.value === "" ? null : parseInt(e.target.value, 10) })}
            placeholder="20"
            className="input !py-1 !text-xs"
          />
        </label>
        <label className="flex flex-col gap-0.5">
          <span className="text-[10px] text-white/40">Rondas</span>
          <input
            type="number"
            min={0}
            value={block.rondas ?? ""}
            onChange={(e) => onChange({ rondas: e.target.value === "" ? null : parseInt(e.target.value, 10) })}
            placeholder="5"
            className="input !py-1 !text-xs"
          />
        </label>
        <label className="col-span-2 flex flex-col gap-0.5 sm:col-span-3">
          <span className="text-[10px] text-white/40">Movimientos</span>
          <textarea
            value={block.movimientos ?? ""}
            onChange={(e) => onChange({ movimientos: e.target.value })}
            placeholder="21-15-9 Thrusters 40kg + Dominadas"
            rows={2}
            className="input resize-none !py-1 !text-xs"
          />
        </label>
      </div>
    </div>
  );
}

/**
 * Biblioteca completa de ejercicios (~386 hoy) para elegir mirando qué
 * grupo muscular trabaja y qué equipo/máquina necesita, en vez de tener que
 * adivinar por el nombre en el buscador rápido. Trae toda la lista una sola
 * vez al abrir y filtra en el cliente — con este tamaño de tabla es más
 * ágil que pedir al servidor en cada tecla o cambio de filtro.
 */
function ExercisePickerModal({
  categories,
  onSelect,
  onClose,
}: {
  categories: string[];
  onSelect: (ex: ExerciseRow) => void;
  onClose: () => void;
}) {
  const [all, setAll] = useState<ExerciseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [muscleGroup, setMuscleGroup] = useState("");
  const [equipment, setEquipment] = useState("");

  useEffect(() => {
    // Filtra por la(s) categoría(s) de la rama del entrenador (fuerza+cardio,
    // running o crossfit) para que la biblioteca completa no mezcle
    // ejercicios de otras ramas.
    searchExercises(undefined, undefined, undefined, categories).then((rows) => {
      setAll(rows);
      setLoading(false);
    });
  }, [categories]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = all.filter((ex) => {
      if (q && !ex.name.toLowerCase().includes(q)) return false;
      if (muscleGroup && ex.muscle_group !== muscleGroup) return false;
      if (equipment && ex.equipment !== equipment) return false;
      return true;
    });
    // Los ejercicios con foto van siempre primero — así lo que se ve de
    // entrada al abrir la biblioteca es lo ilustrado (más fácil de
    // reconocer de un vistazo), sin ocultar los que aún no tienen imagen.
    return [...rows].sort((a, b) => {
      const aHasImage = a.image_url ? 0 : 1;
      const bHasImage = b.image_url ? 0 : 1;
      if (aHasImage !== bHasImage) return aHasImage - bHasImage;
      return a.name.localeCompare(b.name);
    });
  }, [all, query, muscleGroup, equipment]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#0a0d16]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h2 className="text-sm font-bold text-white">Biblioteca de ejercicios</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-white/10 px-5 py-3">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre..."
            className="input min-w-[160px] flex-1 !py-1.5 !text-xs"
          />
          <select value={muscleGroup} onChange={(e) => setMuscleGroup(e.target.value)} className="input !w-auto !py-1.5 !text-xs">
            <option value="" className="bg-[#0a0d16]">
              Todos los grupos
            </option>
            {MUSCLE_GROUP_OPTIONS.map((o) => (
              <option key={o.value} value={o.value} className="bg-[#0a0d16]">
                {o.label}
              </option>
            ))}
          </select>
          <select value={equipment} onChange={(e) => setEquipment(e.target.value)} className="input !w-auto !py-1.5 !text-xs">
            <option value="" className="bg-[#0a0d16]">
              Todo el equipo
            </option>
            {EQUIPMENT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value} className="bg-[#0a0d16]">
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {loading && <p className="text-xs text-white/40">Cargando biblioteca...</p>}
          {!loading && filtered.length === 0 && (
            <p className="text-xs text-white/40">Sin resultados con esos filtros.</p>
          )}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {filtered.map((ex) => (
              <button
                key={ex.id}
                onClick={() => onSelect(ex)}
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-2.5 text-left hover:border-hf-blue/40 hover:bg-white/5"
              >
                {ex.image_url ? (
                  <Image
                    src={ex.image_url}
                    alt=""
                    width={72}
                    height={72}
                    unoptimized
                    className="h-[72px] w-[72px] shrink-0 rounded-xl border border-white/10 object-cover"
                  />
                ) : (
                  <span className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-xl border border-dashed border-white/10 bg-white/5">
                    <ImageOff size={20} className="text-white/20" />
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold text-white">{ex.name}</span>
                  <span className="mt-1 flex flex-wrap gap-1">
                    <span className="rounded-full bg-white/5 px-1.5 py-0.5 text-[9px] text-white/50">
                      {MUSCLE_GROUP_LABELS[ex.muscle_group] ?? ex.muscle_group}
                    </span>
                    <span className="rounded-full bg-hf-blue/10 px-1.5 py-0.5 text-[9px] font-semibold text-hf-blue">
                      {EQUIPMENT_LABELS[ex.equipment] ?? ex.equipment}
                    </span>
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-white/10 px-5 py-2.5 text-center text-[11px] text-white/30">
          {filtered.length} de {all.length} ejercicios
        </div>
      </div>
    </div>
  );
}
