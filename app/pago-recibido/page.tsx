import { OnboardingStatusScreen } from "@/components/onboarding/status-screen";

// redirect-url del checkout de Wompi (ver generatePaymentLink en
// lib/admin-actions.ts). El estado real del pago lo confirma el webhook
// (app/api/wompi/webhook/route.ts) de forma asíncrona — esta pantalla es
// solo el "gracias" inmediato tras volver de Wompi, no una confirmación
// definitiva (por eso el mensaje es genérico y no dice "pagado").
export default function PagoRecibidoPage() {
  return (
    <OnboardingStatusScreen
      tone="good"
      eyebrow="Pago en proceso"
      title="Gracias, ya estamos confirmando tu pago"
      message="En unos minutos vamos a validar tu pago con la pasarela. En cuanto quede confirmado, seguimos con el siguiente paso — no necesitas hacer nada más por ahora."
    />
  );
}
