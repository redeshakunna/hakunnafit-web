"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X,
  Camera,
  Instagram,
  Facebook,
  Globe,
  MapPin,
  Calendar,
  Copy,
  CheckCircle2,
  Circle,
  Lock,
  LogIn,
  Users,
  ArrowRight,
  Trash2,
} from "lucide-react";
import type {
  DashboardAccess,
  LandingStatus,
  PlanKey,
  TrainerRow,
  TrainerActivityRow,
  TrainerContentStats,
} from "@/lib/admin-actions";
import { listTrainerActivity, getTrainerContentStats, uploadTrainerAvatar } from "@/lib/admin-actions";
import {
  DASHBOARD_STATUSES,
  LANDING_STATUSES,
  PLANS,
  PLAN_PRICE_COP,
  PLAN_CLIENT_CAP,
  PLAN_FEATURES,
  FEATURE_DESCRIPTIONS,
  type FeatureKey,
} from "@/lib/catalog";
import { fmtCOP, fmtDate, timeAgo, Pill, planTone } from "./admin-ui";
import { getPaymentStatus, isActiveTrainer, isSuspendedTrainer, paymentStatusLabels } from "@/lib/admin-helpers";

type TabKey = "info" | "suscripcion" | "actividad";

const activityLabels: Record<string, string> = {
  cuenta_creada: "Cuenta creada",
  plan_cambiado: "Plan actualizado",
  estado_cambiado: "Cambio de estado",
  suspendido: "Entrenador suspendido",
  reactivado: "Entrenador reactivado",
  informacion_actualizada: "Información actualizada",
};

/**
 * Checklist de progreso — solo incluye señales que de verdad podemos
 * verificar en la base de datos hoy (nada de "branding", "app móvil" o
 * "automatizaciones", que todavía no existen como funcionalidad real).
 */
function getSetupChecklist(trainer: TrainerRow, clientCount: number) {
  const items: { label: string; done: boolean }[] = [
    {
      label: "Información básica",
      done: !!(trainer.business_name && trainer.whatsapp && trainer.ciudad),
    },
    {
      label: trainer.plan === "starter" ? "Landing creada" : "Landing publicada",
      done:
        trainer.plan === "starter"
          ? trainer.landing_status !== "pendiente"
          : trainer.landing_status === "publicada",
    },
  ];

  if (trainer.plan === "starter") {
    items.push({ label: "Formulario de contacto", done: true });
    items.push({
      label: "Personaliza tu landing",
      done: trainer.landing_status === "en_revision" || trainer.landing_status === "publicada",
    });
    items.push({ label: "Primera publicación", done: trainer.landing_status === "publicada" });
  } else {
    items.push({ label: "Dashboard activo", done: trainer.dashboard_access === "activo" });
    items.push({ label: "Primer cliente", done: clientCount > 0 });
    if (trainer.plan === "elite") {
      items.push({ label: "Dominio propio", done: !!trainer.dominio_propio });
    }
  }

  return items;
}

export function TrainerEditModal({
  trainer,
  isPending,
  onClose,
  onPatch,
  onToggleSuspend,
  onDelete,
}: {
  trainer: TrainerRow | null;
  isPending: boolean;
  onClose: () => void;
  onPatch: (trainerId: string, fields: Partial<TrainerRow>) => void;
  onToggleSuspend: (trainer: TrainerRow) => void;
  onDelete: (trainer: TrainerRow) => void;
}) {
  const [tab, setTab] = useState<TabKey>("info");
  const [activity, setActivity] = useState<TrainerActivityRow[]>([]);
  const [stats, setStats] = useState<TrainerContentStats | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTab("info");
    if (!trainer) return;
    listTrainerActivity(trainer.id).then(setActivity);
    if (trainer.plan !== "starter") {
      getTrainerContentStats(trainer.id).then(setStats);
    } else {
      setStats(null);
    }
  }, [trainer?.id]);

  const checklist = useMemo(() => (trainer ? getSetupChecklist(trainer, trainer.client_count) : []), [trainer]);
  const progressPct = checklist.length
    ? Math.round((checklist.filter((i) => i.done).length / checklist.length) * 100)
    : 0;

  if (!trainer) return null;

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !trainer) return;
    setUploadingAvatar(true);
    const formData = new FormData();
    formData.set("avatar", file);
    const result = await uploadTrainerAvatar(trainer.id, formData);
    setUploadingAvatar(false);
    if (!result.ok) {
      alert(result.error ?? "No se pudo subir la foto.");
      return;
    }
    onPatch(trainer.id, { avatar_url: result.url ?? null });
  }

  /**
   * Aplica el cambio de plan más los datos adicionales que ese plan necesita
   * (recolectados por UpsellPanel cuando faltan) en un solo guardado.
   */
  function applyUpgrade(newPlan: PlanKey, extra: UpgradeExtra) {
    if (!trainer) return;
    onPatch(trainer.id, {
      plan: newPlan,
      ...(extra.dashboardAccess ? { dashboard_access: extra.dashboardAccess } : {}),
      ...(extra.proximoCobro ? { proximo_cobro: extra.proximoCobro } : {}),
      ...(extra.dominioPropio ? { dominio_propio: extra.dominioPropio } : {}),
    });
  }

  const paymentStatus = getPaymentStatus(trainer.proximo_cobro, isSuspendedTrainer(trainer));
  const clientCap = trainer.plan ? PLAN_CLIENT_CAP[trainer.plan] : null;

  return (
    <AnimatePresence>
      {trainer && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            role="dialog"
            aria-modal="true"
            className="relative z-10 flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[2rem] border border-white/10 bg-[#0b0f1a]"
          >
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="absolute right-5 top-5 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white/60 hover:border-white/30 hover:text-white"
            >
              <X size={16} />
            </button>

            <div className="overflow-y-auto p-6 sm:p-8">
              {/* Header de identidad */}
              <div className="flex flex-col gap-5 pr-10 sm:flex-row sm:items-start">
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-white/10 bg-white/5">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={trainer.avatar_url || "/images/NO_image.png"}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    aria-label="Cambiar foto"
                    className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full border border-white/20 bg-[#0b0f1a] text-white/70 hover:text-white disabled:opacity-50"
                  >
                    <Camera size={12} />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={handleAvatarChange}
                  />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-[family-name:var(--font-hf-heading)] text-lg font-bold text-white">
                      {trainer.business_name}
                    </p>
                    <Pill tone={isSuspendedTrainer(trainer) ? "bad" : "good"}>
                      {isSuspendedTrainer(trainer) ? "Suspendido" : "Activo"}
                    </Pill>
                    {trainer.plan && <Pill tone={planTone(trainer.plan)}>{PLANS.find((p) => p.key === trainer.plan)?.label}</Pill>}
                    <span className="text-[11px] text-white/30">HF-{trainer.id.slice(0, 6).toUpperCase()}</span>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/50">
                    <span>{trainer.email ?? "—"}</span>
                    {trainer.whatsapp && <span>{trainer.whatsapp}</span>}
                    {(trainer.ciudad || trainer.pais) && (
                      <span className="flex items-center gap-1">
                        <MapPin size={12} />
                        {[trainer.ciudad, trainer.pais].filter(Boolean).join(", ")}
                      </span>
                    )}
                    {trainer.especialidad && (
                      <span className="flex items-center gap-1">
                        <Globe size={12} />
                        {trainer.especialidad}
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-[11px] text-white/30">
                    <Calendar size={11} />
                    Registrado el {fmtDate(trainer.created_at)}
                  </div>
                </div>
              </div>

              {/* KPIs */}
              <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-[11px] text-white/40">Plan actual</p>
                  <p className="mt-1 font-[family-name:var(--font-hf-heading)] text-base font-bold text-white">
                    {trainer.plan ? PLANS.find((p) => p.key === trainer.plan)?.label : "—"}
                  </p>
                  <button
                    onClick={() => setTab("suscripcion")}
                    className="mt-2 text-[11px] font-semibold text-hf-blue hover:text-white"
                  >
                    Cambiar plan
                  </button>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-[11px] text-white/40">Clientes</p>
                  <p className="mt-1 font-[family-name:var(--font-hf-heading)] text-base font-bold text-white">
                    {trainer.client_count}
                    {clientCap ? <span className="text-white/40"> / {clientCap}</span> : null}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-[11px] text-white/40">Próximo cobro</p>
                  <p className="mt-1 font-[family-name:var(--font-hf-heading)] text-base font-bold text-white">
                    {fmtDate(trainer.proximo_cobro)}
                  </p>
                  <p className="text-[11px] text-white/40">{trainer.plan ? fmtCOP(PLAN_PRICE_COP[trainer.plan]) : "—"}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-[11px] text-white/40">Progreso de configuración</p>
                  <p className="mt-1 font-[family-name:var(--font-hf-heading)] text-base font-bold text-white">
                    {progressPct}%
                  </p>
                </div>
              </div>

              {/* Tabs */}
              <div className="mt-6 flex gap-1 border-b border-white/10">
                {(
                  [
                    { key: "info", label: "Información" },
                    { key: "suscripcion", label: "Suscripción" },
                    { key: "actividad", label: "Actividad" },
                  ] as { key: TabKey; label: string }[]
                ).map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`-mb-px border-b-2 px-3 py-2.5 text-xs font-semibold transition-colors ${
                      tab === t.key ? "border-hf-blue text-white" : "border-transparent text-white/50 hover:text-white"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Tab: Información */}
              {tab === "info" && (
                <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-white/40">Información general</p>
                    <div className="mt-3 grid gap-4 sm:grid-cols-2">
                      <Field label="Nombre del negocio" defaultValue={trainer.business_name} onSave={(v) => onPatch(trainer.id, { business_name: v })} />
                      <Field label="Correo (acceso a la cuenta)" type="email" defaultValue={trainer.email ?? ""} onSave={(v) => onPatch(trainer.id, { email: v })} />
                      <Field label="WhatsApp" defaultValue={trainer.whatsapp ?? ""} onSave={(v) => onPatch(trainer.id, { whatsapp: v })} />
                      <Field label="Ciudad" defaultValue={trainer.ciudad ?? ""} onSave={(v) => onPatch(trainer.id, { ciudad: v })} />
                      <Field label="País" defaultValue={trainer.pais ?? ""} placeholder="Ej: Colombia" onSave={(v) => onPatch(trainer.id, { pais: v })} />
                      <Field label="Especialidad" defaultValue={trainer.especialidad ?? ""} placeholder="Ej: Entrenamiento Online" onSave={(v) => onPatch(trainer.id, { especialidad: v })} />
                      <Field label="Instagram" icon={<Instagram size={13} />} defaultValue={trainer.instagram ?? ""} placeholder="@usuario" onSave={(v) => onPatch(trainer.id, { instagram: v })} />
                      <Field label="Facebook" icon={<Facebook size={13} />} defaultValue={trainer.facebook ?? ""} placeholder="/usuario" onSave={(v) => onPatch(trainer.id, { facebook: v })} />
                    </div>

                    <label className="mt-4 block">
                      <span className="mb-1 block text-[11px] text-white/50">Biografía</span>
                      <TextArea defaultValue={trainer.biografia ?? ""} onSave={(v) => onPatch(trainer.id, { biografia: v })} />
                    </label>

                    {trainer.plan === "starter" ? (
                      <p className="mt-4 text-[11px] text-white/30">
                        Starter no tiene dashboard — usa el estado de la landing (pestaña Suscripción) para
                        activar o suspender su presencia.
                      </p>
                    ) : (
                      <label className="mt-4 block">
                        <span className="mb-1 block text-[11px] text-white/50">Estado de la cuenta</span>
                        <select
                          value={trainer.dashboard_access}
                          onChange={(e) => onPatch(trainer.id, { dashboard_access: e.target.value as DashboardAccess })}
                          className="h-9 w-full max-w-xs rounded-lg border border-white/15 bg-white/5 px-2 text-xs text-white"
                        >
                          {DASHBOARD_STATUSES.map((s) => (
                            <option key={s.key} value={s.key} className="bg-[#0b0f1a] text-white">
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}

                    <label className="mt-4 block">
                      <span className="mb-1 block text-[11px] text-white/50">Notas internas (solo visible para administradores)</span>
                      <TextArea defaultValue={trainer.notas_internas ?? ""} onSave={(v) => onPatch(trainer.id, { notas_internas: v })} rows={3} />
                    </label>
                  </div>

                  <div className="space-y-4">
                    {/* Subdominio siempre visible */}
                    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                      <p className="text-xs font-semibold text-white/70">Subdominio</p>
                      <div className="mt-1.5 flex items-center justify-between gap-2">
                        <span className="truncate text-[12px] text-white/60">
                          {trainer.subdominio ? `${trainer.subdominio}.hakunnafit.com` : "Sin asignar"}
                        </span>
                        {trainer.subdominio && (
                          <button
                            onClick={() => navigator.clipboard.writeText(`${trainer.subdominio}.hakunnafit.com`)}
                            aria-label="Copiar subdominio"
                            className="shrink-0 text-white/40 hover:text-white"
                          >
                            <Copy size={13} />
                          </button>
                        )}
                      </div>
                      <p className="mt-2 flex items-center gap-1 text-[10px] text-white/30">
                        <Lock size={10} /> Ver landing estará disponible cuando exista el sitio multi-entrenador.
                      </p>
                    </div>

                    {trainer.plan === "elite" && (
                      <label className="block rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                        <span className="mb-1.5 block text-xs font-semibold text-white/70">Dominio propio</span>
                        <input
                          key={`dominio-${trainer.id}`}
                          defaultValue={trainer.dominio_propio ?? ""}
                          placeholder="Sin configurar"
                          onBlur={(e) => onPatch(trainer.id, { dominio_propio: e.target.value })}
                          className="h-9 w-full rounded-lg border border-white/15 bg-white/5 px-2 text-xs text-white"
                        />
                        <p className="mt-1.5 text-[10px] text-white/30">
                          Registro manual — la conexión DNS/SSL todavía no es automática.
                        </p>
                      </label>
                    )}

                    {trainer.plan === "starter" && (
                      <StarterFeaturePanel trainer={trainer} onUpgrade={(extra) => applyUpgrade("pro", extra)} />
                    )}
                    {trainer.plan === "pro" && (
                      <UpsellPanel target="elite" trainer={trainer} onUpgrade={(extra) => applyUpgrade("elite", extra)} />
                    )}
                    {trainer.plan === "elite" && (
                      <>
                        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                          <p className="text-xs font-semibold text-white/70">Estado del proyecto</p>
                          <ul className="mt-2 space-y-1.5">
                            {checklist.map((item) => (
                              <li key={item.label} className="flex items-center gap-2 text-[12px] text-white/70">
                                {item.done ? (
                                  <CheckCircle2 size={14} className="shrink-0 text-emerald-400" />
                                ) : (
                                  <Circle size={14} className="shrink-0 text-white/25" />
                                )}
                                {item.label}
                              </li>
                            ))}
                          </ul>
                        </div>
                        {stats && (
                          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                            <p className="flex items-center gap-1.5 text-xs font-semibold text-white/70">
                              <Users size={13} /> Clientes y contenido
                            </p>
                            <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                              <div>
                                <p className="font-[family-name:var(--font-hf-heading)] text-lg font-bold text-white">{stats.clients}</p>
                                <p className="text-[10px] text-white/40">Clientes</p>
                              </div>
                              <div>
                                <p className="font-[family-name:var(--font-hf-heading)] text-lg font-bold text-white">{stats.rutinas}</p>
                                <p className="text-[10px] text-white/40">Rutinas</p>
                              </div>
                              <div>
                                <p className="font-[family-name:var(--font-hf-heading)] text-lg font-bold text-white">{stats.evaluaciones}</p>
                                <p className="text-[10px] text-white/40">Evaluaciones</p>
                              </div>
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* Tab: Suscripción */}
              {tab === "suscripcion" && (
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-[11px] text-white/50">Plan</span>
                    <select
                      value={trainer.plan ?? ""}
                      onChange={(e) => onPatch(trainer.id, { plan: e.target.value as PlanKey })}
                      className="h-10 w-full rounded-lg border border-white/15 bg-white/5 px-2 text-sm text-white"
                    >
                      {PLANS.map((p) => (
                        <option key={p.key} value={p.key} className="bg-[#0b0f1a] text-white">
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2">
                    <span className="block text-[11px] text-white/50">Monto a cobrar (mensual)</span>
                    <span className="mt-0.5 block text-sm font-bold text-white">
                      {trainer.plan ? fmtCOP(PLAN_PRICE_COP[trainer.plan]) : "—"}
                    </span>
                  </div>

                  <label className="block">
                    <span className="mb-1 block text-[11px] text-white/50">Próximo cobro</span>
                    <input
                      type="date"
                      value={trainer.proximo_cobro ?? ""}
                      onChange={(e) => onPatch(trainer.id, { proximo_cobro: e.target.value })}
                      className="h-10 w-full rounded-lg border border-white/15 bg-white/5 px-2 text-sm text-white [color-scheme:dark]"
                    />
                  </label>

                  <div className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2">
                    <span className="block text-[11px] text-white/50">Estado de pago</span>
                    <span className="mt-1 block">
                      <Pill
                        tone={
                          paymentStatus === "al_dia"
                            ? "good"
                            : paymentStatus === "vencido" || paymentStatus === "suspendido"
                              ? "bad"
                              : paymentStatus === "proximo_vencer"
                                ? "warn"
                                : "neutral"
                        }
                      >
                        {paymentStatusLabels[paymentStatus]}
                      </Pill>
                    </span>
                  </div>

                  <label className="block sm:col-span-2">
                    <span className="mb-1 block text-[11px] text-white/50">Estado de landing</span>
                    <select
                      value={trainer.landing_status}
                      onChange={(e) => onPatch(trainer.id, { landing_status: e.target.value as LandingStatus })}
                      className="h-10 w-full max-w-xs rounded-lg border border-white/15 bg-white/5 px-2 text-sm text-white"
                    >
                      {LANDING_STATUSES.map((s) => (
                        <option key={s.key} value={s.key} className="bg-[#0b0f1a] text-white">
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}

              {/* Tab: Actividad */}
              {tab === "actividad" && (
                <div className="mt-6">
                  {activity.length === 0 ? (
                    <p className="py-8 text-center text-sm text-white/40">Todavía no hay actividad registrada.</p>
                  ) : (
                    <ul className="space-y-4">
                      {activity.map((a) => (
                        <li key={a.id} className="flex gap-3">
                          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-hf-blue" />
                          <div className="min-w-0 flex-1 border-b border-white/5 pb-3">
                            <p className="text-sm font-semibold text-white">{activityLabels[a.type] ?? a.title}</p>
                            {a.description && <p className="mt-0.5 text-xs text-white/50">{a.description}</p>}
                            <p className="mt-0.5 text-[11px] text-white/30">{timeAgo(a.created_at)}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 px-6 py-4 sm:px-8">
              <button onClick={onClose} className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold text-white/70 hover:border-white/30 hover:text-white">
                Cerrar
              </button>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  disabled
                  title="Disponible cuando exista el dashboard de entrenadores"
                  className="flex items-center gap-1.5 rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-white/30"
                >
                  <LogIn size={13} /> Entrar como entrenador
                </button>
                <button
                  disabled={isPending}
                  onClick={() => onToggleSuspend(trainer)}
                  className="rounded-full border border-red-500/30 px-4 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                >
                  {isSuspendedTrainer(trainer) ? "Reactivar entrenador" : "Suspender entrenador"}
                </button>
                <button
                  disabled={isPending || isActiveTrainer(trainer)}
                  onClick={() => onDelete(trainer)}
                  title={isActiveTrainer(trainer) ? "Suspende al entrenador antes de eliminarlo" : undefined}
                  className="flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/20 disabled:opacity-30"
                >
                  <Trash2 size={13} /> Eliminar entrenador
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function Field({
  label,
  defaultValue,
  placeholder,
  type = "text",
  icon,
  onSave,
}: {
  label: string;
  defaultValue: string;
  placeholder?: string;
  type?: string;
  icon?: React.ReactNode;
  onSave: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 flex items-center gap-1 text-[11px] text-white/50">
        {icon}
        {label}
      </span>
      <input
        key={defaultValue}
        type={type}
        defaultValue={defaultValue}
        placeholder={placeholder}
        onBlur={(e) => onSave(e.target.value)}
        className="h-9 w-full rounded-lg border border-white/15 bg-white/5 px-2 text-xs text-white placeholder:text-white/30"
      />
    </label>
  );
}

function TextArea({
  defaultValue,
  onSave,
  rows = 3,
}: {
  defaultValue: string;
  onSave: (value: string) => void;
  rows?: number;
}) {
  return (
    <textarea
      key={defaultValue}
      defaultValue={defaultValue}
      rows={rows}
      onBlur={(e) => onSave(e.target.value)}
      className="w-full rounded-lg border border-white/15 bg-white/5 p-2 text-xs text-white"
    />
  );
}

function FeatureCard({ feature, locked }: { feature: FeatureKey; locked?: boolean }) {
  return (
    <div className={`rounded-xl border p-3 ${locked ? "border-white/5 bg-white/[0.015] opacity-60" : "border-white/10 bg-white/[0.03]"}`}>
      <div className="flex items-center gap-2">
        {locked ? <Lock size={13} className="text-white/30" /> : <CheckCircle2 size={13} className="text-emerald-400" />}
        <span className="text-xs font-semibold text-white/85">{feature}</span>
      </div>
      {FEATURE_DESCRIPTIONS[feature] && <p className="mt-1 text-[10.5px] leading-snug text-white/40">{FEATURE_DESCRIPTIONS[feature]}</p>}
    </div>
  );
}

function StarterFeaturePanel({
  trainer,
  onUpgrade,
}: {
  trainer: TrainerRow;
  onUpgrade: (extra: UpgradeExtra) => void;
}) {
  const included = PLAN_FEATURES.starter;
  const locked = PLAN_FEATURES.pro.filter((f) => !included.includes(f)).slice(0, 5);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold text-white/70">Funciones incluidas en Starter</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {included.map((f) => (
            <FeatureCard key={f} feature={f} />
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold text-white/40">Funciones no disponibles en Starter</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {locked.map((f) => (
            <FeatureCard key={f} feature={f} locked />
          ))}
        </div>
      </div>
      <UpsellPanel target="pro" trainer={trainer} onUpgrade={onUpgrade} />
    </div>
  );
}

export interface UpgradeExtra {
  dashboardAccess?: DashboardAccess;
  proximoCobro?: string;
  dominioPropio?: string;
}

type MissingField = "proximoCobro" | "dashboardAccess" | "dominioPropio";

const MISSING_FIELD_LABELS: Record<MissingField, string> = {
  proximoCobro: "Próximo cobro",
  dashboardAccess: "Acceso al dashboard",
  dominioPropio: "Dominio propio",
};

/**
 * Qué le falta al entrenador para que el plan destino funcione de verdad —
 * solo señales que sí importan operativamente, no cada campo de perfil.
 */
function getMissingFieldsForUpgrade(trainer: TrainerRow, target: "pro" | "elite"): MissingField[] {
  const missing: MissingField[] = [];
  if (!trainer.proximo_cobro) missing.push("proximoCobro");
  if (trainer.dashboard_access !== "activo") missing.push("dashboardAccess");
  if (target === "elite" && !trainer.dominio_propio) missing.push("dominioPropio");
  return missing;
}

function defaultProximoCobro(): string {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}

function UpsellPanel({
  target,
  trainer,
  onUpgrade,
}: {
  target: "pro" | "elite";
  trainer: TrainerRow;
  onUpgrade: (extra: UpgradeExtra) => void;
}) {
  const label = target === "pro" ? "Pro" : "Elite";
  const gained =
    target === "pro"
      ? PLAN_FEATURES.pro.filter((f) => !PLAN_FEATURES.starter.includes(f))
      : PLAN_FEATURES.elite.filter((f) => !PLAN_FEATURES.pro.includes(f));

  const missing = useMemo(() => getMissingFieldsForUpgrade(trainer, target), [trainer, target]);
  const [collecting, setCollecting] = useState(false);
  const [proximoCobro, setProximoCobro] = useState(trainer.proximo_cobro ?? defaultProximoCobro());
  const [activarDashboard, setActivarDashboard] = useState(true);
  const [dominioPropio, setDominioPropio] = useState("");

  function handleClick() {
    if (missing.length === 0) {
      if (!confirm(`¿Cambiar el plan de ${trainer.business_name} a ${label}?`)) return;
      onUpgrade({});
      return;
    }
    setCollecting(true);
  }

  function handleConfirm() {
    onUpgrade({
      proximoCobro: missing.includes("proximoCobro") ? proximoCobro : undefined,
      dashboardAccess: missing.includes("dashboardAccess") && activarDashboard ? "activo" : undefined,
      dominioPropio: missing.includes("dominioPropio") && dominioPropio.trim() ? dominioPropio.trim() : undefined,
    });
    setCollecting(false);
  }

  return (
    <div className="rounded-2xl border border-hf-blue/20 bg-gradient-to-br from-hf-blue/10 via-transparent to-hf-fuchsia/10 p-4">
      <p className="text-xs font-semibold text-white">
        Lleva este negocio al plan {label}{" "}
        <span className="ml-1 rounded-full bg-white/10 px-2 py-0.5 text-[9px] uppercase text-white/60">Recomendado</span>
      </p>
      <ul className="mt-2 space-y-1 text-[11px] text-white/60">
        {gained.slice(0, 5).map((f) => (
          <li key={f} className="flex items-center gap-1.5">
            <CheckCircle2 size={11} className="text-hf-blue" /> {f}
          </li>
        ))}
      </ul>

      {!collecting ? (
        <button
          onClick={handleClick}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-semibold text-white transition-transform hover:scale-[1.02]"
          style={{ background: "linear-gradient(90deg,#00C8FF,#6D2EFF,#FF2DB8)" }}
        >
          Actualizar a {label} <ArrowRight size={13} />
        </button>
      ) : (
        <div className="mt-3 space-y-3 rounded-xl border border-white/10 bg-black/20 p-3">
          <p className="text-[11px] text-white/50">
            Antes de pasar a {label}, faltan estos datos: {missing.map((m) => MISSING_FIELD_LABELS[m]).join(", ")}.
          </p>

          {missing.includes("proximoCobro") && (
            <label className="block">
              <span className="mb-1 block text-[11px] text-white/50">Próximo cobro</span>
              <input
                type="date"
                value={proximoCobro}
                onChange={(e) => setProximoCobro(e.target.value)}
                className="h-9 w-full rounded-lg border border-white/15 bg-white/5 px-2 text-xs text-white [color-scheme:dark]"
              />
            </label>
          )}

          {missing.includes("dashboardAccess") && (
            <label className="flex items-center gap-2 text-[11px] text-white/70">
              <input
                type="checkbox"
                checked={activarDashboard}
                onChange={(e) => setActivarDashboard(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-white/20 bg-white/5 accent-hf-blue"
              />
              Activar acceso al dashboard ahora
            </label>
          )}

          {missing.includes("dominioPropio") && (
            <label className="block">
              <span className="mb-1 block text-[11px] text-white/50">Dominio propio (opcional)</span>
              <input
                value={dominioPropio}
                onChange={(e) => setDominioPropio(e.target.value)}
                placeholder="Ej: micarrera.com"
                className="h-9 w-full rounded-lg border border-white/15 bg-white/5 px-2 text-xs text-white placeholder:text-white/30"
              />
            </label>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setCollecting(false)}
              className="flex-1 rounded-full border border-white/15 py-2 text-xs text-white/60"
            >
              Cancelar
            </button>
            <button
              onClick={handleConfirm}
              className="flex-1 rounded-full py-2 text-xs font-semibold text-white"
              style={{ background: "linear-gradient(90deg,#00C8FF,#6D2EFF,#FF2DB8)" }}
            >
              Confirmar actualización
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
