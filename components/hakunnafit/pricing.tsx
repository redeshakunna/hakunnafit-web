"use client";

import { motion } from "framer-motion";
import { useLeadModal } from "./lead-modal-context";

const cop = (n: number) => `$${new Intl.NumberFormat("es-CO").format(n)} COP`;

interface Plan {
  key: string;
  name: string;
  tagline: string;
  monthly: number;
  semester: number;
  annual: number;
  featured?: boolean;
  highlights: string[];
  cta: string;
}

const plans: Plan[] = [
  {
    key: "starter",
    name: "Starter",
    tagline: "Tu presencia profesional, lista rápido.",
    monthly: 120000,
    semester: 648000,
    annual: 1224000,
    highlights: [
      "Hasta 5 clientes",
      "Landing con tu marca, lista en días",
      "Plantilla profesional lista para publicar",
      "Ideal si apenas estás comenzando",
      "Actualizaciones y seguridad incluidas",
      "Soporte por correo",
    ],
    cta: "Comenzar ahora",
  },
  {
    key: "pro",
    name: "Pro",
    tagline: "La opción que elige la mayoría de entrenadores.",
    monthly: 220000,
    semester: 1188000,
    annual: 2244000,
    featured: true,
    highlights: [
      "Hasta 15 clientes",
      "Dashboard completo: clientes, rutinas y agenda",
      "Rutinas y planes nutricionales con IA",
      "Landing personalizada",
      "Pagos integrados (Wompi, Stripe, Mercado Pago)",
      "Soporte prioritario",
    ],
    cta: "Comenzar ahora",
  },
  {
    key: "elite",
    name: "Elite",
    tagline: "Tu marca, sin límites.",
    monthly: 390000,
    semester: 2106000,
    annual: 3978000,
    highlights: [
      "Hasta 30 clientes",
      "Todo lo de Pro, a tu manera",
      "Dominio propio",
      "App con tu logo y tu marca",
      "Tienda de suplementos integrada",
      "Soporte VIP",
    ],
    cta: "Comenzar ahora",
  },
];

function GradientCheckDefs() {
  return (
    <svg width="0" height="0" className="absolute">
      <defs>
        <linearGradient id="hfCheckGrad" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="16" y2="16">
          <stop offset="0%" stopColor="#00C8FF" />
          <stop offset="50%" stopColor="#6D2EFF" />
          <stop offset="100%" stopColor="#FF2DB8" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function GradientCheck() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="mt-0.5 shrink-0">
      <path
        d="M3 8.5L6.3 12L13 4.5"
        stroke="url(#hfCheckGrad)"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PriceTier({ label, price, badge }: { label: string; price: number; badge?: string }) {
  return (
    <div className="flex items-center justify-between text-[12px]">
      <span className="text-white/45">{label}</span>
      <span className="flex items-center gap-2">
        <span className="font-medium text-white/70">{cop(price)}</span>
        {badge && (
          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
            {badge}
          </span>
        )}
      </span>
    </div>
  );
}

function PlanCard({ plan }: { plan: Plan }) {
  const { openModal } = useLeadModal();

  const card = (
    <div
      className={`flex h-full flex-col rounded-[24px] p-7 sm:p-8 ${
        plan.featured ? "bg-[#0b0f1c]" : "border border-white/10 bg-white/[0.025] backdrop-blur-sm"
      }`}
    >
      <p className="font-[family-name:var(--font-hf-heading)] text-lg font-bold uppercase tracking-wide text-white">
        {plan.name}
      </p>
      <p className="mt-1.5 text-[13px] leading-relaxed text-white/50">{plan.tagline}</p>

      <div className="mt-6">
        <div className="flex items-baseline gap-1.5">
          <span className="whitespace-nowrap font-[family-name:var(--font-hf-heading)] text-2xl font-black tracking-tight text-white sm:text-3xl">
            {cop(plan.monthly)}
          </span>
          <span className="shrink-0 text-sm text-white/45">/mes</span>
        </div>

        <div className="mt-4 space-y-1.5 border-t border-white/10 pt-4">
          <PriceTier label="6 meses" price={plan.semester} badge="Ahorra 10%" />
          <PriceTier label="Anual" price={plan.annual} badge="Ahorra 15% + 1 mes gratis" />
        </div>
      </div>

      <div className="mt-7 flex-1">
        <ul className="space-y-3">
          {plan.highlights.map((h) => (
            <li key={h} className="flex items-start gap-2.5 text-[13.5px] leading-snug text-white/80">
              <GradientCheck />
              {h}
            </li>
          ))}
        </ul>
      </div>

      <button
        type="button"
        onClick={() => openModal(plan.key as "starter" | "pro" | "elite")}
        className={`mt-8 flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold transition-transform hover:scale-[1.02] ${
          plan.featured
            ? "text-white"
            : "border border-white/20 text-white hover:border-white/40"
        }`}
        style={
          plan.featured
            ? { background: "linear-gradient(90deg,#00C8FF,#6D2EFF,#FF2DB8)" }
            : undefined
        }
      >
        {plan.cta}
      </button>
    </div>
  );

  if (plan.featured) {
    return (
      <div className="relative lg:z-10 lg:scale-[1.06]">
        <span className="absolute -top-4 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-full px-4 py-1.5 text-[11px] font-bold text-white shadow-lg" style={{ background: "linear-gradient(90deg,#00C8FF,#6D2EFF,#FF2DB8)" }}>
          ⭐ Recomendado
        </span>
        <div
          className="h-full rounded-[26px] p-[2px]"
          style={{ background: "linear-gradient(135deg,#00C8FF,#6D2EFF,#FF2DB8)" }}
        >
          {card}
        </div>
      </div>
    );
  }

  return <div className="h-full">{card}</div>;
}

export function HakunnaFitPricing() {
  return (
    <section id="precios" className="relative w-full py-20 sm:py-28">
      <GradientCheckDefs />

      <div className="relative mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-2xl text-center"
        >
          <h2 className="font-[family-name:var(--font-hf-heading)] text-2xl font-bold uppercase leading-tight text-white sm:text-3xl lg:text-4xl">
            Planes para{" "}
            <span className="bg-gradient-to-r from-hf-blue via-hf-purple to-hf-fuchsia bg-clip-text text-transparent">
              cada etapa de tu negocio
            </span>
          </h2>
        </motion.div>

        <div className="mt-16 grid gap-8 lg:grid-cols-3 lg:items-center lg:gap-10">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.key}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="h-full"
            >
              <PlanCard plan={plan} />
            </motion.div>
          ))}
        </div>

        <p className="mx-auto mt-14 max-w-xl text-center text-[13px] leading-relaxed text-white/40">
          Todos los planes incluyen actualizaciones gratuitas, seguridad en la nube y acceso a
          futuras mejoras de HakunnaFit.
        </p>
      </div>
    </section>
  );
}
