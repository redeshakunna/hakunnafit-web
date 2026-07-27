// Índice de Masa Corporal — se calcula con la fórmula estándar
// (peso_kg / altura_m²) en vez de mandarlo a un modelo de IA: es una
// operación aritmética, no algo que se beneficie de razonamiento — un
// cálculo real de IA aquí solo agregaría latencia y costo sin mejorar la
// precisión. Donde sí entra HAKAI de verdad es un paso después: este mismo
// peso/altura/IMC + el objetivo del cliente son justo los datos que va a
// leer el prompt de generación de rutinas (Pro/Elite) para interpretar y
// recomendar, que es donde el razonamiento del modelo aporta valor real.
export interface ImcResult {
  value: number;
  category: "bajo_peso" | "normal" | "sobrepeso" | "obesidad";
  label: string;
}

/**
 * Devuelve null si falta peso o altura, o si la altura es 0 (evita
 * división por cero / IMC absurdo con datos incompletos todavía).
 */
export function calculateImc(pesoKg: number | null | undefined, alturaCm: number | null | undefined): ImcResult | null {
  if (!pesoKg || !alturaCm) return null;
  const alturaM = alturaCm / 100;
  if (alturaM <= 0) return null;

  const value = pesoKg / (alturaM * alturaM);
  return { value: Math.round(value * 10) / 10, ...imcCategory(value) };
}

// Umbrales estándar de la OMS.
function imcCategory(value: number): { category: ImcResult["category"]; label: string } {
  if (value < 18.5) return { category: "bajo_peso", label: "Bajo peso" };
  if (value < 25) return { category: "normal", label: "Peso normal" };
  if (value < 30) return { category: "sobrepeso", label: "Sobrepeso" };
  return { category: "obesidad", label: "Obesidad" };
}
