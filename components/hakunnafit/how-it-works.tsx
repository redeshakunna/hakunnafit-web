"use client";

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

// Antes esta sección mostraba números inventados (+2.500 entrenadores,
// +25.000 clientes...) que no correspondían a nada real. HakunnaFit recién
// está lanzando, así que en vez de fabricar tracción, esto comunica el
// momento real de la plataforma sin mentir sobre el tamaño.
const launchBadges = [
  { value: "Nuevo", label: "Plataforma recién lanzada", color: "#00C8FF" },
  { value: "48h", label: "Tu marca lista para publicar", color: "#8B5CF6" },
  { value: "100%", label: "Tuyo: tu marca, tus clientes", color: "#C026D3" },
  { value: "Limitado", label: "Cupos para entrenadores fundadores", color: "#FF2DB8" },
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
            Sé de los{" "}
            <span className="bg-gradient-to-r from-hf-purple to-hf-fuchsia bg-clip-text text-transparent">
              primeros en escalar
            </span>
          </motion.h2>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_1fr]">
            {/* Momento de lanzamiento — antes aquí había estadísticas
                inventadas (+2.500 entrenadores...). Se reemplazó por algo
                honesto: la plataforma es nueva y eso también es una historia
                que vender (acceso temprano, precio fundador). */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-2">
              {launchBadges.map((badge, i) => (
                <motion.div
                  key={badge.label}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.5, delay: i * 0.08 }}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-6"
                >
                  <p
                    className="font-[family-name:var(--font-hf-heading)] text-2xl font-black sm:text-3xl"
                    style={{ color: badge.color }}
                  >
                    {badge.value}
                  </p>
                  <p className="mt-1.5 text-xs text-white/55 sm:text-sm">{badge.label}</p>
                </motion.div>
              ))}
            </div>

            {/* Programa Fundadores — reemplaza el testimonio inventado de
                "Andrés Rivera" por una invitación honesta a ser de los
                primeros, sin atribuir opiniones a nadie que no las dio. */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5 }}
              className="flex flex-col justify-center gap-4 rounded-3xl border border-white/10 bg-white/[0.03] p-6 sm:p-8"
            >
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-hf-fuchsia/30 bg-hf-fuchsia/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-hf-fuchsia">
                <Star size={12} fill="currentColor" />
                Programa Fundadores
              </span>
              <p className="font-[family-name:var(--font-hf-heading)] text-lg font-bold text-white">
                Entra ahora y ayuda a definir la plataforma
              </p>
              <p className="text-[13px] leading-relaxed text-white/60">
                Los primeros entrenadores tienen línea directa con nuestro equipo, prioridad en
                soporte y las nuevas funciones (como HakAI) llegan primero a sus cuentas.
              </p>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
