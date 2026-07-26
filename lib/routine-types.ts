// Forma del jsonb "dias" en weekly_plans — definida aquí porque la tabla
// existía sin usar (creada en una iteración anterior del esquema) y nunca
// se le había dado una estructura real. Un día es una lista ordenada
// (Día 1, Día 2...) no necesariamente ligada a un día calendario, porque los
// entrenadores arman splits (push/pull/piernas, etc.) que no siempre calzan
// con lunes-domingo.

export interface RoutineExerciseBlock {
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

export interface RoutineDay {
  nombre: string;
  descanso: boolean;
  bloques: RoutineExerciseBlock[];
}

export type RoutineDias = RoutineDay[];

export function emptyRoutineDay(index: number): RoutineDay {
  return { nombre: `Día ${index}`, descanso: false, bloques: [] };
}

export function emptyExerciseBlock(): RoutineExerciseBlock {
  return { ejercicioId: null, nombreLibre: "", series: 3, repeticiones: "8-12", descansoSegundos: 60, notas: null };
}
