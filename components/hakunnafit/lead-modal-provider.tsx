"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { LeadModalStateProvider, useLeadModal, type HakunnaFitPlanKey } from "./lead-modal-context";
import { HakunnaFitLeadModal } from "./lead-modal";
import { HakunnaFitChatWidget } from "./chat-widget";

// Permite compartir un link directo que abre el formulario solo (por
// WhatsApp, por ejemplo): ?solicitud=1 lo abre, y ?plan=starter|pro|elite
// además preselecciona el plan. Envuelto en su propio Suspense porque
// useSearchParams lo exige fuera de una página ya dinámica.
function LeadModalAutoOpener() {
  const searchParams = useSearchParams();
  const { openModal } = useLeadModal();

  useEffect(() => {
    if (!searchParams.get("solicitud")) return;
    const planParam = searchParams.get("plan");
    const plan: HakunnaFitPlanKey | undefined =
      planParam === "starter" || planParam === "pro" || planParam === "elite" ? planParam : undefined;
    openModal(plan);
    // Solo debe abrirse una vez, al cargar el link — no en cada re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

export function LeadModalProvider({ children }: { children: React.ReactNode }) {
  return (
    <LeadModalStateProvider>
      {children}
      <Suspense fallback={null}>
        <LeadModalAutoOpener />
      </Suspense>
      <HakunnaFitLeadModal />
      <HakunnaFitChatWidget />
    </LeadModalStateProvider>
  );
}
