import { getOnboardingSession } from "@/lib/onboarding-actions";
import { OnboardingStatusScreen } from "@/components/onboarding/status-screen";
import { OnboardingWizard } from "@/components/onboarding/wizard";

export const revalidate = 0;

// Destino del enlace que se envía al aprobar una solicitud (ver
// approveSolicitud en lib/admin-actions.ts). Nada de esto usa sesión de
// admin — getOnboardingSession valida el token en su lugar. Por ahora el
// wizard completo solo existe para Starter; Pro/Elite quedan con una
// pantalla de aviso hasta que se construyan sus pasos adicionales.
export default async function OnboardingPage({ params }: { params: { token: string } }) {
  const session = await getOnboardingSession(params.token);

  if (!session.ok) {
    return session.error === "expired" ? (
      <OnboardingStatusScreen
        tone="bad"
        eyebrow="Enlace vencido"
        title="Este enlace de onboarding ya venció"
        message="Por seguridad, cada enlace vence a los pocos días. Escríbenos y te enviamos uno nuevo para continuar."
      />
    ) : (
      <OnboardingStatusScreen
        tone="bad"
        eyebrow="Enlace inválido"
        title="No encontramos este enlace"
        message="Revisa que copiaste la dirección completa. Si el problema sigue, contáctanos y te ayudamos."
      />
    );
  }

  const { data } = session;

  if (data.completed) {
    return (
      <OnboardingStatusScreen
        tone="good"
        eyebrow="Información recibida"
        title={`Gracias, ${data.businessName}`}
        message="Ya tenemos toda tu información. Nuestro equipo la está revisando — te avisamos por correo en cuanto tu espacio esté listo."
      />
    );
  }

  if (data.plan !== "starter") {
    return (
      <OnboardingStatusScreen
        eyebrow="Onboarding guiado"
        title="Estamos preparando tu onboarding"
        message="El asistente paso a paso para tu plan todavía está en construcción. Mientras tanto, nuestro equipo te contacta directamente por WhatsApp o correo para avanzar con tu espacio."
      />
    );
  }

  return <OnboardingWizard token={params.token} initialData={data} />;
}
