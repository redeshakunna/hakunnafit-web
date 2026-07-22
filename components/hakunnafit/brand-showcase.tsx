"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { MARION_LIVE_URL } from "./hero";

interface BrandCard {
  id: string;
  name: string;
  domain: string;
  image: string;
  href: string;
  external: boolean;
}

const cards: BrandCard[] = [
  {
    id: "carlos",
    name: "Carlos Fit",
    domain: "carlosfit.hakunnafit.com",
    image:
      "https://images.unsplash.com/photo-1738523687459-963f3fb56522?auto=format&fit=crop&w=800&q=80",
    href: "#",
    external: false,
  },
  {
    id: "marion",
    name: "Marion Trainer",
    domain: "mariontrainer.hakunnafit.com",
    image:
      "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=800&q=80",
    href: MARION_LIVE_URL,
    external: true,
  },
  {
    id: "andres",
    name: "Andrés Rivera",
    domain: "andresrivera.hakunnafit.com",
    image:
      "https://images.unsplash.com/photo-1745329532593-53a9ec306787?auto=format&fit=crop&w=800&q=80",
    href: "#",
    external: false,
  },
  {
    id: "sofia",
    name: "Sofía Wellness",
    domain: "sofiawellness.hakunnafit.com",
    image:
      "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?auto=format&fit=crop&w=800&q=80",
    href: "#",
    external: false,
  },
  {
    id: "juan",
    name: "Juan Petrix",
    domain: "juanpetrix.hakunnafit.com",
    image:
      "https://images.unsplash.com/photo-1704223523381-bb976da90793?auto=format&fit=crop&w=800&q=80",
    href: "#",
    external: false,
  },
  {
    id: "camila",
    name: "Camila Strong",
    domain: "camilastrong.hakunnafit.com",
    image:
      "https://images.unsplash.com/photo-1574680096145-d05b474e2155?auto=format&fit=crop&w=800&q=80",
    href: "#",
    external: false,
  },
];

const PAGE_SIZE = 3;
const pages = Array.from({ length: Math.ceil(cards.length / PAGE_SIZE) }, (_, i) =>
  cards.slice(i * PAGE_SIZE, i * PAGE_SIZE + PAGE_SIZE)
);

function BrandCardItem({ card }: { card: BrandCard }) {
  const inner = (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] shadow-[0_20px_60px_-30px_rgba(0,0,0,0.8)] transition-transform duration-300 hover:-translate-y-1 hover:border-hf-blue/40">
      <div className="flex items-center gap-2 border-b border-white/10 bg-white/[0.04] px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f56]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#ffbd2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#27c93f]" />
        <span className="ml-3 flex-1 truncate rounded-full bg-black/30 px-3 py-1 text-[11px] text-white/50">
          {card.domain}
        </span>
        {card.external && <ExternalLink className="h-3.5 w-3.5 shrink-0 text-white/40" />}
      </div>

      <div className="relative aspect-[4/3] w-full overflow-hidden">
        <Image
          src={card.image}
          alt={`Sitio de ejemplo creado con HakunnaFit para ${card.name}`}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(min-width:1024px) 380px, 90vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-hf-black via-hf-black/10 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4">
          <p className="font-[family-name:var(--font-hf-heading)] text-lg font-bold text-white">
            {card.name}
          </p>
          <div className="mt-3 flex gap-2">
            <span className="rounded-full bg-gradient-to-r from-hf-blue via-hf-purple to-hf-fuchsia px-3 py-1 text-[11px] font-semibold text-white">
              Ver rutinas
            </span>
            <span className="rounded-full border border-white/30 px-3 py-1 text-[11px] font-semibold text-white/90">
              Agendar
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  if (card.external) {
    return (
      <Link href={card.href} target="_blank" rel="noopener noreferrer" className="block h-full">
        {inner}
      </Link>
    );
  }

  return <div className="h-full cursor-default">{inner}</div>;
}

export function HakunnaFitBrandShowcase() {
  const [page, setPage] = useState(0);

  function go(delta: number) {
    setPage((p) => (p + pages.length + delta) % pages.length);
  }

  return (
    <section id="ejemplos" className="relative w-full py-20 sm:py-24">
      <div className="relative mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
            Ejemplos reales
          </span>

          <h2 className="mt-6 font-[family-name:var(--font-hf-heading)] text-3xl font-bold uppercase leading-tight text-white sm:text-4xl lg:text-5xl">
            Así se verá{" "}
            <span className="bg-gradient-to-r from-hf-blue via-hf-purple to-hf-fuchsia bg-clip-text text-transparent">
              tu marca
            </span>
          </h2>

          <p className="mx-auto mt-5 text-base text-white/60 sm:text-lg">
            Cada entrenador tiene su propio dominio, sus colores y su contenido. Estos son ejemplos
            de sitios creados con HakunnaFit.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {pages[page].map((card) => (
            <BrandCardItem key={card.id} card={card} />
          ))}
        </div>

        {pages.length > 1 && (
          <div className="mt-8 flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Anterior"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition hover:border-hf-blue/40 hover:text-white"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2">
              {pages.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setPage(i)}
                  aria-label={`Ir a la página ${i + 1}`}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    i === page
                      ? "w-8 bg-gradient-to-r from-hf-blue via-hf-purple to-hf-fuchsia"
                      : "w-2 bg-white/20"
                  }`}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Siguiente"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition hover:border-hf-blue/40 hover:text-white"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
