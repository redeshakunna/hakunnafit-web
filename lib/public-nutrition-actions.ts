"use server";

// Acceso PÚBLICO (sin sesión) a un plan de alimentación por su share_token —
// mismo patrón que public-session-proposal-actions.ts / agenda/conectar
// /[token]: el token es de un solo propósito (ver un plan puntual), no da
// acceso a nada más del cliente ni del entrenador. Pedido explícito de
// Nando: el plan se debe poder abrir directo desde un link de WhatsApp o
// para imprimir, sin que el cliente tenga que loguearse en /mi-cuenta.
//
// A diferencia de session-proposals (que sí expira, porque son fechas
// puntuales que dejan de tener sentido), el link de un plan de alimentación
// no expira — el entrenador lo comparte una vez y el cliente debe poder
// volver a abrirlo cuando quiera mientras el plan siga vigente.

import { getSupabaseAdmin } from "./supabase-admin";
import type { NutritionDias, AlimentoLite } from "./nutrition-types";
import type { AlimentoRow, MealPlanStatus } from "./trainer-nutrition-actions";

export interface PublicMealPlanView {
  planId: string;
  comidasPorDia: number;
  objetivo: string | null;
  dias: NutritionDias;
  status: MealPlanStatus;
  createdAt: string;
  clientFirstName: string;
  trainer: {
    businessName: string;
    logoUrl: string | null;
    colorPrimario: string;
    colorSecundario: string;
    colorTerciario: string;
  };
  alimentos: AlimentoLite[];
}

function toAlimentoLite(a: AlimentoRow): AlimentoLite {
  return {
    id: a.id,
    nombre: a.nombre,
    categoria: a.categoria,
    tiendas: a.tiendas,
    unidadReferencia: a.unidad_referencia,
    calorias: a.calorias,
    proteinaG: a.proteina_g,
    carbohidratosG: a.carbohidratos_g,
    grasaG: a.grasa_g,
    precioCop: a.precio_cop,
  };
}

export async function getMealPlanByShareToken(token: string): Promise<PublicMealPlanView | null> {
  if (!token?.trim()) return null;
  const supabase = getSupabaseAdmin();

  const { data: plan, error } = await supabase
    .from("meal_plans")
    .select("id, client_id, trainer_id, comidas_por_dia, objetivo, dias, status, created_at")
    .eq("share_token", token)
    .maybeSingle();
  if (error || !plan) return null;

  const [{ data: client }, { data: trainer }] = await Promise.all([
    supabase.from("clients").select("full_name").eq("id", plan.client_id).maybeSingle(),
    supabase
      .from("trainers")
      .select("business_name, logo_url, color_primario, color_secundario, color_terciario")
      .eq("id", plan.trainer_id)
      .maybeSingle(),
  ]);
  if (!client || !trainer) return null;

  const dias = plan.dias as unknown as NutritionDias;
  const alimentoIds = new Set<string>();
  dias.forEach((d) => d.comidas.forEach((m) => m.items.forEach((i) => i.alimentoId && alimentoIds.add(i.alimentoId))));

  let alimentos: AlimentoLite[] = [];
  if (alimentoIds.size > 0) {
    const { data: alimentosRows } = await supabase
      .from("alimentos")
      .select("id, nombre, categoria, tiendas, unidad_referencia, calorias, proteina_g, carbohidratos_g, grasa_g, precio_cop")
      .in("id", Array.from(alimentoIds));
    alimentos = (alimentosRows ?? []).map((a) => toAlimentoLite(a as AlimentoRow));
  }

  return {
    planId: plan.id,
    comidasPorDia: plan.comidas_por_dia,
    objetivo: plan.objetivo,
    dias,
    status: plan.status as MealPlanStatus,
    createdAt: plan.created_at,
    clientFirstName: (client.full_name as string).split(" ")[0] || "tu",
    trainer: {
      businessName: (trainer.business_name as string) || "HakunnaFit",
      logoUrl: trainer.logo_url as string | null,
      colorPrimario: (trainer.color_primario as string) || "#22c55e",
      colorSecundario: (trainer.color_secundario as string) || "#0a0d16",
      colorTerciario: (trainer.color_terciario as string) || "#ffffff",
    },
    alimentos,
  };
}
