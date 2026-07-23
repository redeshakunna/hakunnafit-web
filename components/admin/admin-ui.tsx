import type { DashboardAccess, LandingStatus, PlanKey } from "@/lib/admin-actions";
import {
  DASHBOARD_STATUSES,
  LANDING_STATUSES,
  PLANS,
  planLabel,
} from "@/lib/catalog";

export const planLabels: Record<PlanKey, string> = Object.fromEntries(
  PLANS.map((p) => [p.key, p.label])
) as Record<PlanKey, string>;

export const landingLabels: Record<LandingStatus, string> = Object.fromEntries(
  LANDING_STATUSES.map((s) => [s.key, s.label])
) as Record<LandingStatus, string>;

export const accessLabels: Record<DashboardAccess, string> = Object.fromEntries(
  DASHBOARD_STATUSES.map((s) => [s.key, s.label])
) as Record<DashboardAccess, string>;

export { planLabel };

export function fmtDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

export function fmtCOP(n: number) {
  return `$${new Intl.NumberFormat("es-CO").format(n)} COP`;
}

export function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "good" | "warn" | "bad" | "purple";
}) {
  const tones: Record<string, string> = {
    neutral: "bg-white/10 text-white/70",
    good: "bg-emerald-500/15 text-emerald-400",
    warn: "bg-amber-500/15 text-amber-400",
    bad: "bg-red-500/15 text-red-400",
    purple: "bg-hf-purple/15 text-hf-purple",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}

export function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "ahora mismo";
  if (min < 60) return `hace ${min} min`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `hace ${hrs} h`;
  const days = Math.floor(hrs / 24);
  return `hace ${days} d`;
}

export function planTone(plan: PlanKey | null): "neutral" | "good" | "warn" | "purple" {
  if (plan === "elite") return "warn";
  if (plan === "pro") return "purple";
  if (plan === "starter") return "good";
  return "neutral";
}
