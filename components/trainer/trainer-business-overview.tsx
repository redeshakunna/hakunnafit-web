import Link from "next/link";
import {
  CreditCard,
  Users,
  Globe,
  Smartphone,
  Bot,
  TrendingUp,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from "lucide-react";
import type { TrainerRow } from "@/lib/admin-actions";
import type { OwnClientStats } from "@/lib/trainer-actions";
import type { PlanPrices } from "@/lib/plan-settings-actions";
import {
  planLabel,
  landingStatusLabel,
  dashboardStatusLabel,
  PLAN_CLIENT_CAP,
  PLAN_FEATURES,
  PLANS,
  FEATURE_DESCRIPTIONS,
  type LandingStatusKey,
  type DashboardStatusKey,
  type PlanKey,
} from "@/lib/catalog";
import { hasFeature, minPlanForFeature, isSuspendedTrainer, getPaymentStatus, paymentStatusLabels } from "@/lib/admin-helpers";

const cop = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

function formatDate(iso: string | null): string {
  if (!iso) return "Sin fecha";
  return new Date(iso).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });
}

export function TrainerBusinessOverview({
  trainer,
  planPrices,
  clientStats,
}: {
  trainer: TrainerRow;
  planPrices: PlanPrices;
  clientStats: OwnClientStats;
}) {
  const plan: PlanKey = trainer.plan ?? "starter";
  const suspended = isSuspendedTrainer(trainer);
  const paymentStatus = getPaymentStatus(trainer.proximo_cobro, suspended);
  const clientCap = PLAN_CLIENT_CAP[plan];
  const clientPct = Math.min(100, Math.round((clientStats.total / clientCap) * 100));
  const nearCap = clientStats.total >= clientCap;
  const landingUrl = trainer.subdominio ? `https://${trainer.subdominio}.hakunnafit.com` : null;

  const nextPlan: PlanKey | null = plan === "starter" ? "pro" : plan === "pro" ? "elite" : null;
  const newFeatures = nextPlan ? PLAN_FEATURES[nextPlan].filter((f) => !PLAN_FEATURES[plan].includes(f)) : [];

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-xl font-bold text-white">Mi Negocio</h1>
      <p className="mt-1 text-sm text-white/50">El estado de tu cuenta, tu plan y tu operación en Hakunna Fit.</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Plan actual */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-center gap-2 text-white/50">
            <CreditCard size={16} />
            <p className="text-xs font-semibold uppercase tracking-wide">Plan actual</p>
          </div>
          <p className="mt-3 text-2xl font-bold text-white">{planLabel(plan)}</p>
          <p className="mt-1 text-sm text-white/50">{cop.format(planPrices[plan].monthlyCop)} / mes</p>
          <span
            className={`mt-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              suspended ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-400"
            }`}
          >
            {suspended ? <AlertTriangle size={12} /> : <CheckCircle2 size={12} />}
            {suspended ? "Suspendido" : "Activo"}
          </span>
        </div>

        {/* Próximo pago */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-center gap-2 text-white/50">
            <Clock size={16} />
            <p className="text-xs font-semibold uppercase tracking-wide">Próximo pago</p>
          </div>
          <p className="mt-3 text-lg font-bold text-white">{formatDate(trainer.proximo_cobro)}</p>
          <p className="mt-1 text-sm text-white/50">
            Referencia mensual: {cop.format(planPrices[plan].monthlyCop)}
          </p>
          <span
            className={`mt-3 inline-block rounded-full px-2.5 py-1 text-[11px] font-semibold ${
              paymentStatus === "al_dia"
                ? "bg-emerald-500/10 text-emerald-400"
                : paymentStatus === "proximo_vencer"
                  ? "bg-amber-500/10 text-amber-400"
                  : paymentStatus === "vencido" || paymentStatus === "suspendido"
                    ? "bg-red-500/10 text-red-400"
                    : "bg-white/10 text-white/50"
            }`}
          >
            {paymentStatusLabels[paymentStatus]}
          </span>
        </div>

        {/* Uso de clientes */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-center gap-2 text-white/50">
            <Users size={16} />
            <p className="text-xs font-semibold uppercase tracking-wide">Clientes</p>
          </div>
          <p className="mt-3 text-2xl font-bold text-white">
            {clientStats.total} <span className="text-sm font-normal text-white/40">/ {clientCap}</span>
          </p>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className={`h-full rounded-full ${nearCap ? "bg-red-400" : "bg-hf-blue"}`}
              style={{ width: `${clientPct}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-white/40">
            {clientStats.activos} activos · {clientStats.prospectos} prospectos
          </p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* Estado landing */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-center gap-2 text-white/50">
            <Globe size={16} />
            <p className="text-xs font-semibold uppercase tracking-wide">Landing</p>
          </div>
          <p className="mt-3 text-sm font-semibold text-white">
            {landingStatusLabel(trainer.landing_status as LandingStatusKey)}
          </p>
          {trainer.landing_published_at && (
            <p className="mt-1 text-xs text-white/40">Publicada el {formatDate(trainer.landing_published_at)}</p>
          )}
          {landingUrl && (
            <a
              href={landingUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-hf-blue hover:underline"
            >
              Ver landing <ExternalLink size={12} />
            </a>
          )}
        </div>

        {/* Estado app / dashboard */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-center gap-2 text-white/50">
            <Smartphone size={16} />
            <p className="text-xs font-semibold uppercase tracking-wide">App para clientes</p>
          </div>
          {hasFeature(plan, "App Cliente") ? (
            <>
              <p className="mt-3 text-sm font-semibold text-white">
                {dashboardStatusLabel(trainer.dashboard_access as DashboardStatusKey)}
              </p>
              <p className="mt-1 text-xs text-white/40">Incluida en tu plan {planLabel(plan)}.</p>
            </>
          ) : (
            <>
              <p className="mt-3 text-sm font-semibold text-white/40">No incluida</p>
              <p className="mt-1 text-xs text-white/40">
                Disponible desde plan {planLabel(minPlanForFeature("App Cliente"))}.
              </p>
            </>
          )}
        </div>

        {/* Uso HakAI */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-center gap-2 text-white/50">
            <Bot size={16} />
            <p className="text-xs font-semibold uppercase tracking-wide">HakAI</p>
          </div>
          {hasFeature(plan, "HakAI") ? (
            <>
              <p className="mt-3 text-sm font-semibold text-white">Incluido en tu plan</p>
              <p className="mt-1 text-xs text-white/40">{FEATURE_DESCRIPTIONS["HakAI"]}</p>
            </>
          ) : (
            <>
              <p className="mt-3 text-sm font-semibold text-white/40">No incluido</p>
              <p className="mt-1 text-xs text-white/40">
                Disponible desde plan {planLabel(minPlanForFeature("HakAI"))}.
              </p>
            </>
          )}
        </div>
      </div>

      {nextPlan && (
        <div className="mt-4 rounded-2xl border border-hf-blue/30 bg-hf-blue/5 p-5">
          <div className="flex items-center gap-2 text-hf-blue">
            <TrendingUp size={16} />
            <p className="text-xs font-semibold uppercase tracking-wide">Sugerencia de upgrade</p>
          </div>
          <p className="mt-2 text-sm font-semibold text-white">
            Pasa a {planLabel(nextPlan)} ({cop.format(planPrices[nextPlan].monthlyCop)}/mes) y desbloquea:
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {newFeatures.map((f) => (
              <li key={f} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-white/70">
                {f}
              </li>
            ))}
          </ul>
          <a
            href={`https://wa.me/${(trainer.whatsapp ?? "").replace(/\D/g, "")}?text=${encodeURIComponent(
              `Hola, quiero subir mi plan de ${planLabel(plan)} a ${planLabel(nextPlan)} en Hakunna Fit.`
            )}`}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-block rounded-full bg-hf-blue px-4 py-2 text-xs font-bold text-black hover:opacity-90"
          >
            Escríbenos para subir de plan
          </a>
        </div>
      )}

      <p className="mt-6 text-xs text-white/30">
        Planes disponibles: {PLANS.map((p) => p.label).join(" · ")}. Los cambios de plan y de ciclo de pago los
        procesa el equipo de Hakunna Fit. ¿Buscas los paquetes que le vendes a tus clientes? Ahora se editan en{" "}
        <Link href="/panel/sitio-web" className="font-semibold text-hf-blue hover:underline">
          Mi Sitio Web
        </Link>
        .
      </p>
    </div>
  );
}
