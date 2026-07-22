"use client";

import { LeadModalStateProvider } from "./lead-modal-context";
import { HakunnaFitLeadModal } from "./lead-modal";
import { HakunnaFitChatWidget } from "./chat-widget";

export function LeadModalProvider({ children }: { children: React.ReactNode }) {
  return (
    <LeadModalStateProvider>
      {children}
      <HakunnaFitLeadModal />
      <HakunnaFitChatWidget />
    </LeadModalStateProvider>
  );
}
