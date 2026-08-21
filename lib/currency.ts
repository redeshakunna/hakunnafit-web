// Formateo de precios en pesos colombianos — única fuente de verdad para
// toda la plataforma. Antes cada pantalla traía su propia copia de
// `new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", ... })`
// o su propio `function formatCop(...)` (14 implementaciones idénticas
// repetidas en 13 archivos), y todas mostraban solo el símbolo "$" sin
// aclarar la moneda — ambiguo de cara al roadmap de pagos internacionales /
// multi-moneda. Ahora todo el que muestre una tarifa importa formatCop desde
// acá, y siempre antepone "COP" al símbolo.

const COP_NUMBER_FORMAT = new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 });

/** 150000 -> "COP $150.000". Redondea a entero (no se manejan centavos de COP). */
export function formatCop(amount: number): string {
  return `COP $${COP_NUMBER_FORMAT.format(amount)}`;
}
