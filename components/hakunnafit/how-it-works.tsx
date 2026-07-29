"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Star } from "lucide-react";

const steps = [
  {
    n: "1",
    icon: "/icons/icon-step-register.svg",
    title: "Te registras",
    desc: "Crea tu cuenta en menos de 2 minutos.",
  },
  {
    n: "2",
    icon: "/icons/icon-step-brand.svg",
    title: "Personalizamos tu marca",
    desc: "Te entregamos tu web y app con tu identidad.",
  },
  {
    n: "3",
    icon: "/icons/icon-step-invite.svg",
    title: "Invitas a tus clientes",
    desc: "Añade clientes y empieza a crear sus planes.",
  },
  {
    n: "4",
    icon: "/icons/icon-step-scale.svg",
    title: "Gestionas y escalas",
    desc: "Automatiza tu negocio y aumenta tus ingresos.",
  },
  {
    n: "5",
    icon: "/icons/icon-step-grow.svg",
    title: "Haces crecer tu marca",
    desc: "Te posicionas como un entrenador top.",
  },
];

const stats = [
  { value: "+2.500", label: "Entrenadores activos", color: "#00C8FF" },
  { value: "+25.000", label: "Clientes entrenando", color: "#8B5CF6" },
  { value: "+1.2M", label: "Entrenamientos realizados", color: "#C026D3" },
  { value: "+15M", label: "En ingresos generados", color: "#FF2DB8" },
];

export function HakunnaFitHowItWorks() {
  return (
    <section id="como-funciona" className="relative w-full py-20 sm:py-24">
      <div className="relative mx-auto max-w-7xl px-6">
        {/* Título */}
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="text-center font-[family-name:var(--font-hf-heading)] text-2xl font-bold uppercase leading-tight text-white sm:text-3xl lg:text-4xl"
        >
          Así de{" "}
          <span className="bg-gradient-to-r from-hf-blue via-hf-purple to-hf-fuchsia bg-clip-text text-transparent">
            fácil
          </span>{" "}
          es comenzar
        </motion.h2>

        {/* Timeline de pasos */}
        <div className="relative mt-16">
          <div className="pointer-events-none absolute left-[10%] right-[10%] top-9 hidden border-t border-dashed border-white/15 lg:block" />

          <div className="grid grid-cols-2 gap-x-6 gap-y-12 sm:grid-cols-3 lg:grid-cols-5 lg:gap-x-4">
            {steps.map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="relative flex flex-col items-center text-center"
              >
                <div
                  className="relative flex h-[72px] w-[72px] items-center justify-center rounded-full"
                  style={{ background: "linear-gradient(135deg,#00C8FF,#6D2EFF,#FF2DB8)" }}
                >
                  <div className="flex h-[64px] w-[64px] items-center justify-center rounded-full bg-hf-black">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={s.icon} alt="" className="h-8 w-8" />
                  </div>
                </div>
                <span className="relative z-10 -mt-3 flex h-6 w-6 items-center justify-center rounded-full border border-white/20 bg-hf-black text-[11px] font-bold text-white">
                  {s.n}
                </span>
                <h3 className="mt-3 font-[family-name:var(--font-hf-heading)] text-sm font-bold uppercase text-white">
                  {s.title}
                </h3>
                <p className="mt-1.5 max-w-[170px] text-xs leading-relaxed text-white/55">
                  {s.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Prueba social */}
        <div className="mt-20">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
            className="font-[family-name:var(--font-hf-heading)] text-xl font-bold uppercase leading-tight text-white sm:text-2xl lg:text-3xl"
          >
            Entrenadores que ya están{" "}
            <span className="bg-gradient-to-r from-hf-purple to-hf-fuchsia bg-clip-text text-transparent">
              escalando
            </span>
          </motion.h2>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr]">
            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-2">
              {stats.map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
                >
                  <p
                    className="font-[family-name:var(--font-hf-heading)] text-2xl font-black sm:text-3xl"
                    style={{ color: stat.color }}
                  >
                    {stat.value}
                  </p>
                  <p className="mt-1.5 text-xs text-white/55 sm:text-sm">{stat.label}</p>
                </motion.div>
              ))}
            </div>

            {/* Testimonio */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5 }}
              className="grid grid-cols-1 items-end gap-4 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] sm:grid-cols-[180px_1fr]"
            >
              <div className="relative h-56 w-full sm:h-full">
                <Image
                  src="/images/Entrenador01.png"
                  alt="Andrés Rivera, entrenador personal usando HakunnaFit"
                  fill
                  className="object-contain object-bottom"
                  sizes="(min-width: 640px) 180px, 90vw"
                />
              </div>

              <div className="p-6 pt-0 sm:p-8 sm:pl-0">
                <p className="font-[family-name:var(--font-hf-heading)] text-base font-bold text-white">
                  Andrés Rivera
                </p>
                <p className="text-xs text-white/50">Entrenador Personal</p>

                <p className="mt-4 text-[13px] leading-relaxed text-white/70">
                  &ldquo;HakunnaFit cambió mi negocio por completo. Ahora tengo mi propia marca,
                  más clientes y más tiempo para enfocarme en lo que amo.&rdquo;
                </p>

                <div className="mt-4 flex gap-0.5 text-hf-blue">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={16} fill="#FBBF24" stroke="#FBBF24" />
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
