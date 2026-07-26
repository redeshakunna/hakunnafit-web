"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  LayoutDashboard,
  Inbox,
  Users,
  Globe,
  Sparkles,
  Settings,
  ShieldCheck,
  LogOut,
  Search,
} from "lucide-react";
import { logoutAdmin } from "@/lib/admin-auth";
import { NotificationsBell } from "./notifications-bell";

export type AdminSection = "dashboard" | "solicitudes" | "entrenadores" | "landings" | "configuracion" | "proximamente";

const navItems: {
  key: AdminSection;
  label: string;
  href: string;
  icon: React.ElementType;
  enabled: boolean;
}[] = [
  { key: "dashboard", label: "Dashboard", href: "/panel-hakunna", icon: LayoutDashboard, enabled: true },
  { key: "solicitudes", label: "Solicitudes", href: "/panel-hakunna/solicitudes", icon: Inbox, enabled: true },
  { key: "entrenadores", label: "Entrenadores", href: "/panel-hakunna/entrenadores", icon: Users, enabled: true },
  { key: "landings", label: "Landings", href: "/panel-hakunna/landings", icon: Globe, enabled: true },
  { key: "proximamente", label: "HAKAI Studio", href: "/panel-hakunna/proximamente", icon: Sparkles, enabled: false },
  { key: "configuracion", label: "Configuración", href: "/panel-hakunna/configuracion", icon: Settings, enabled: true },
  { key: "proximamente", label: "Auditoría", href: "/panel-hakunna/proximamente", icon: ShieldCheck, enabled: false },
];

export function AdminShell({
  active,
  badges,
  children,
}: {
  active: AdminSection;
  badges?: Partial<Record<AdminSection, number>>;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex min-h-screen bg-hf-black text-white">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-white/10 bg-[#0a0d16] px-4 py-6 lg:flex">
        <div className="mx-auto" style={{ width: 200 }}>
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
          Super admin
        </p>

        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {navItems.map((item, i) => {
            const Icon = item.icon;
            const isActive = item.enabled && item.key === active;
            const badge = badges?.[item.key];
            return (
              <Link
                key={`${item.label}-${i}`}
                href={item.enabled ? item.href : "/panel-hakunna/proximamente"}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? "text-white"
                    : item.enabled
                      ? "text-white/60 hover:bg-white/5 hover:text-white"
                      : "text-white/30 hover:text-white/50"
                }`}
                style={isActive ? { background: "linear-gradient(90deg,#00C8FF33,#6D2EFF33)" } : undefined}
              >
                <Icon size={17} />
                <span className="flex-1">{item.label}</span>
                {badge ? (
                  <span className="rounded-full bg-hf-fuchsia px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {badge}
                  </span>
                ) : !item.enabled ? (
                  <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-[9px] font-semibold text-white/40">
                    Pronto
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs font-semibold text-white">¿Necesitas ayuda?</p>
          <p className="mt-1 text-[11px] text-white/50">Este panel es de uso interno de HakunnaFit.</p>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex items-center justify-between gap-4 border-b border-white/10 px-6 py-4">
          <div className="flex max-w-md flex-1 items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/40">
            <Search size={15} />
            <span>Buscar entrenador, correo...</span>
          </div>
          <div className="flex items-center gap-4">
            <NotificationsBell />
            <button
              disabled={isPending}
              onClick={() =>
                startTransition(async () => {
                  await logoutAdmin();
                  router.push("/panel-hakunna/login");
                })
              }
              className="flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5 text-xs font-semibold text-white/70 hover:border-white/30 hover:text-white"
            >
              <LogOut size={13} />
              Salir
            </button>
          </div>
        </header>

        <main className="flex-1 px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
