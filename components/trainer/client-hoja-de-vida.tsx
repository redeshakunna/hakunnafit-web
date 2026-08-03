import { calculateImc } from "@/lib/imc";
import { IMC_CATEGORY_CLASS, SEXO_LABELS, NIVEL_LABELS, ACTIVIDAD_LABELS } from "@/lib/client-ui";
import type { ClientRow } from "@/lib/trainer-clients-actions";
import {
  ACCESO_EQUIPO,
  EXPERIENCIA_CROSSFIT,
  EXPERIENCIA_PESAS,
  OBJETIVOS_CARRERA,
  OBJETIVOS_CROSSFIT,
  SUPERFICIES,
  type PerfilCrossfit,
  type PerfilRunning,
} from "@/lib/client-profile-types";

function labelFor(options: { value: string; label: string }[], value: string | null): string {
  if (!value) return "—";
  return options.find((o) => o.value === value)?.label ?? value;
}

/**
 * "Hoja de vida" del cliente — resumen fijo con todo lo que el entrenador
 * necesita ver de un vistazo antes de armarle una rutina: datos físicos,
 * nivel, actividad y objetivo. El IMC se calcula al vuelo con lib/imc.ts a
 * partir de peso_actual/altura (ver ese archivo para por qué es una fórmula
 * y no una llamada a un modelo de IA). Se usa tanto en el modal rápido de
 * la lista de Clientes como en la ficha completa /panel/clientes/[id].
 */
export function ClientHojaDeVida({ client }: { client: ClientRow }) {
  const imc = calculateImc(client.peso_actual, client.altura);
  const perfil = client.perfil_deportivo;
  const esRunning = !!perfil && "objetivoCarrera" in perfil;
  const esCrossfit = !!perfil && "experienciaCrossfit" in perfil;
  // El IMC es una fórmula de composición corporal genérica — no dice nada
  // útil sobre el rendimiento de un corredor. Para clientes de running se
  // reemplaza por ritmo objetivo + km/semana (ver PerfilRunning), que sí son
  // indicadores propios de la disciplina.
  const runningPerfil = esRunning ? (perfil as PerfilRunning) : null;

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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wide text-white/40">Hoja de vida</p>
        {runningPerfil ? (
          <div className="flex flex-wrap gap-1.5">
            <span className="rounded-full bg-hf-blue/15 px-2.5 py-1 text-[11px] font-semibold text-hf-blue">
              Ritmo objetivo: {runningPerfil.ritmoObjetivo || "—"}
            </span>
            <span className="rounded-full bg-hf-blue/15 px-2.5 py-1 text-[11px] font-semibold text-hf-blue">
              Km/semana: {runningPerfil.kilometrajeSemanal != null ? runningPerfil.kilometrajeSemanal : "—"}
            </span>
          </div>
        ) : (
          imc && (
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${IMC_CATEGORY_CLASS[imc.category]}`}>
              IMC {imc.value} · {imc.label}
            </span>
          )
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
      {esRunning && (
        <div className="mt-3 border-t border-white/10 pt-3">
          <p className="text-[10px] uppercase tracking-wide text-white/30">Perfil de running</p>
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
            {(() => {
              const p = perfil as PerfilRunning;
              const rows = [
                { label: "Objetivo de carrera", value: labelFor(OBJETIVOS_CARRERA, p.objetivoCarrera) },
                { label: "Fecha de carrera", value: p.fechaCarreraObjetivo || "—" },
                { label: "Mejor marca", value: p.mejorMarca || "—" },
                { label: "Km/semana", value: p.kilometrajeSemanal != null ? String(p.kilometrajeSemanal) : "—" },
                { label: "Superficie", value: labelFor(SUPERFICIES, p.superficieHabitual) },
                { label: "Años corriendo", value: p.experienciaAnios != null ? String(p.experienciaAnios) : "—" },
              ];
              return rows.map((r) => (
                <div key={r.label}>
                  <p className="text-[10px] uppercase tracking-wide text-white/30">{r.label}</p>
                  <p className="text-xs font-medium text-white/80">{r.value}</p>
                </div>
              ));
            })()}
          </div>
          {(perfil as PerfilRunning).lesiones && (
            <p className="mt-2 text-xs text-amber-400/90">⚠ {(perfil as PerfilRunning).lesiones}</p>
          )}
        </div>
      )}

      {esCrossfit && (
        <div className="mt-3 border-t border-white/10 pt-3">
          <p className="text-[10px] uppercase tracking-wide text-white/30">Perfil de crossfit</p>
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4">
            {(() => {
              const p = perfil as PerfilCrossfit;
              const rows = [
                { label: "Experiencia crossfit", value: labelFor(EXPERIENCIA_CROSSFIT, p.experienciaCrossfit) },
                { label: "Experiencia con pesas", value: labelFor(EXPERIENCIA_PESAS, p.experienciaPesas) },
                { label: "Objetivo", value: labelFor(OBJETIVOS_CROSSFIT, p.objetivoCrossfit) },
                { label: "Acceso a equipo", value: labelFor(ACCESO_EQUIPO, p.accesoEquipo) },
              ];
              return rows.map((r) => (
                <div key={r.label}>
                  <p className="text-[10px] uppercase tracking-wide text-white/30">{r.label}</p>
                  <p className="text-xs font-medium text-white/80">{r.value}</p>
                </div>
              ));
            })()}
          </div>
          {(perfil as PerfilCrossfit).benchmarks && (
            <p className="mt-2 text-xs text-white/70">Marcas: {(perfil as PerfilCrossfit).benchmarks}</p>
          )}
          {(perfil as PerfilCrossfit).limitaciones && (
            <p className="mt-1 text-xs text-amber-400/90">⚠ {(perfil as PerfilCrossfit).limitaciones}</p>
          )}
        </div>
      )}

      {!runningPerfil && !imc && (client.peso_actual == null || client.altura == null) && (
        <p className="mt-3 text-[11px] text-white/30">
          Falta {client.peso_actual == null ? "peso" : "estatura"} para calcular el IMC — agrégalo editando al cliente.
        </p>
      )}
    </div>
  );
}
