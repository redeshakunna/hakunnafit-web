// Métricas derivadas del check-off real de entrenamientos (training_logs) —
// fórmulas deterministas, no IA, mismo criterio que lib/imc.ts. Existen para
// poder mostrar "racha" y "alertas de inactividad" de forma honesta, a
// partir de asistencia que el entrenador de verdad registró, en vez de
// simular un número.

function toMidnight(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfWeek(date: Date): Date {
  const d = toMidnight(date);
  const day = d.getDay(); // 0=domingo..6=sábado
  const diff = (day === 0 ? -6 : 1) - day; // retrocede hasta el lunes
  d.setDate(d.getDate() + diff);
  return d;
}

/** Días transcurridos desde el último entrenamiento registrado. null si
 * nunca se ha registrado ninguno. */
export function daysSinceLastTraining(fechas: string[]): number | null {
  if (fechas.length === 0) return null;
  const last = fechas.reduce((a, b) => (a > b ? a : b));
  const lastDate = toMidnight(new Date(`${last}T00:00:00`));
  const today = toMidnight(new Date());
  return Math.round((today.getTime() - lastDate.getTime()) / 86400000);
}

/**
 * Racha en semanas consecutivas cumpliendo la meta de días/semana del
 * cliente. Solo cuenta semanas ya cerradas (lunes a domingo completos) —
 * la semana en curso no penaliza ni suma todavía porque no ha terminado.
 */
export function weeklyTrainingStreak(fechas: string[], metaPorSemana: number | null): number {
  if (!metaPorSemana || metaPorSemana <= 0 || fechas.length === 0) return 0;

  const dates = fechas.map((f) => toMidnight(new Date(`${f}T00:00:00`)));
  let weekCursor = startOfWeek(new Date());
  weekCursor.setDate(weekCursor.getDate() - 7); // última semana ya cerrada

  let streak = 0;
  for (;;) {
    const weekEnd = new Date(weekCursor);
    weekEnd.setDate(weekEnd.getDate() + 7);
    const count = dates.filter((d) => d >= weekCursor && d < weekEnd).length;
    if (count >= metaPorSemana) {
      streak++;
      weekCursor = new Date(weekCursor);
      weekCursor.setDate(weekCursor.getDate() - 7);
    } else {
      break;
    }
  }
  return streak;
}

/** Umbral simple para la alerta de inactividad en la lista de clientes —
 * más del doble de la frecuencia normal del cliente entre sesiones. */
export function isInactivityAlert(daysSince: number | null, diasPorSemana: number | null): boolean {
  if (daysSince == null) return false;
  const normalGapDays = diasPorSemana && diasPorSemana > 0 ? 7 / diasPorSemana : 7;
  return daysSince > Math.max(4, normalGapDays * 2);
}
