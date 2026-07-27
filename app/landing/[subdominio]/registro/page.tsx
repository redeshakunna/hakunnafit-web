import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { getSupabase } from "@/lib/supabase";
import { BrandMark } from "@/components/hakunnafit/starter-templates/brand-mark";
import { PublicClientIntakeForm } from "@/components/hakunnafit/public-client-intake-form";
import type { PlanOfrecido } from "@/lib/admin-actions";

export const revalidate = 0;

// Segundo punto de entrada de alta de cliente (el primero es el formulario
// ligero embebido en la landing) — página standalone que el entrenador
// comparte directo por WhatsApp cuando quiere los datos completos de un
// cliente puntual antes de su evaluación. Vive bajo /landing/[subdominio]/
// registro a propósito: el rewrite de middleware.ts ya reescribe cualquier
// path bajo el subdominio del entrenador, así que esta ruta queda accesible
// gratis en {subdominio}.hakunnafit.com/registro sin tocar el middleware.
export default async function ClientRegistrationPage({
  params,
}: {
  params: { subdominio: string };
}) {
  const supabase = getSupabase();
  const { data: trainer } = await supabase
    .from("trainers")
    .select("business_name, logo_url, color_primario, color_secundario, planes_ofrecidos")
    .eq("subdominio", params.subdominio)
    .maybeSingle();

  if (!trainer) notFound();

  return (
    <main
      className="flex min-h-screen flex-col items-center bg-hf-black px-4 py-12 sm:py-20"
      style={
        {
          ["--hf-primary" as string]: trainer.color_primario,
          ["--hf-secondary" as string]: trainer.color_secundario,
        } as CSSProperties
      }
    >
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-4 text-center">
          <BrandMark
            logoUrl={trainer.logo_url}
            businessName={trainer.business_name}
            className="h-12 w-48"
            textClassName="font-[family-name:var(--font-hf-heading)] text-2xl font-extrabold tracking-tight"
          />
          <div>
            <h1 className="text-xl font-bold text-white">Regístrate como cliente</h1>
            <p className="mt-1 text-sm text-white/60">
              Cuéntale a {trainer.business_name} un poco sobre ti para empezar.
            </p>
          </div>
        </div>

        <PublicClientIntakeForm
          subdominio={params.subdominio}
          planes={(trainer.planes_ofrecidos as unknown as PlanOfrecido[] | null) ?? []}
        />
      </div>
    </main>
  );
}
