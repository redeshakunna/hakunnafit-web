"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";
import { useLeadModal } from "./lead-modal-context";

const WEB_THUMB_URL =
  "https://images.unsplash.com/photo-1738523687459-963f3fb56522?auto=format&fit=crop&w=500&q=70";

const pillars = [
  {
    icon: "/icons/icon-web.svg",
    title: "Tu página web",
    desc: "Tu propia web profesional con tu dominio y tu marca.",
    visual: "web",
  },
  {
    icon: "/icons/icon-dashboard.svg",
    title: "Dashboard completo",
    desc: "Gestiona clientes, ventas, entrenamientos y más.",
    visual: "dashboard",
  },
  {
    icon: "/icons/icon-app.svg",
    title: "App para tus clientes",
    desc: "Tus clientes entrenan, siguen su progreso y más.",
    visual: "app",
  },
  {
    icon: "/icons/icon-ia.svg",
    title: "IA Hakunna",
    desc: "Tu asistente inteligente que crea planes y te ahorra tiempo.",
    visual: "ia",
  },
] as const;

function CardVisual({ visual }: { visual: "web" | "dashboard" | "app" | "ia" }) {
  if (visual === "web") {
    return (
      <div className="mt-5 overflow-hidden rounded-xl border border-white/10 bg-black/40">
        <div className="flex items-center gap-1.5 border-b border-white/10 px-2.5 py-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-[#ff5f56]" />
          <span className="h-1.5 w-1.5 rounded-full bg-[#ffbd2e]" />
          <span className="h-1.5 w-1.5 rounded-full bg-[#27c93f]" />
        </div>
        <div className="relative h-24 w-full">
          <Image src={WEB_THUMB_URL} alt="" fill className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between p-2">
            <span className="font-[family-name:var(--font-hf-heading)] text-[10px] font-bold uppercase text-white">
              Entrena sin límites
            </span>
            <span className="rounded-full bg-gradient-to-r from-hf-blue via-hf-purple to-hf-fuchsia px-2 py-1 text-[8px] font-semibold text-white">
              Agendar
            </span>
          </div>
        </div>
      </div>
    );
  }

  if (visual === "dashboard") {
    return (
      <div className="mt-5 rounded-xl border border-white/10 bg-black/40 p-3">
        <div className="flex items-end gap-1.5">
          {[35, 55, 30, 70, 45, 85, 60].map((h, i) => (
            <div
              key={i}
              className="h-14 w-full rounded-sm bg-white/5"
              style={{ position: "relative" }}
            >
              <div
                className="absolute bottom-0 w-full rounded-sm"
                style={{
                  height: `${h}%`,
                  background: "linear-gradient(180deg,#00C8FF,#6D2EFF,#FF2DB8)",
                }}
              />
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-[9px] font-medium text-white/50">Ingresos del mes</span>
          <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-hf-blue/70 text-[7px] font-bold text-hf-blue">
            67%
          </span>
        </div>
      </div>
    );
  }

  if (visual === "app") {
    return (
      <div className="mt-5 flex items-end justify-center gap-2 rounded-xl border border-white/10 bg-black/40 p-3">
        <div className="w-[42%] rounded-lg border border-white/10 bg-white/[0.03] p-1.5">
          <div className="space-y-1">
            {["Cliente A", "Cliente B", "Cliente C"].map((c) => (
              <div key={c} className="flex items-center gap-1 rounded bg-white/5 px-1 py-1">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-gradient-to-br from-hf-blue to-hf-fuchsia" />
                <span className="truncate text-[7px] text-white/60">{c}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="w-[52%] rounded-lg border border-white/10 bg-white/[0.03] p-2">
          <div className="flex items-end gap-1 h-10">
            {[40, 70, 55, 90, 65].map((h, i) => (
              <div
                key={i}
                className="w-full rounded-sm"
                style={{ height: `${h}%`, background: "linear-gradient(180deg,#00C8FF,#FF2DB8)" }}
              />
            ))}
          </div>
          <span className="mt-1 block text-[7px] text-white/50">Progreso semanal</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-5 rounded-xl border border-white/10 bg-black/40 p-3">
      <div className="flex items-center gap-2">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-hf-blue via-hf-purple to-hf-fuchsia text-[8px]">
          🤖
        </span>
        <span className="text-[9px] font-semibold text-white/80">IA Hakunna</span>
      </div>
      <p className="mt-2 rounded-lg bg-white/5 px-2 py-1.5 text-[8.5px] leading-relaxed text-white/60">
        Genera un plan de hipertrofia para un cliente intermedio, 4 días/semana.
      </p>
      <div className="mt-1.5 flex items-center justify-between rounded-lg bg-white/5 px-2 py-1.5">
        <span className="text-[8.5px] font-medium text-white/70">Plan generado</span>
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
          <Check size={10} strokeWidth={3} />
        </span>
      </div>
    </div>
  );
}

export function HakunnaFitFeatures() {
  const { openModal } = useLeadModal();

  return (
    <section id="pilares" className="relative w-full py-20 sm:py-24">
      <div className="relative mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl text-center"
        >
          <h2 className="font-[family-name:var(--font-hf-heading)] text-2xl font-bold uppercase leading-tight text-white sm:text-3xl lg:text-4xl">
            Todo lo que recibes{" "}
            <span className="bg-gradient-to-r from-hf-blue via-hf-purple to-hf-fuchsia bg-clip-text text-transparent">
              en un solo lugar
            </span>
          </h2>
        </motion.div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {pillars.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="flex flex-col rounded-3xl border border-white/10 bg-white/[0.03] p-6 transition-transform duration-300 hover:-translate-y-1 hover:border-hf-blue/30"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.icon} alt="" className="h-11 w-11" />

              <h3 className="mt-5 font-[family-name:var(--font-hf-heading)] text-base font-bold leading-snug text-white">
                {p.title}
              </h3>
              <p className="mt-2 text-[13px] leading-relaxed text-white/55">{p.desc}</p>

              <CardVisual visual={p.visual} />

              <button
                type="button"
                onClick={openModal}
                className="mt-5 inline-flex w-fit items-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-xs font-semibold text-white/90 transition-colors hover:border-hf-blue/40 hover:text-white"
              >
                Saber más <ArrowRight size={13} />
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
