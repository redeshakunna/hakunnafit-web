// Preguntas específicas para arrancar un plan de entrenamiento según la rama
// del entrenador (ver TRAINER_BRANCHES en catalog.ts). Los campos genéricos
// de clients (objetivo, nivel, dias_por_semana, horario_entreno, peso_actual,
// altura) sirven para cualquier rama y se quedan como están; lo que cambia
// por rama son datos puntuales que gym no necesita y running/crossfit sí (o
// viceversa). En vez de agregarle a "clients" una decena de columnas que
// solo aplican a una rama, todo esto vive en clients.perfil_deportivo (jsonb)
// — un objeto con forma distinta según trainer.especialidad.

export interface PerfilRunning {
  // "5k" | "10k" | "21k" | "42k" | "mejorar_tiempo" | "primera_carrera" | "salud_general"
  objetivoCarrera: string | null;
  // Fecha (YYYY-MM-DD) de la carrera objetivo, si tiene una en el calendario.
  fechaCarreraObjetivo: string | null;
  // Texto libre a propósito: "10K en 52:30", "nunca he corrido una carrera"...
  mejorMarca: string | null;
  kilometrajeSemanal: number | null;
  experienciaAnios: number | null;
  // "pista" | "calle" | "trail" | "cinta"
  superficieHabitual: string | null;
  lesiones: string | null;
  usaPulsometroOReloj: boolean | null;
}

export interface PerfilCrossfit {
  // "nunca" | "menos_6_meses" | "6_12_meses" | "mas_1_anio"
  experienciaCrossfit: string | null;
  // "ninguna" | "basica" | "intermedia" | "avanzada"
  experienciaPesas: string | null;
  // Texto libre: "Back Squat 80kg, Deadlift 100kg, Clean 60kg, aún no hago snatch..."
  benchmarks: string | null;
  limitaciones: string | null;
  // "box_completo" | "garaje_basico" | "ninguno"
  accesoEquipo: string | null;
  // "perder_grasa" | "ganar_fuerza" | "competir" | "salud_general" | "tecnica_olimpica"
  objetivoCrossfit: string | null;
}

export type PerfilDeportivo = PerfilRunning | PerfilCrossfit | null;

export function emptyPerfilRunning(): PerfilRunning {
  return {
    objetivoCarrera: null,
    fechaCarreraObjetivo: null,
    mejorMarca: null,
    kilometrajeSemanal: null,
    experienciaAnios: null,
    superficieHabitual: null,
    lesiones: null,
    usaPulsometroOReloj: null,
  };
}

export function emptyPerfilCrossfit(): PerfilCrossfit {
  return {
    experienciaCrossfit: null,
    experienciaPesas: null,
    benchmarks: null,
    limitaciones: null,
    accesoEquipo: null,
    objetivoCrossfit: null,
  };
}

export const OBJETIVOS_CARRERA = [
  { value: "primera_carrera", label: "Correr mi primera carrera" },
  { value: "5k", label: "Mejorar en 5K" },
  { value: "10k", label: "Mejorar en 10K" },
  { value: "21k", label: "Media maratón (21K)" },
  { value: "42k", label: "Maratón (42K)" },
  { value: "mejorar_tiempo", label: "Bajar mi tiempo/marca personal" },
  { value: "salud_general", label: "Salud general / mantenerme activo" },
];

export const SUPERFICIES = [
  { value: "calle", label: "Calle / pavimento" },
  { value: "pista", label: "Pista atlética" },
  { value: "trail", label: "Trail / montaña" },
  { value: "cinta", label: "Cinta / caminadora" },
];

export const EXPERIENCIA_CROSSFIT = [
  { value: "nunca", label: "Nunca he hecho crossfit" },
  { value: "menos_6_meses", label: "Menos de 6 meses" },
  { value: "6_12_meses", label: "Entre 6 y 12 meses" },
  { value: "mas_1_anio", label: "Más de 1 año" },
];

export const EXPERIENCIA_PESAS = [
  { value: "ninguna", label: "Ninguna" },
  { value: "basica", label: "Básica (sé lo esencial)" },
  { value: "intermedia", label: "Intermedia" },
  { value: "avanzada", label: "Avanzada" },
];

export const ACCESO_EQUIPO = [
  { value: "box_completo", label: "Entreno en un box con equipo completo" },
  { value: "garaje_basico", label: "Tengo lo básico en casa/garaje" },
  { value: "ninguno", label: "No tengo equipo propio todavía" },
];

export const OBJETIVOS_CROSSFIT = [
  { value: "perder_grasa", label: "Perder grasa" },
  { value: "ganar_fuerza", label: "Ganar fuerza" },
  { value: "competir", label: "Prepararme para competir" },
  { value: "tecnica_olimpica", label: "Aprender/mejorar técnica olímpica" },
  { value: "salud_general", label: "Salud general / condición física" },
];

// Qué shape de perfil corresponde a cada rama — "gym" (o cualquier valor sin
// coincidencia) no tiene perfil deportivo propio, se queda en null y usa
// solo los campos genéricos de clients.
export function perfilShapeForBranch(especialidad: string | null): "running" | "crossfit" | null {
  if (especialidad === "running") return "running";
  if (especialidad === "crossfit") return "crossfit";
  return null;
}
