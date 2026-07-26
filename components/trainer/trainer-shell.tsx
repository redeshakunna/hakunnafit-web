"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { LayoutDashboard, Palette, Image as ImageIcon, Dumbbell, LogOut, ExternalLink } from "lucide-react";
import { logoutTrainer } from "@/lib/trainer-auth";
import type { TrainerRow } from "@/lib/admin-actions";

export type TrainerSection = "resumen" | "contenido" | "colores" | "fotos";

const navItems: { key: TrainerSection; label: string; href: string; icon: React.ElementType }[] = [
  { key: "resumen", label: "Resumen", href: "/panel", icon: LayoutDashboard },
  { key: "contenido", label: "Textos y servicios", href: "/panel/contenido", icon: Dumbbell },
  { key: "fotos", label: "Fotos y logo", href: "/panel/fotos", icon: ImageIcon },
  { key: "colores", label: "Colores", href: "/panel/colores", icon: Palette },
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
      <aside className="hidden w-64 shrink-0 flex-col border-r border-white/10 bg-[#0a0d16] px-4 py-6 lg:flex">
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
          Tu panel
        </p>

        <nav className="mt-8 flex flex-1 flex-col gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.key === active;
            return (
              <Link
                key={item.key}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? "text-white" : "text-white/60 hover:bg-white/5 hover:text-white"
                }`}
                style={isActive ? { background: "linear-gradient(90deg,#00C8FF33,#6D2EFF33)" } : undefined}
              >
                <Icon size={17} />
                <span className="flex-1">{item.label}</span>
              </Link>
            );
          })}
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
