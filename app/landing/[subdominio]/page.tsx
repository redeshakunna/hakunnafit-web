import { notFound } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { TrainerComingSoon } from "@/components/hakunnafit/trainer-coming-soon";
import { resolveStarterTemplate } from "@/components/hakunnafit/starter-templates";
import { ProTemplate } from "@/components/hakunnafit/starter-templates/pro";
import { WhatsappChatWidget } from "@/components/hakunnafit/starter-templates/whatsapp-chat-widget";
import type {
  StarterServicio,
  StarterTransformacion,
  StarterEstadistica,
  StarterTestimonio,
  StarterFaq,
} from "@/components/hakunnafit/starter-templates/types";
import { DEFAULT_SECCIONES_ACTIVAS } from "@/components/hakunnafit/starter-templates/types";
import type { PlanOfrecido } from "@/lib/admin-actions";

export const revalidate = 0;

// Ruta destino del rewrite de middleware.ts para <subdominio>.hakunnafit.com
// (y también accesible directamente por path, útil para probar antes de que
// exista el DNS wildcard). Starter ya tiene sus 3 modelos estandarizados
// (ver components/hakunnafit/starter-templates/) elegidos por el propio
// entrenador al registrarse; Pro tiene su propia plantilla real (pro.tsx),
// más completa, que destaca las funciones exclusivas del plan (Nutrición IA,
// HakAI, App Cliente, fotos de progreso). Elite todavía no tiene plantilla
// propia, así que sigue mostrando el placeholder "en construcción".
export default async function TrainerLandingPage({
  params,
}: {
  params: { subdominio: string };
}) {
  const supabase = getSupabase();
  const { data: trainer } = await supabase
    .from("trainers")
    .select(
      "business_name, plan, landing_template, especialidad, ciudad, whatsapp, whatsapp_publico, email_publico, biografia, avatar_url, foto2_url, foto3_url, foto4_url, instagram, facebook, mostrar_transformaciones, transformaciones, servicios, planes_ofrecidos, estadisticas, testimonios, tagline, logo_url, banner_url, color_primario, color_secundario, color_terciario, preguntas_frecuentes, secciones_activas"
    )
    .eq("subdominio", params.subdominio)
    .maybeSingle();

  if (!trainer) notFound();

  // El WhatsApp que ve el cliente en la landing: el de atención a clientes
  // si el entrenador lo configuró en Mi Sitio Web, si no el mismo con el
  // que contacta a Nando (ver resolvePublicWhatsapp en starter-templates/types.ts,
  // misma regla, pero acá no hay StarterTrainerProfile todavía para el
  // widget de chat que aplica a cualquier plan, no solo Starter).
  const publicWhatsapp = trainer.whatsapp_publico?.trim() || trainer.whatsapp;

  if (trainer.plan === "starter" || trainer.plan === "pro") {
    const Template = trainer.plan === "pro" ? ProTemplate : resolveStarterTemplate(trainer.landing_template);
    return (
      <>
        <Template
          trainer={{
            subdominio: params.subdominio,
            businessName: trainer.business_name,
            especialidad: trainer.especialidad,
            ciudad: trainer.ciudad,
            whatsapp: trainer.whatsapp,
            whatsappPublico: trainer.whatsapp_publico,
            emailPublico: trainer.email_publico,
            biografia: trainer.biografia,
            avatarUrl: trainer.avatar_url,
            foto2Url: trainer.foto2_url,
            foto3Url: trainer.foto3_url,
            foto4Url: trainer.foto4_url,
            instagram: trainer.instagram,
            facebook: trainer.facebook,
            servicios: trainer.servicios as StarterServicio[] | null,
            planesOfrecidos: trainer.planes_ofrecidos as PlanOfrecido[] | null,
            mostrarTransformaciones: trainer.mostrar_transformaciones,
            transformaciones: trainer.transformaciones as StarterTransformacion[] | null,
            estadisticas: trainer.estadisticas as StarterEstadistica[] | null,
            testimonios: trainer.testimonios as StarterTestimonio[] | null,
            tagline: trainer.tagline,
            logoUrl: trainer.logo_url,
            bannerUrl: trainer.banner_url,
            colorPrimario: trainer.color_primario,
            colorSecundario: trainer.color_secundario,
            colorTerciario: trainer.color_terciario,
            faqs: trainer.preguntas_frecuentes as StarterFaq[] | null,
            seccionesActivas: {
              ...DEFAULT_SECCIONES_ACTIVAS,
              ...(trainer.secciones_activas as Partial<typeof DEFAULT_SECCIONES_ACTIVAS> | null),
            },
          }}
        />
        <WhatsappChatWidget
          whatsapp={publicWhatsapp}
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
