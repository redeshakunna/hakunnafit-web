"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  LayoutDashboard,
  Sparkles,
  Globe,
  Building2,
  Users,
  Dumbbell,
  Utensils,
  CalendarDays,
  Bot,
  Settings,
  Smartphone,
  LogOut,
  ExternalLink,
  Lock,
} from "lucide-react";
import { logoutTrainer } from "@/lib/trainer-auth";
import type { TrainerRow } from "@/lib/admin-actions";
import { hasFeature, minPlanForFeature } from "@/lib/admin-helpers";
import { planLabel, type FeatureKey } from "@/lib/catalog";

export type TrainerSection =
  | "resumen"
  | "marca"
  | "sitio-web"
  | "negocio"
  | "clientes"
  | "entrenamientos"
  | "nutricion"
  | "agenda"
  | "hakai"
  | "configuracion"
  | "vista-cliente";

interface NavItem {
  key: TrainerSection;
  label: string;
  href: string;
  icon: React.ElementType;
  // Función de catalog.ts que debe incluir el plan para desbloquear este
  // módulo — null significa "todo plan lo tiene" (Dashboard/Mi Marca/Mi
  // Sitio Web/Mi Negocio/Configuración: son la cuenta en sí, no una función
  // vendible aparte).
  feature: FeatureKey | null;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: "Mi negocio",
    items: [
      { key: "resumen", label: "Dashboard", href: "/panel", icon: LayoutDashboard, feature: null },
      { key: "marca", label: "Mi Marca", href: "/panel/marca", icon: Sparkles, feature: null },
      { key: "sitio-web", label: "Mi Sitio Web", href: "/panel/sitio-web", icon: Globe, feature: null },
      { key: "negocio", label: "Mi Negocio", href: "/panel/negocio", icon: Building2, feature: null },
    ],
  },
  {
    label: "Operación",
    items: [
      { key: "clientes", label: "Clientes", href: "/panel/clientes", icon: Users, feature: "Clientes" },
      { key: "entrenamientos", label: "Entrenamientos", href: "/panel/entrenamientos", icon: Dumbbell, feature: "Rutinas" },
      { key: "nutricion", label: "Nutrición", href: "/panel/nutricion", icon: Utensils, feature: "Nutrición" },
      { key: "agenda", label: "Agenda", href: "/panel/agenda", icon: CalendarDays, feature: "Agenda" },
    ],
  },
  {
    label: "Inteligencia",
    items: [{ key: "hakai", label: "HakAI", href: "/panel/hakai", icon: Bot, feature: "HakAI" }],
  },
  {
    label: "Cuenta",
    items: [
      { key: "configuracion", label: "Configuración", href: "/panel/configuracion", icon: Settings, feature: null },
      { key: "vista-cliente", label: "Vista del Cliente", href: "/panel/vista-cliente", icon: Smartphone, feature: "App Cliente" },
    ],
  },
];

export function TrainerShell({
  active,
  trainer,
  children,
}: {
  active: TrainerSection;
  trainer: TrainerRow;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const landingUrl = trainer.subdominio ? `https://${trainer.subdominio}.hakunnafit.com` : null;

  return (
    <div className="flex min-h-screen bg-hf-black text-white">
      <aside className="hidden w-72 shrink-0 flex-col border-r border-white/10 bg-[#0a0d16] px-4 py-6 lg:flex">
        <div className="mx-auto" style={{ width: 180 }}>
          <Image
            src="/images/LogoHorizontal-trasnparente.png"
            alt="HakunnaFit"
            width={1728}
            height={910}
            className="h-auto w-full"
            priority
          />
        </div>
        <p className="mt-1 text-center text-[10px] font-semibold uppercase tracking-widest text-white/30">
          Admin Landing
        </p>

        <nav className="mt-7 flex flex-1 flex-col gap-5 overflow-y-auto pr-1">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/30">
                {group.label}
              </p>
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.key === active;
                  const unlocked = !item.feature || hasFeature(trainer.plan, item.feature);
                  return (
                    <Link
                      key={item.key}
                      href={item.href}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                        isActive ? "text-white" : "text-white/60 hover:bg-white/5 hover:text-white"
                      }`}
                      style={isActive ? { background: "linear-gradient(90deg,#00C8FF33,#6D2EFF33)" } : undefined}
                    >
                      <Icon size={17} className={unlocked ? undefined : "text-white/30"} />
                      <span className={`flex-1 ${unlocked ? "" : "text-white/40"}`}>{item.label}</span>
                      {!unlocked && (
                        <span className="flex items-center gap-1 rounded-full border border-white/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white/35">
                          <Lock size={9} />
                          {planLabel(minPlanForFeature(item.feature!))}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {landingUrl && (
          <a
            href={landingUrl}
            target="_blank"
            rel="noreferrer"
            className="mb-3 flex items-center justify-center gap-1.5 rounded-full border border-white/15 px-3 py-2 text-xs font-semibold text-white/70 hover:border-white/30 hover:text-white"
          >
            Ver mi landing <ExternalLink size={13} />
          </a>
        )}

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs font-semibold text-white">{trainer.business_name}</p>
          <p className="mt-1 text-[11px] text-white/50">
            {trainer.subdominio ? `${trainer.subdominio}.hakunnafit.com` : "Sin subdominio"}
          </p>
          <p className="mt-1.5 inline-flex items-center rounded-full bg-white/5 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/50">
            Plan {planLabel(trainer.plan)}
          </p>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-white/10 px-6 py-4 lg:hidden">
          <div style={{ width: 140 }}>
            <Image
              src="/images/LogoHorizontal-trasnparente.png"
              alt="HakunnaFit"
              width={1728}
              height={910}
              className="h-auto w-full"
            />
          </div>
        </header>
        <div className="hidden items-center justify-end gap-4 border-b border-white/10 px-6 py-4 lg:flex">
          <button
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                await logoutTrainer();
                router.push("/panel/login");
                router.refresh();
              })
            }
            className="flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/70 hover:border-white/30 hover:text-white"
          >
            <LogOut size={13} />
            Salir
          </button>
        </div>

        <main className="flex-1 px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
