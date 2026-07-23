import { Users, UserCheck, DollarSign, CalendarClock, Inbox } from "lucide-react";
import type { DashboardStats, TrainerRow } from "@/lib/admin-actions";
import { KpiCard } from "./kpi-card";
import { Pill, fmtCOP, fmtDate, landingLabels, planLabels, planTone } from "./admin-ui";

const PLAN_COLORS: Record<string, string> = { starter: "#00C8FF", pro: "#6D2EFF", elite: "#FF2DB8" };

export function DashboardHome({ stats, trainers }: { stats: DashboardStats; trainers: TrainerRow[] }) {
  const top = trainers.slice(0, 5);
  const totalPlan = stats.planDistribution.starter + stats.planDistribution.pro + stats.planDistribution.elite;

  let acc = 0;
  const donutStops = (["starter", "pro", "elite"] as const).map((key) => {
    const value = stats.planDistribution[key];
    const pct = totalPlan ? (value / totalPlan) * 100 : 0;
    const start = acc;
    acc += pct;
    return { key, value, pct, start, end: acc };
  });

  const maxDay = Math.max(1, ...stats.newTrainersByDay.map((d) => d.count));

  return (
    <div>
      <div>
        <h1 className="text-xl font-bold text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-white/50">Resumen general de HakunnaFit.</p>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <KpiCard icon={<Inbox size={17} />} label="Solicitudes" value={stats.totalLeads} tone="blue" />
        <KpiCard icon={<Users size={17} />} label="Entrenadores totales" value={stats.totalTrainers} tone="purple" />
        <KpiCard icon={<UserCheck size={17} />} label="Entrenadores activos" value={stats.activeTrainers} tone="green" />
        <KpiCard icon={<DollarSign size={17} />} label="Ingresos recurrentes (mes)" value={fmtCOP(stats.mrrCop)} tone="pink" />
        <KpiCard
          icon={<CalendarClock size={17} />}
          label="Próximos cobros (7 días)"
          value={stats.upcomingCharges.length}
          tone="amber"
        />
      </div>

      <div className="mt-6 grid gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:grid-cols-3">
        <div>
          <p className="text-xs text-white/40">Leads sin contactar</p>
          <p className="mt-1 font-[family-name:var(--font-hf-heading)] text-lg font-bold text-white">{stats.leadsUncontacted}</p>
        </div>
        <div>
          <p className="text-xs text-white/40">Landings pendientes de publicar</p>
          <p className="mt-1 font-[family-name:var(--font-hf-heading)] text-lg font-bold text-white">{stats.landingsPending}</p>
        </div>
        <div>
          <p className="text-xs text-white/40">Próximo cobro más cercano</p>
          <p className="mt-1 font-[family-name:var(--font-hf-heading)] text-lg font-bold text-white">
            {stats.upcomingCharges[0]
              ? `${stats.upcomingCharges[0].businessName} — ${fmtDate(stats.upcomingCharges[0].date)}`
              : "Sin pendientes"}
          </p>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-white/10">
        <div className="flex items-center justify-between px-4 pt-4">
          <p className="text-sm font-semibold text-white">Entrenadores recientes</p>
        </div>
        <table className="mt-3 w-full min-w-[700px] text-left text-sm">
          <thead className="bg-white/[0.03] text-xs uppercase text-white/40">
            <tr>
              <th className="px-4 py-3">Entrenador</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Landing</th>
              <th className="px-4 py-3">Clientes</th>
              <th className="px-4 py-3">Próximo cobro</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {top.map((t) => (
              <tr key={t.id}>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={t.avatar_url || "/images/NO_image.png"}
                      alt=""
                      className="h-8 w-8 shrink-0 rounded-full border border-white/10 object-cover"
                    />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-white">{t.business_name}</p>
                      <p className="truncate text-white/40">{t.email ?? "—"}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  {t.plan ? <Pill tone={planTone(t.plan)}>{planLabels[t.plan]}</Pill> : <Pill>—</Pill>}
                </td>
                <td className="px-4 py-3 text-white/70">{landingLabels[t.landing_status]}</td>
                <td className="px-4 py-3 text-white/70">{t.client_count}</td>
                <td className="px-4 py-3 text-white/50">{fmtDate(t.proximo_cobro)}</td>
              </tr>
            ))}
            {top.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-white/40">
                  Aún no hay entrenadores activados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-sm font-semibold text-white">Nuevos entrenadores (30 días)</p>
          {stats.newTrainersByDay.length === 0 ? (
            <p className="mt-4 text-sm text-white/40">Sin datos todavía.</p>
          ) : (
            <div className="mt-5 flex h-32 items-end gap-1.5">
              {stats.newTrainersByDay.map((d) => (
                <div key={d.date} className="flex-1" title={`${d.date}: ${d.count}`}>
                  <div
                    className="rounded-t-sm"
                    style={{
                      height: `${Math.max(6, (d.count / maxDay) * 100)}%`,
                      background: "linear-gradient(180deg,#00C8FF,#6D2EFF)",
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-sm font-semibold text-white">Distribución por plan</p>
          <div className="mt-4 flex items-center gap-6">
            <div
              className="h-28 w-28 shrink-0 rounded-full"
              style={{
                background: totalPlan
                  ? `conic-gradient(${donutStops
                      .map((s) => `${PLAN_COLORS[s.key]} ${s.start}% ${s.end}%`)
                      .join(", ")})`
                  : "#ffffff14",
              }}
            >
              <div className="flex h-full w-full items-center justify-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-hf-black text-center font-[family-name:var(--font-hf-heading)] text-sm font-bold text-white">
                  {totalPlan}
                </div>
              </div>
            </div>
            <div className="space-y-2">
              {(["starter", "pro", "elite"] as const).map((key) => (
                <div key={key} className="flex items-center gap-2 text-xs text-white/70">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: PLAN_COLORS[key] }} />
                  {planLabels[key]} — {stats.planDistribution[key]}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
