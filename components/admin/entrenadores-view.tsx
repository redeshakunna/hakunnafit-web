"use client";

import { Suspense, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Users, UserCheck, UserPlus, Contact, DollarSign } from "lucide-react";
import { updateTrainer, deleteTrainer, type TrainerRow } from "@/lib/admin-actions";
import { PLANS, PLAN_PRICE_COP } from "@/lib/catalog";
import { getPaymentStatus, isActiveTrainer, isSuspendedTrainer, paymentStatusLabels, type PaymentStatus } from "@/lib/admin-helpers";
import { KpiCard } from "./kpi-card";
import { Pill, accessLabels, fmtCOP, fmtDate, landingLabels, planLabels, planTone } from "./admin-ui";
import { TrainerEditModal } from "./trainer-edit-modal";

const paymentTone: Record<PaymentStatus, "neutral" | "good" | "warn" | "bad"> = {
  al_dia: "good",
  proximo_vencer: "warn",
  vencido: "bad",
  sin_datos: "neutral",
  suspendido: "bad",
};

// Lee ?edit=<id> de la URL para abrir directo el editor de un entrenador —
// usado por el botón "Administrar" de la pantalla de Landings, que enlaza
// aquí en vez de duplicar el modal de edición en otra vista. useSearchParams
// necesita un límite de Suspense propio.
function EditParamWatcher({ onEdit }: { onEdit: (id: string) => void }) {
  const params = useSearchParams();
  useEffect(() => {
    const id = params.get("edit");
    if (id) onEdit(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);
  return null;
}

export function EntrenadoresView({ initialTrainers }: { initialTrainers: TrainerRow[] }) {
  const router = useRouter();
  const [trainers, setTrainers] = useState(initialTrainers);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("todos");
  const [paymentFilter, setPaymentFilter] = useState<string>("todos");
  const [cityFilter, setCityFilter] = useState<string>("todas");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const cities = useMemo(
    () => Array.from(new Set(trainers.map((t) => t.ciudad).filter((c): c is string => !!c))).sort(),
    [trainers]
  );

  const filtered = useMemo(() => {
    return trainers.filter((t) => {
      if (planFilter !== "todos" && t.plan !== planFilter) return false;
      if (paymentFilter !== "todos" && getPaymentStatus(t.proximo_cobro, isSuspendedTrainer(t)) !== paymentFilter) return false;
      if (cityFilter !== "todas" && t.ciudad !== cityFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !t.business_name.toLowerCase().includes(q) &&
          !(t.email ?? "").toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [trainers, search, planFilter, paymentFilter, cityFilter]);

  const selected = trainers.find((t) => t.id === selectedId) ?? null;

  const totalTrainers = trainers.length;
  const activeTrainers = trainers.filter(isActiveTrainer).length;
  const mrrCop = trainers.filter(isActiveTrainer).reduce((sum, t) => sum + (t.plan ? PLAN_PRICE_COP[t.plan] : 0), 0);
  const thisMonth = new Date();
  thisMonth.setDate(1);
  const newThisMonth = trainers.filter((t) => new Date(t.created_at) >= thisMonth).length;
  const totalClients = trainers.reduce((sum, t) => sum + t.client_count, 0);

  function patch(trainerId: string, fields: Partial<TrainerRow>) {
    setTrainers((ts) => ts.map((t) => (t.id === trainerId ? { ...t, ...fields } : t)));
    startTransition(async () => {
      const result = await updateTrainer({
        trainerId,
        plan: fields.plan ?? undefined,
        landingStatus: fields.landing_status,
        dashboardAccess: fields.dashboard_access,
        proximoCobro: fields.proximo_cobro,
        ciudad: fields.ciudad,
        businessName: fields.business_name,
        whatsapp: fields.whatsapp,
        email: fields.email ?? undefined,
        pais: fields.pais,
        especialidad: fields.especialidad,
        instagram: fields.instagram,
        facebook: fields.facebook,
        biografia: fields.biografia,
        avatarUrl: fields.avatar_url,
        notasInternas: fields.notas_internas,
        dominioPropio: fields.dominio_propio,
      });
      if (!result.ok) alert(result.error ?? "No se pudo guardar el cambio.");
      router.refresh();
    });
  }

  function toggleSuspend(trainer: TrainerRow) {
    // Starter no tiene dashboard — su señal de "activo" es la landing
    // publicada, así que suspenderlo debe mover ese estado, no dashboard_access
    // (que el servidor siempre fuerza a sin_acceso para este plan).
    if (trainer.plan === "starter") {
      patch(trainer.id, {
        landing_status: trainer.landing_status === "suspendida" ? "publicada" : "suspendida",
      });
      return;
    }
    patch(trainer.id, {
      dashboard_access: trainer.dashboard_access === "suspendido" ? "activo" : "suspendido",
    });
  }

  function handleDelete(trainer: TrainerRow) {
    if (
      !confirm(
        `¿Eliminar definitivamente a ${trainer.business_name}? Esta acción no se puede deshacer.`
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await deleteTrainer(trainer.id);
      if (!result.ok) {
        alert(result.error ?? "No se pudo eliminar el entrenador.");
        return;
      }
      setTrainers((ts) => ts.filter((t) => t.id !== trainer.id));
      setSelectedId(null);
      router.refresh();
    });
  }

  return (
    <div>
      <Suspense fallback={null}>
        <EditParamWatcher onEdit={setSelectedId} />
      </Suspense>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">Entrenadores</h1>
          <p className="mt-1 text-sm text-white/50">Gestiona todos los entrenadores activos.</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <KpiCard icon={<Users size={17} />} label="Total entrenadores" value={totalTrainers} tone="purple" />
        <KpiCard icon={<UserCheck size={17} />} label="Entrenadores activos" value={activeTrainers} tone="green" />
        <KpiCard icon={<DollarSign size={17} />} label="Ingresos mensuales activos" value={fmtCOP(mrrCop)} tone="pink" />
        <KpiCard icon={<UserPlus size={17} />} label="Nuevos este mes" value={newThisMonth} tone="blue" />
        <KpiCard icon={<Contact size={17} />} label="Clientes totales" value={totalClients} tone="amber" />
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar entrenador..."
          className="h-10 flex-1 min-w-[200px] rounded-xl border border-white/15 bg-white/5 px-4 text-sm text-white placeholder:text-white/30 focus:border-hf-blue focus:outline-none"
        />
        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value)}
          className="h-10 rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white"
        >
          <option value="todos" className="bg-[#0b0f1a] text-white">Plan: todos</option>
          {PLANS.map((p) => (
            <option key={p.key} value={p.key} className="bg-[#0b0f1a] text-white">
              {p.label}
            </option>
          ))}
        </select>
        <select
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value)}
          className="h-10 rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white"
        >
          <option value="todos" className="bg-[#0b0f1a] text-white">Estado pago: todos</option>
          <option value="al_dia" className="bg-[#0b0f1a] text-white">Al día</option>
          <option value="proximo_vencer" className="bg-[#0b0f1a] text-white">Próximo a vencer</option>
          <option value="vencido" className="bg-[#0b0f1a] text-white">Vencido</option>
          <option value="sin_datos" className="bg-[#0b0f1a] text-white">Sin datos</option>
          <option value="suspendido" className="bg-[#0b0f1a] text-white">Suspendido</option>
        </select>
        <select
          value={cityFilter}
          onChange={(e) => setCityFilter(e.target.value)}
          className="h-10 rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white"
        >
          <option value="todas" className="bg-[#0b0f1a] text-white">Ciudad: todas</option>
          {cities.map((c) => (
            <option key={c} value={c} className="bg-[#0b0f1a] text-white">
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 overflow-x-auto rounded-2xl border border-white/10">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="bg-white/[0.03] text-xs uppercase text-white/40">
            <tr>
              <th className="px-4 py-3">Entrenador</th>
              <th className="px-4 py-3">Ciudad</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Landing</th>
              <th className="px-4 py-3">Dashboard</th>
              <th className="px-4 py-3">Clientes</th>
              <th className="px-4 py-3">Próx. cobro</th>
              <th className="px-4 py-3">Estado pago</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.map((t) => {
              const payment = getPaymentStatus(t.proximo_cobro, isSuspendedTrainer(t));
              return (
                <tr
                  key={t.id}
                  onClick={() => setSelectedId(t.id)}
                  className={`cursor-pointer transition-colors ${selectedId === t.id ? "bg-white/[0.04]" : "hover:bg-white/[0.02]"}`}
                >
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
                  <td className="px-4 py-3 text-white/70">{t.ciudad ?? "—"}</td>
                  <td className="px-4 py-3">
                    {t.plan ? <Pill tone={planTone(t.plan)}>{planLabels[t.plan]}</Pill> : <Pill>—</Pill>}
                  </td>
                  <td className="px-4 py-3 text-white/70">{landingLabels[t.landing_status]}</td>
                  <td className="px-4 py-3 text-white/70">
                    {t.plan === "starter" ? "No aplica" : accessLabels[t.dashboard_access]}
                  </td>
                  <td className="px-4 py-3 text-white/70">{t.client_count}</td>
                  <td className="px-4 py-3 text-white/50">{fmtDate(t.proximo_cobro)}</td>
                  <td className="px-4 py-3">
                    <Pill tone={paymentTone[payment]}>{paymentStatusLabels[payment]}</Pill>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-white/40">
                  No hay entrenadores que coincidan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <TrainerEditModal
        trainer={selected}
        isPending={isPending}
        onClose={() => setSelectedId(null)}
        onPatch={patch}
        onToggleSuspend={toggleSuspend}
        onDelete={handleDelete}
      />
    </div>
  );
}
