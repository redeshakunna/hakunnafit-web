import { notFound } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { TrainerComingSoon } from "@/components/hakunnafit/trainer-coming-soon";

export const revalidate = 0;

// Ruta destino del rewrite de middleware.ts para <subdominio>.hakunnafit.com
// (y también accesible directamente por path, útil para probar antes de que
// exista el DNS wildcard). Por ahora ningún plan tiene su plantilla real
// construida, así que cualquier entrenador válido ve el mismo placeholder
// personalizado con su nombre — cuando exista la plantilla estandarizada por
// plan, esta página elegirá cuál renderizar según trainer.plan.
export default async function TrainerLandingPage({
  params,
}: {
  params: { subdominio: string };
}) {
  const supabase = getSupabase();
  const { data: trainer } = await supabase
    .from("trainers")
    .select("business_name")
    .eq("subdominio", params.subdominio)
    .maybeSingle();

  if (!trainer) notFound();

  return <TrainerComingSoon businessName={trainer.business_name} />;
}
