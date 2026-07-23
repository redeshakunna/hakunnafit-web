"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

export type HakunnaFitPlanKey = "starter" | "pro" | "elite";

interface LeadModalContextValue {
  isOpen: boolean;
  selectedPlan: HakunnaFitPlanKey | null;
  openModal: (plan?: HakunnaFitPlanKey) => void;
  closeModal: () => void;
}

const LeadModalContext = createContext<LeadModalContextValue | null>(null);

export function LeadModalStateProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<HakunnaFitPlanKey | null>(null);

  const openModal = useCallback((plan?: HakunnaFitPlanKey) => {
    setSelectedPlan(plan ?? null);
    setIsOpen(true);
  }, []);
  const closeModal = useCallback(() => setIsOpen(false), []);

  const value = useMemo(
    () => ({ isOpen, selectedPlan, openModal, closeModal }),
    [isOpen, selectedPlan, openModal, closeModal]
  );

  return <LeadModalContext.Provider value={value}>{children}</LeadModalContext.Provider>;
}

export function useLeadModal() {
  const ctx = useContext(LeadModalContext);
  if (!ctx) {
    throw new Error("useLeadModal debe usarse dentro de <LeadModalStateProvider>");
  }
  return ctx;
}
