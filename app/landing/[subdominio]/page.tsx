import { notFound } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { TrainerComingSoon } from "@/components/hakunnafit/trainer-coming-soon";
import { resolveStarterTemplate } from "@/components/hakunnafit/starter-templates";
import { WhatsappChatWidget } from "@/components/hakunnafit/starter-templates/whatsapp-chat-widget";
import type {
  StarterServicio,
  StarterTransformacion,
  StarterEstadistica,
  StarterTestimonio,
} from "@/components/hakunnafit/starter-templates/types";

export const revalidate = 0;

// Ruta destino del rewrite de middleware.ts para <subdominio>.hakunnafit.com
// (y también accesible directamente por path, útil para probar antes de que
// exista el DNS wildcard). Starter ya tiene sus 3 modelos estandarizados
// (ver components/hakunnafit/starter-templates/) elegidos por el propio
// entrenador al registrarse; Pro/Elite todavía no tienen plantilla real, así
// que siguen mostrando el placeholder "en construcción".
export default async function TrainerLandingPage({
  params,
}: {
  params: { subdominio: string };
}) {
  const supabase = getSupabase();
  const { data: trainer } = await supabase
    .from("trainers")
    .select(
      "business_name, plan, landing_template, especialidad, ciudad, whatsapp, email_publico, biografia, avatar_url, foto2_url, foto3_url, foto4_url, instagram, facebook, mostrar_transformaciones, transformaciones, servicios, estadisticas, testimonios, tagline, logo_url, color_primario, color_secundario, color_terciario"
    )
    .eq("subdominio", params.subdominio)
    .maybeSingle();

  if (!trainer) notFound();

  if (trainer.plan === "starter") {
    const Template = resolveStarterTemplate(trainer.landing_template);
    return (
      <>
        <Template
          trainer={{
            businessName: trainer.business_name,
            especialidad: trainer.especialidad,
            ciudad: trainer.ciudad,
            whatsapp: trainer.whatsapp,
            emailPublico: trainer.email_publico,
            biografia: trainer.biografia,
            avatarUrl: trainer.avatar_url,
            foto2Url: trainer.foto2_url,
            foto3Url: trainer.foto3_url,
            foto4Url: trainer.foto4_url,
            instagram: trainer.instagram,
            facebook: trainer.facebook,
            servicios: trainer.servicios as StarterServicio[] | null,
            mostrarTransformaciones: trainer.mostrar_transformaciones,
            transformaciones: trainer.transformaciones as StarterTransformacion[] | null,
            estadisticas: trainer.estadisticas as StarterEstadistica[] | null,
            testimonios: trainer.testimonios as StarterTestimonio[] | null,
            tagline: trainer.tagline,
            logoUrl: trainer.logo_url,
            colorPrimario: trainer.color_primario,
            colorSecundario: trainer.color_secundario,
            colorTerciario: trainer.color_terciario,
          }}
        />
        <WhatsappChatWidget
          whatsapp={trainer.whatsapp}
          businessName={trainer.business_name}
          avatarUrl={trainer.avatar_url}
        />
      </>
    );
  }

  return (
    <>
      <TrainerComingSoon businessName={trainer.business_name} />
      <WhatsappChatWidget
        whatsapp={trainer.whatsapp}
        businessName={trainer.business_name}
        avatarUrl={trainer.avatar_url}
      />
    </>
  );
}
