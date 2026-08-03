import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { getSupabase } from "@/lib/supabase";
import { BrandMark } from "@/components/hakunnafit/starter-templates/brand-mark";
import { ClientLoginForm } from "@/components/hakunnafit/client-login-form";

export const revalidate = 0;

// Entrada real del cliente final — vive bajo /landing/[subdominio]/ingresar
// (igual que /registro, aprovecha el mismo rewrite de middleware.ts para
// quedar disponible gratis en {subdominio}.hakunnafit.com/ingresar). El
// botón "Ingresar" de las 4 plantillas Starter/Pro apunta aquí.
export default async function ClientLoginPage({ params }: { params: { subdominio: string } }) {
  const supabase = getSupabase();
  const { data: trainer } = await supabase
    .from("trainers")
    .select("business_name, logo_url, color_primario, color_secundario")
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
            <h1 className="text-xl font-bold text-white">¿Eres cliente?</h1>
            <p className="mt-1 text-sm text-white/60">
              Entra con tu documento para ver tu rutina, tu progreso y tu próxima cita con {trainer.business_name}.
            </p>
          </div>
        </div>

        <ClientLoginForm subdominio={params.subdominio} accentColor={trainer.color_primario || "#00C8FF"} />
      </div>
    </main>
  );
}
