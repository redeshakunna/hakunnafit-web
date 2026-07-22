"use client";

import { LeadModalStateProvider } from "./lead-modal-context";
import { HakunnaFitLeadModal } from "./lead-modal";

export function LeadModalProvider({ children }: { children: React.ReactNode }) {
  return (
    <LeadModalStateProvider>
      {children}
      <HakunnaFitLeadModal />
    </LeadModalStateProvider>
  );
}
