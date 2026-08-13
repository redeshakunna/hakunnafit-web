"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { useLeadModal } from "./lead-modal-context";

// Landing real de un entrenador activo en la plataforma — usada tanto por el
// botón "Ver ejemplo en vivo" del Hero como por la sección "Ejemplos reales"
// (brand-showcase.tsx). Antes esto apuntaba a "#" (placeholder sin resolver);
// ahora que hay entrenadores reales con landing publicada, se enlaza de una vez.
export const EXAMPLE_LIVE_URL = "https://camilorivas.hakunnafit.com";

// Iconos custom (línea con degradado oficial HakunnaFit, sin glow),
// generados en /public/icons — ver también las versiones .png transparentes.
const trustBullets = [
  { icon: "/icons/icon-config-48h.svg", label: "Configuración en 48 horas" },
  { icon: "/icons/icon-marca.svg", label: "Tu propia marca" },
  { icon: "/icons/icon-ia.svg", label: "IA incluida" },
  { icon: "/icons/icon-sin-conocimientos.svg", label: "Sin conocimientos técnicos" },
];

interface HeroSlide {
  id: string;
  eyebrow: string;
  title: string;
  highlight: string;
  description: string;
  features: string[];
  ctaLabel: string;
  ctaHref: string;
  image: string;
  imageAlt: string;
  accent: string;
}

// Slider a pantalla completa tipo "revolution slider": Slider01/02/03 en el
// orden pedido (resumen de todo lo que ofrece, panel/web del entrenador, y
// tienda). El texto de cada slide (incluidas las etiquetas de "features")
// está armado para calzar con lo que se ve dibujado en su propia imagen.
// Rota sola cada 6s, con flechas y puntos.
const slides: HeroSlide[] = [
  {
    id: "resumen",
    eyebrow: "Todo en un solo lugar",
    title: "Todo lo que",
    highlight: "tu negocio necesita.",
    description:
      "Un solo panel para administrar todo tu negocio de entrenamiento, con estas funciones incluidas:",
    features: ["Dashboard integral", "Gestión de clientes", "IA inteligente", "Funciones de pago", "Tienda personalizada"],
    ctaLabel: "Quiero mi demo →",
    ctaHref: "#lead-form",
    image: "/images/Slider01.png",
    imageAlt: "Resumen de lo que ofrece HakunnaFit para entrenadores",
    accent: "#6D2EFF",
  },
  {
    id: "web",
    eyebrow: "Plataforma SaaS para entrenadores",
    title: "Gestiona tu negocio",
    highlight: "desde un solo panel.",
    description: "Tu dashboard te muestra en tiempo real:",
    features: ["Clientes activos", "Ingresos del mes", "Progreso semanal", "Planes generados con IA"],
    ctaLabel: "Quiero mi demo →",
    ctaHref: "#lead-form",
    image: "/images/Slider02.png",
    imageAlt: "Panel de HakunnaFit con métricas del entrenador",
    accent: "#00C8FF",
  },
  {
    id: "tienda",
    eyebrow: "Nuevo: tienda HakunnaFit",
    title: "Equípate.",
    highlight: "Entrena. Compra.",
    description: "Todo lo que tus clientes necesitan, con tu marca:",
    features: ["Ropa premium", "Suplementos 100% originales", "Envíos a todo el país", "Pago seguro con Wompi"],
    ctaLabel: "Ver tienda →",
    ctaHref: "/tienda",
    image: "/images/Slider03.png",
    imageAlt: "Tienda HakunnaFit con ropa y suplementos",
    accent: "#FF2DB8",
  },
];

export function HakunnaFitHero() {
  const [index, setIndex] = useState(0);
  const { openModal } = useLeadModal();

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % slides.length), 6000);
    return () => clearInterval(id);
  }, []);

  const slide = slides[index];

  function go(delta: number) {
    setIndex((i) => (i + slides.length + delta) % slides.length);
  }

  return (
    <section id="producto" className="relative w-full overflow-hidden">
      {/* Fondo full-bleed con SlideMejorado.png, tipo "revolution slider" real
          (reemplaza el mockup flotante object-contain que había antes).
          Textos, features y botones no se tocaron. */}
      <div className="absolute inset-0 -z-10">
        <Image src="/images/SlideMejorado.png" alt="" fill priority className="object-cover" sizes="100vw" />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(90deg, rgba(10,10,12,0.92) 0%, rgba(10,10,12,0.55) 45%, rgba(10,10,12,0.25) 100%)" }}
        />
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, transparent 55%, rgba(10,10,12,0.9) 100%)" }}
        />
      </div>

      {/* Resplandores propios del slide activo (encima del fondo general fijo
          de toda la página), con el color de acento de cada slide. */}
      <AnimatePresence mode="sync">
        <motion.div
          key={`glow-a-${slide.id}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.35, x: [0, 24, 0], y: [0, -18, 0] }}
          exit={{ opacity: 0 }}
          transition={{
            opacity: { duration: 1 },
            x: { duration: 10, repeat: Infinity, ease: "easeInOut" },
            y: { duration: 10, repeat: Infinity, ease: "easeInOut" },
          }}
          className="pointer-events-none absolute -right-20 -top-24 h-[440px] w-[440px] rounded-full blur-[110px]"
          style={{ background: slide.accent }}
        />
      </AnimatePresence>
      <AnimatePresence mode="sync">
        <motion.div
          key={`glow-b-${slide.id}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.22, x: [0, -20, 0], y: [0, 16, 0] }}
          exit={{ opacity: 0 }}
          transition={{
            opacity: { duration: 1 },
            x: { duration: 12, repeat: Infinity, ease: "easeInOut" },
            y: { duration: 12, repeat: Infinity, ease: "easeInOut" },
          }}
          className="pointer-events-none absolute -bottom-24 left-1/4 h-[380px] w-[380px] rounded-full blur-[100px]"
          style={{ background: slide.accent }}
        />
      </AnimatePresence>

      <div className="relative mx-auto flex max-w-[1600px] flex-col-reverse items-center gap-8 px-6 py-8 sm:py-10 lg:flex-row lg:items-center lg:gap-6 xl:gap-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={`text-${slide.id}`}
            initial={{ opacity: 0, x: -24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 24 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="relative z-10 w-full min-w-0 max-w-lg lg:max-w-none lg:flex-1"
          >
            <span className="inline-block rounded-full border border-hf-fuchsia/30 bg-hf-fuchsia/10 px-5 py-2 text-sm font-semibold uppercase tracking-widest text-hf-fuchsia">
              {slide.eyebrow}
            </span>

            <h1 className="mt-6 font-[family-name:var(--font-hf-heading)] text-4xl font-black uppercase leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl">
              {slide.title}
              <br />
              <span
                style={{
                  background: "linear-gradient(90deg,#00C8FF,#6D2EFF,#FF2DB8)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {slide.highlight}
              </span>
            </h1>

            <p className="mt-6 font-[family-name:var(--font-hf-body)] text-base leading-relaxed text-white/70 sm:text-lg">
              {slide.description}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {slide.features.map((f) => (
                <span
                  key={f}
                  className="rounded-full border border-white/15 bg-white/[0.04] px-4 py-1.5 text-xs font-medium text-white/80 sm:text-sm"
                >
                  {f}
                </span>
              ))}
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              {slide.ctaHref === "#lead-form" ? (
                <button
                  type="button"
                  onClick={() => openModal()}
                  className="rounded-full px-7 py-3.5 text-sm font-semibold text-white transition-transform hover:scale-105 sm:text-base"
                  style={{ background: "linear-gradient(90deg,#00C8FF,#6D2EFF,#FF2DB8)" }}
                >
                  {slide.ctaLabel}
                </button>
              ) : (
                <a
                  href={slide.ctaHref}
                  className="rounded-full px-7 py-3.5 text-sm font-semibold text-white transition-transform hover:scale-105 sm:text-base"
                  style={{ background: "linear-gradient(90deg,#00C8FF,#6D2EFF,#FF2DB8)" }}
                >
                  {slide.ctaLabel}
                </a>
              )}
              <a
                href={EXAMPLE_LIVE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-full border border-white/15 px-7 py-3.5 text-sm font-semibold text-white transition-colors hover:border-white/30 sm:text-base"
              >
                <Play size={16} />
                Ver ejemplo en vivo
              </a>
            </div>
          </motion.div>
        </AnimatePresence>

      </div>

      {/* Controles del slider */}
      <div className="relative mx-auto flex max-w-7xl items-center justify-center gap-4 px-6 pb-4">
        <button
          aria-label="Slide anterior"
          onClick={() => go(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white/70 transition-colors hover:border-white/30 hover:text-white"
        >
          <ChevronLeft size={16} />
        </button>
        {slides.map((s, i) => (
          <button
            key={s.id}
            aria-label={`Ver slide ${i + 1}`}
            onClick={() => setIndex(i)}
            className="h-1.5 rounded-full transition-all"
            style={{
              width: i === index ? 24 : 8,
              background: i === index ? "linear-gradient(90deg,#00C8FF,#FF2DB8)" : "rgba(255,255,255,0.2)",
            }}
          />
        ))}
        <button
          aria-label="Siguiente slide"
          onClick={() => go(1)}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white/70 transition-colors hover:border-white/30 hover:text-white"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="relative mx-auto max-w-7xl border-t border-white/5 px-6 py-5">
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
          {trustBullets.map((b) => (
            <div key={b.label} className="flex flex-col items-center gap-2 text-center">
              <span className="flex h-20 w-20 items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.icon} alt="" className="h-20 w-20" />
              </span>
              <span className="font-[family-name:var(--font-hf-heading)] text-sm font-bold uppercase tracking-wide text-white/90 sm:text-base">
                {b.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
