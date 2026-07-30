// Forma del jsonb "dias" en weekly_plans — definida aquí porque la tabla
// existía sin usar (creada en una iteración anterior del esquema) y nunca
// se le había dado una estructura real. Un día es una lista ordenada
// (Día 1, Día 2...) no necesariamente ligada a un día calendario, porque los
// entrenadores arman splits (push/pull/piernas, etc.) que no siempre calzan
// con lunes-domingo.

// Un bloque de rutina cambia de forma según la rama del entrenador (ver
// TRAINER_BRANCHES en catalog.ts): gym arma series/repeticiones/descanso de
// toda la vida; running necesita distancia/ritmo/zona en vez de eso; crossfit
// necesita formato de WOD (AMRAP/EMOM/For Time) + rondas + movimientos en vez
// de un solo ejercicio con series. "tipo" es lo que discrimina cuál de los 3
// shapes tiene un bloque — es opcional a propósito en FuerzaBlock: las
// rutinas guardadas antes de este cambio no tienen ese campo, y deben seguir
// leyéndose como fuerza (ver blockKindOf más abajo) sin necesitar backfill.
export interface FuerzaBlock {
  tipo?: "fuerza";
  // Referencia a exercises.id cuando el ejercicio viene de la biblioteca.
  ejercicioId: string | null;
  // Nombre libre cuando el entrenador escribe un ejercicio que no está en la
  // biblioteca (o cuando ejercicioId es null).
  nombreLibre: string | null;
  series: number;
  // Texto libre a propósito ("8-12", "AMRAP", "hasta el fallo") en vez de un
  // número — así se cubren rangos y técnicas especiales sin forzar un tipo.
  repeticiones: string;
  descansoSegundos: number | null;
  notas: string | null;
}

export interface RunningBlock {
  tipo: "running";
  // Referencia a exercises.id cuando el tipo de sesión viene de la
  // biblioteca (Rodaje Suave, Fartlek, Series en Pista...).
  ejercicioId: string | null;
  nombreLibre: string | null;
  distanciaKm: number | null;
  // Texto libre ("5:30 min/km", "ritmo cómodo") — igual que repeticiones en
  // fuerza, no tiene sentido forzarlo a un número único.
  ritmoObjetivo: string | null;
  duracionMin: number | null;
  // Texto libre ("Z2", "Z3-Z4", "por sensación") — no todos los clientes
  // tienen pulsómetro con zonas configuradas.
  zonaFc: string | null;
  notas: string | null;
}

export interface CrossfitBlock {
  tipo: "crossfit";
  // Referencia a exercises.id cuando el movimiento/WOD viene de la
  // biblioteca (Thruster, WOD Fran, Box Jump...).
  ejercicioId: string | null;
  nombreLibre: string | null;
  // "for_time" | "amrap" | "emom" | "rft" | "tabata" | "otro"
  formato: string | null;
  duracionMin: number | null;
  rondas: number | null;
  // Texto libre describiendo el esquema completo, ej. "21-15-9 Thrusters
  // 40kg + Dominadas" — un WOD no se reduce a series/repeticiones de un solo
  // movimiento.
  movimientos: string | null;
  notas: string | null;
}

export type RoutineExerciseBlock = FuerzaBlock | RunningBlock | CrossfitBlock;

export type RoutineBlockKind = "fuerza" | "running" | "crossfit";

export interface RoutineDay {
  nombre: string;
  descanso: boolean;
  bloques: RoutineExerciseBlock[];
  // Opcional a propósito (undefined en toda rutina creada antes de este
  // cambio, tratado igual que null): 0=lunes ... 6=domingo. Sin esto un
  // "Día 1"/"Push" no tiene forma de saber qué día de la semana le
  // corresponde, y la Agenda no podría mostrar "quién entrena hoy". Null =
  // el entrenador prefiere dejarlo flexible (splits que no siguen un
  // calendario fijo), y ese día simplemente no aparece en el resumen semanal.
  diaSemana?: number | null;
}

export type RoutineDias = RoutineDay[];

export const DIAS_SEMANA = [
  { value: 0, label: "Lunes" },
  { value: 1, label: "Martes" },
  { value: 2, label: "Miércoles" },
  { value: 3, label: "Jueves" },
  { value: 4, label: "Viernes" },
  { value: 5, label: "Sábado" },
  { value: 6, label: "Domingo" },
];

export function emptyRoutineDay(index: number): RoutineDay {
  return { nombre: `Día ${index}`, descanso: false, bloques: [], diaSemana: null };
}

// Qué tipo de bloque le corresponde a cada rama del entrenador — a
// diferencia de perfilShapeForBranch (client-profile-types.ts), acá "gym" sí
// tiene un valor propio ("fuerza") porque todo bloque necesita algún shape,
// no puede quedar en null.
export function resolveBlockKind(especialidad: string | null): RoutineBlockKind {
  if (especialidad === "running") return "running";
  if (especialidad === "crossfit") return "crossfit";
  return "fuerza";
}

// Lee el tipo real de un bloque ya guardado — las rutinas creadas antes de
// este cambio no tienen "tipo" en absoluto, y deben seguir tratándose como
// fuerza (su único shape posible en ese momento).
export function blockKindOf(block: RoutineExerciseBlock): RoutineBlockKind {
  return block.tipo ?? "fuerza";
}

export function emptyExerciseBlock(kind: RoutineBlockKind = "fuerza"): RoutineExerciseBlock {
  if (kind === "running") {
    return {
      tipo: "running",
      ejercicioId: null,
      nombreLibre: "",
      distanciaKm: null,
      ritmoObjetivo: null,
      duracionMin: null,
      zonaFc: null,
      notas: null,
    };
  }
  if (kind === "crossfit") {
    return {
      tipo: "crossfit",
      ejercicioId: null,
      nombreLibre: "",
      formato: "for_time",
      duracionMin: null,
      rondas: null,
      movimientos: "",
      notas: null,
    };
  }
  return { tipo: "fuerza", ejercicioId: null, nombreLibre: "", series: 3, repeticiones: "8-12", descansoSegundos: 60, notas: null };
}

// Qué categorías de la biblioteca de ejercicios (exercises.category) le
// sirven a cada tipo de bloque, para que el picker/buscador de cada rama
// solo muestre lo relevante (un entrenador de running no necesita ver
// sentadillas con barra al buscar un ejercicio).
export function categoriesForBlockKind(kind: RoutineBlockKind): string[] {
  if (kind === "running") return ["running"];
  if (kind === "crossfit") return ["crossfit"];
  return ["fuerza", "cardio"];
}

// Opciones de formato de WOD para el select del bloque crossfit.
export const WOD_FORMATOS = [
  { value: "for_time", label: "For Time" },
  { value: "amrap", label: "AMRAP" },
  { value: "emom", label: "EMOM" },
  { value: "rft", label: "RFT (Rounds For Time)" },
  { value: "tabata", label: "Tabata" },
  { value: "otro", label: "Otro" },
];

// Etiquetas en español para los valores crudos de la biblioteca de
// ejercicios (exercises.muscle_group / exercises.equipment) — así el
// entrenador ve "Máquina" en vez de "maquina" al elegir de la biblioteca,
// sin tener que tocar los datos sembrados.
export const MUSCLE_GROUP_LABELS: Record<string, string> = {
  piernas: "Piernas",
  brazos: "Brazos",
  espalda: "Espalda",
  pecho: "Pecho",
  core: "Core",
  hombros: "Hombros",
  cardio: "Cardio",
  gluteos: "Glúteos",
  // Movimientos olímpicos/gimnásticos de crossfit que trabajan todo el
  // cuerpo en un solo gesto (arranque, cargada, thruster...) — no tiene
  // sentido forzarlos dentro de un solo grupo muscular tradicional.
  cuerpo_completo: "Cuerpo completo",
};

export const EQUIPMENT_LABELS: Record<string, string> = {
  peso_corporal: "Peso corporal",
  barra: "Barra",
  mancuernas: "Mancuernas",
  maquina: "Máquina",
  cable: "Cable/Polea",
  kettlebell: "Kettlebell",
  banda: "Banda elástica",
  // Implementos típicos de crossfit, agregados junto con la biblioteca de
  // ejercicios de esa rama (ver migración seed_exercises_crossfit_running).
  anillas: "Anillas",
  caja: "Caja (box)",
  cuerda: "Cuerda",
  balon_medicinal: "Balón medicinal",
  trineo: "Trineo (sled)",
};

export const MUSCLE_GROUP_OPTIONS = Object.entries(MUSCLE_GROUP_LABELS).map(([value, label]) => ({ value, label }));
export const EQUIPMENT_OPTIONS = Object.entries(EQUIPMENT_LABELS).map(([value, label]) => ({ value, label }));
