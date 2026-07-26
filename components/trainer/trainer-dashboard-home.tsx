import Link from "next/link";
import { Users, Globe, CreditCard, Sparkles, Clock, CalendarClock, ArrowRight } from "lucide-react";
import type { TrainerRow } from "@/lib/admin-actions";
import type { OwnClientStats, OwnActivityRow } from "@/lib/trainer-actions";
import type { ClientRow, UpcomingEvaluationRow } from "@/lib/trainer-clients-actions";
import { canEditLanding, isSuspendedTrainer } from "@/lib/admin-helpers";
import { planLabel, landingStatusLabel, PLAN_CLIENT_CAP, type LandingStatusKey } from "@/lib/catalog";

const STATUS_LABEL: Record<string, string> = {
  pendiente_evaluacion: "Por evaluar",
  activo: "Activo",
  pausado: "Pausado",
  inactivo: "Inactivo",
};

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  return `hace ${days} d`;
}

export function TrainerDashboardHome({
  trainer,
  clientStats,
  recentClients,
  recentActivity,
  upcomingEvaluations,
}: {
  trainer: TrainerRow;
  clientStats: OwnClientStats;
  recentClients: ClientRow[];
  recentActivity: OwnActivityRow[];
  upcomingEvaluations: UpcomingEvaluationRow[];
}) {
  const unlocked = canEditLanding(trainer);
  const suspended = isSuspendedTrainer(trainer);
  const cap = PLAN_CLIENT_CAP[trainer.plan ?? "starter"];

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-xl font-bold text-white">Hola, {trainer.business_name}</h1>
      <p className="mt-1 text-sm text-white/50">
        Plan {planLabel(trainer.plan)} · Landing {landingStatusLabel(trainer.landing_status as LandingStatusKey)}
      </p>

      {!unlocked && (
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
          <Clock size={18} className="mt-0.5 shrink-0 text-amber-400" />
          <div>
            <p className="text-sm font-semibold text-amber-400">Tu landing está en diseño</p>
            <p className="mt-1 text-xs text-white/60">
              Nuestro equipo está diseñando tu landing a la medida. En cuanto quede publicada vas a poder editar
              todo desde aquí.
            </p>
          </div>
        </div>
      )}

      {suspended && (
        <div className="mt-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-semibold text-red-400">
          Tu cuenta está suspendida. Ve a Mi Negocio para ver el estado de tu pago.
        </div>
      )}

      {/* KPIs */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard icon={Users} label="Clientes" value={`${clientStats.total} / ${cap}`} />
        <KpiCard icon={Sparkles} label="Prospectos" value={String(clientStats.prospectos)} />
        <Link href="/panel/sitio-web">
          <KpiCard icon={Globe} label="Landing" value={landingStatusLabel(trainer.landing_status as LandingStatusKey)} />
        </Link>
        <Link href="/panel/negocio">
          <KpiCard icon={CreditCard} label="Plan" value={planLabel(trainer.plan)} />
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Próximas citas */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Próximas citas</p>
            <CalendarClock size={15} className="text-white/40" />
          </div>
          <div className="mt-3 space-y-2">
            {upcomingEvaluations.length === 0 && (
              <p className="text-xs text-white/40">No tienes evaluaciones agendadas.</p>
            )}
            {upcomingEvaluations.map((ev) => (
              <div key={ev.id} className="flex items-center justify-between rounded-xl bg-white/[0.02] px-3 py-2">
                <span className="text-xs font-medium text-white/80">{ev.client_full_name}</span>
                <span className="text-[11px] text-white/40">
                  {new Date(ev.scheduled_at).toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" })}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Actividad reciente */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Actividad reciente</p>
          <div className="mt-3 space-y-2">
            {recentActivity.length === 0 && <p className="text-xs text-white/40">Sin actividad todavía.</p>}
            {recentActivity.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-2 rounded-xl bg-white/[0.02] px-3 py-2">
                <span className="text-xs text-white/80">{a.title}</span>
                <span className="shrink-0 text-[11px] text-white/40">{timeAgo(a.created_at)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Clientes recientes */}
      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/50">Clientes recientes</p>
          <Link href="/panel/clientes" className="flex items-center gap-1 text-[11px] font-semibold text-hf-blue">
            Ver todos <ArrowRight size={11} />
          </Link>
        </div>
        <div className="mt-3 space-y-2">
          {recentClients.length === 0 && <p className="text-xs text-white/40">Todavía no tienes clientes registrados.</p>}
          {recentClients.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-xl bg-white/[0.02] px-3 py-2">
              <span className="text-xs font-medium text-white/80">{c.full_name}</span>
              <span className="text-[11px] text-white/40">{STATUS_LABEL[c.status] ?? c.status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Accesos rápidos */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <PanelCard
          href="/panel/marca"
          icon={Sparkles}
          title="Mi Marca"
          description="Logo, colores, foto, bio y redes."
          disabled={!unlocked}
        />
        <PanelCard
          href="/panel/sitio-web"
          icon={Globe}
          title="Mi Sitio Web"
          description="Secciones, servicios, FAQ y galería."
          disabled={!unlocked}
        />
        <PanelCard
          href="/panel/negocio"
          icon={CreditCard}
          title="Mi Negocio"
          description="Tu plan, pagos y uso de clientes."
        />
      </div>
    </div>
  );
}

function KpiCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-white/20">
      <Icon size={16} className="text-white/40" />
      <p className="mt-2 text-lg font-bold text-white">{value}</p>
      <p className="text-[11px] text-white/40">{label}</p>
    </div>
  );
}

function PanelCard({
  href,
  icon: Icon,
  title,
  description,
  disabled,
}: {
  href: string;
  icon: React.ElementType;
  title: string;
  description: string;
  disabled?: boolean;
}) {
  const content = (
    <div
      className={`h-full rounded-2xl border p-5 transition-colors ${
        disabled
          ? "border-white/5 bg-white/[0.02] opacity-50"
          : "border-white/10 bg-white/[0.03] hover:border-white/20"
      }`}
    >
      <Icon size={20} className="text-white/70" />
      <p className="mt-3 text-sm font-semibold text-white">{title}</p>
      <p className="mt-1 text-xs text-white/50">{description}</p>
    </div>
  );

  if (disabled) return content;
  return <Link href={href}>{content}</Link>;
}
