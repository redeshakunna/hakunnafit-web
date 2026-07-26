"use server";

// Precios editables por plan/ciclo — antes vivían fijos en pricing.tsx y en
// PLAN_PRICE_COP (catalog.ts). Ahora la fuente de verdad es la tabla
// plan_settings, editable desde /panel-hakunna/configuracion. catalog.ts
// conserva sus valores como respaldo (getPlanPrices cae en ellos si la
// tabla todavía no tiene fila para un plan, o si falla la lectura), para que
// el sitio nunca se quede sin precios que mostrar.
//
// Se usa siempre el cliente de servicio (nunca el público): esta acción
// corre server-side tanto desde el panel admin como desde la landing
// pública (app/page.tsx la llama al renderizar /panel-hakunna/configuracion
// y la sección de precios), así que no hace falta abrir una política de RLS
// para esto.

import { getSupabaseAdmin } from "./supabase-admin";
import { isAdminAuthenticated } from "./admin-auth";
import { PLANS, type PlanKey } from "./catalog";

export interface PlanPrice {
  monthlyCop: number;
  semesterCop: number;
  annualCop: number;
}

export type PlanPrices = Record<PlanKey, PlanPrice>;

// Mismos valores que estaban fijos en pricing.tsx — ahora son solo el
// respaldo por si la tabla no responde.
const FALLBACK_PRICES: PlanPrices = {
  starter: { monthlyCop: 120000, semesterCop: 648000, annualCop: 1224000 },
  pro: { monthlyCop: 220000, semesterCop: 1188000, annualCop: 2244000 },
  elite: { monthlyCop: 390000, semesterCop: 2106000, annualCop: 3978000 },
};

export async function getPlanPrices(): Promise<PlanPrices> {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.from("plan_settings").select("*");
    if (error || !data) return FALLBACK_PRICES;

    const byPlan = new Map(data.map((row) => [row.plan, row]));
    const result = { ...FALLBACK_PRICES };
    for (const p of PLANS) {
      const row = byPlan.get(p.key);
      if (row) {
        result[p.key] = {
          monthlyCop: row.monthly_cop,
          semesterCop: row.semester_cop,
          annualCop: row.annual_cop,
        };
      }
    }
    return result;
  } catch {
    return FALLBACK_PRICES;
  }
}

export interface AdminActionResult {
  ok: boolean;
  error?: string;
}

export async function updatePlanPrices(prices: PlanPrices): Promise<AdminActionResult> {
  const ok = await isAdminAuthenticated();
  if (!ok) throw new Error("No autorizado");

  const supabase = getSupabaseAdmin();
  const rows = PLANS.map((p) => ({
    plan: p.key,
    monthly_cop: prices[p.key].monthlyCop,
    semester_cop: prices[p.key].semesterCop,
    annual_cop: prices[p.key].annualCop,
    updated_at: new Date().toISOString(),
  }));

  for (const row of rows) {
    if (row.monthly_cop <= 0 || row.semester_cop <= 0 || row.annual_cop <= 0) {
      return { ok: false, error: "Los precios deben ser mayores a cero." };
    }
  }

  const { error } = await supabase.from("plan_settings").upsert(rows);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
