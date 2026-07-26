"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Globe,
  CheckCircle2,
  PencilLine,
  Clock,
  Lock,
  Search,
  Plus,
  ExternalLink,
  Settings2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { createLeadManual, type TrainerRow, type CreateLeadInput } from "@/lib/admin-actions";
import { PLANS, LANDING_STATUSES } from "@/lib/catalog";
import { KpiCard } from "./kpi-card";
import { Pill, fmtDate, planLabels, planTone } from "./admin-ui";
import { NewLeadModal } from "./new-lead-modal";

const PAGE_SIZE = 6;

// Los 5 estados del catálogo (pendiente, en_diseno, en_revision, publicada,
// suspendida) se agrupan en los 4 baldes que se muestran arriba — en_diseno
// y en_revision cuentan como "en borrador" porque para efectos de este
// resumen ambos significan "todavía no está lista para el público".
function bucketFor(status: TrainerRow["landing_status"]): "publicada" | "borrador" | "pendiente" | "suspendida" {
  if (status === "publicada") return "publicada";
  if (status === "suspendida") return "suspendida";
  if (status === "en_diseno" || status === "en_revision") return "borrador";
  return "pendiente";
}

export function LandingsView({ initialTrainers }: { initialTrainers: TrainerRow[] }) {
  const router = useRouter();
  const [trainers] = useState(initialTrainers);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("todos");
  const [estadoFilter, setEstadoFilter] = useState<string>("todos");
  const [orden, setOrden] = useState<"recientes" | "nombre">("recientes");
  const [page, setPage] = useState(1);
  const [creatingLead, setCreatingLead] = useState(false);
  const [isPending, startTransition] = useTransition();

  const buckets = useMemo(() => {
    const counts = { publicada: 0, borrador: 0, pendiente: 0, suspendida: 0 };
    for (const t of trainers) counts[bucketFor(t.landing_status)]++;
    return counts;
  }, [trainers]);

  const filtered = useMemo(() => {
    let list = trainers.filter((t) => {
      if (planFilter !== "todos" && t.plan !== planFilter) return false;
      if (estadoFilter !== "todos" && t.landing_status !== estadoFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!t.business_name.toLowerCase().includes(q) && !(t.subdominio ?? "").toLowerCase().includes(q)) {
          return false;
        }
      }
      return true;
    });
    list = [...list].sort((a, b) =>
      orden === "nombre"
        ? a.business_name.localeCompare(b.business_name)
        : new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
    return list;
  }, [trainers, search, planFilter, estadoFilter, orden]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageSafe = Math.min(page, totalPages);
  const pageItems = filtered.slice((pageSafe - 1) * PAGE_SIZE, pageSafe * PAGE_SIZE);

  function handleCreateLead(input: CreateLeadInput) {
    startTransition(async () => {
      const result = await createLeadManual(input);
      if (!result.ok) {
        alert(result.error ?? "No se pudo crear la solicitud.");
        return;
      }
      setCreatingLead(false);
      router.push("/panel-hakunna/solicitudes");
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Landings</h1>
          <p className="mt-1 text-sm text-white/50">Gestiona las páginas públicas de los entrenadores.</p>
        </div>
        <button
          onClick={() => setCreatingLead(true)}
          className="flex items-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-semibold text-white"
          style={{ background: "linear-gradient(90deg,#00C8FF,#6D2EFF,#FF2DB8)" }}
        >
          <Plus size={14} />
          Nueva Landing
        </button>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <KpiCard icon={<Globe size={17} />} label="Total Landings" value={trainers.length} tone="blue" />
        <KpiCard icon={<CheckCircle2 size={17} />} label="Publicadas" value={buckets.publicada} tone="green" />
        <KpiCard icon={<PencilLine size={17} />} label="En borrador" value={buckets.borrador} tone="amber" />
        <KpiCard icon={<Clock size={17} />} label="Pendientes" value={buckets.pendiente} tone="purple" />
        <KpiCard icon={<Lock size={17} />} label="Suspendidas" value={buckets.suspendida} tone="pink" />
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <div className="flex h-10 min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white/70">
          <Search size={14} className="text-white/40" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Buscar entrenador o dominio..."
            className="w-full bg-transparent text-sm text-white placeholder:text-white/30 focus:outline-none"
          />
        </div>
        <select
          value={planFilter}
          onChange={(e) => {
            setPlanFilter(e.target.value);
            setPage(1);
          }}
          className="h-10 rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white"
        >
          <option value="todos" className="bg-[#0b0f1a] text-white">Todos los planes</option>
          {PLANS.map((p) => (
            <option key={p.key} value={p.key} className="bg-[#0b0f1a] text-white">{p.label}</option>
          ))}
        </select>
        <select
          value={estadoFilter}
          onChange={(e) => {
            setEstadoFilter(e.target.value);
            setPage(1);
          }}
          className="h-10 rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white"
        >
          <option value="todos" className="bg-[#0b0f1a] text-white">Todos los estados</option>
          {LANDING_STATUSES.map((s) => (
            <option key={s.key} value={s.key} className="bg-[#0b0f1a] text-white">{s.label}</option>
          ))}
        </select>
        <select
          value={orden}
          onChange={(e) => setOrden(e.target.value as "recientes" | "nombre")}
          className="h-10 rounded-xl border border-white/15 bg-white/5 px-3 text-sm text-white"
        >
          <option value="recientes" className="bg-[#0b0f1a] text-white">Ordenar: más recientes</option>
          <option value="nombre" className="bg-[#0b0f1a] text-white">Ordenar: nombre A-Z</option>
        </select>
      </div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {pageItems.map((t) => (
          <LandingCard key={t.id} trainer={t} />
        ))}
        {pageItems.length === 0 && (
          <p className="col-span-full py-12 text-center text-sm text-white/40">
            No hay landings que coincidan con estos filtros.
          </p>
        )}
      </div>

      {filtered.length > 0 && (
        <div className="mt-6 flex items-center justify-between text-xs text-white/40">
          <span>
            Mostrando {(pageSafe - 1) * PAGE_SIZE + 1}-{Math.min(pageSafe * PAGE_SIZE, filtered.length)} de{" "}
            {filtered.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={pageSafe <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 text-white/60 disabled:opacity-30"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-white/60">{pageSafe} / {totalPages}</span>
            <button
              disabled={pageSafe >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 text-white/60 disabled:opacity-30"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      <NewLeadModal
        open={creatingLead}
        isPending={isPending}
        onClose={() => setCreatingLead(false)}
        onCreate={handleCreateLead}
      />
    </div>
  );
}

const estadoTone: Record<TrainerRow["landing_status"], "neutral" | "good" | "warn" | "bad"> = {
  pendiente: "warn",
  en_diseno: "neutral",
  en_revision: "neutral",
  publicada: "good",
  suspendida: "bad",
};

const estadoLabels: Record<TrainerRow["landing_status"], string> = Object.fromEntries(
  LANDING_STATUSES.map((s) => [s.key, s.label])
) as Record<TrainerRow["landing_status"], string>;

function LandingCard({ trainer: t }: { trainer: TrainerRow }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-black/40">
        {t.subdominio ? (
          <iframe
            src={`/landing/${t.subdominio}`}
            loading="lazy"
            title={t.business_name}
            className="pointer-events-none absolute left-0 top-0 origin-top-left border-0"
            style={{ width: "400%", height: "400%", transform: "scale(0.25)" }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-white/20">
            <Globe size={28} />
          </div>
        )}
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={t.avatar_url || "/images/NO_image.png"}
              alt=""
              className="h-8 w-8 shrink-0 rounded-full border border-white/10 object-cover"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{t.business_name}</p>
              <p className="truncate text-[11px] text-white/40">
                {t.subdominio ? `${t.subdominio}.hakunnafit.com` : "Sin subdominio"}
              </p>
            </div>
          </div>
          <Pill tone={estadoTone[t.landing_status]}>{estadoLabels[t.landing_status]}</Pill>
        </div>

        <div className="mt-3 flex items-center gap-2">
          {t.plan && <Pill tone={planTone(t.plan)}>{planLabels[t.plan]}</Pill>}
        </div>

        <p className="mt-3 text-[11px] text-white/35">Última edición: {fmtDate(t.updated_at)}</p>

        <div className="mt-4 flex items-center gap-2">
          {t.subdominio ? (
            <Link
              href={`/landing/${t.subdominio}`}
              target="_blank"
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-white/15 py-2 text-[11px] font-semibold text-white/80 hover:border-white/30"
            >
              <ExternalLink size={12} />
              Ver Landing
            </Link>
          ) : (
            <span className="flex-1 rounded-full border border-white/5 py-2 text-center text-[11px] text-white/20">
              Sin publicar
            </span>
          )}
          <Link
            href={`/panel-hakunna/landings/${t.id}`}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-[11px] font-semibold text-white"
            style={{ background: "linear-gradient(90deg,#00C8FF,#6D2EFF)" }}
          >
            <Settings2 size={12} />
            Administrar
          </Link>
        </div>
      </div>
    </div>
  );
}
