"use client";

import Image from "next/image";
import Link from "next/link";
import { ExternalLink } from "lucide-react";

interface BrandCard {
  id: string;
  name: string;
  domain: string;
  image: string;
  href: string;
}

// Entrenadores reales de la plataforma — antes esta sección mostraba 6
// tarjetas con fotos de stock y links muertos ("#"). Ahora enlaza a landings
// publicadas de verdad. Camilo Rivas ya tiene banner propio subido; Fernando
// Gonzalez todavía no ha cargado sus fotos, así que usa una foto de stock
// temporal de la rama (running) hasta que suba las suyas.
const cards: BrandCard[] = [
  {
    id: "camilo",
    name: "Camilo Rivas",
    domain: "camilorivas.hakunnafit.com",
    image:
      "https://agrhzkwpwklycqtmdmed.supabase.co/storage/v1/object/public/avatars/fb719a1b-157f-42aa-9bef-b8a284476d22/banner_url-1786380031124.png",
    href: "https://camilorivas.hakunnafit.com",
  },
  {
    id: "fernando",
    name: "Fernando Gonzalez",
    domain: "fernandogonzalez.hakunnafit.com",
    image:
      "https://images.unsplash.com/photo-1571008887538-b36bb32f4571?auto=format&fit=crop&w=800&q=80",
    href: "https://fernandogonzalez.hakunnafit.com",
  },
];

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
        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-white/40" />
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

  return (
    <Link href={card.href} target="_blank" rel="noopener noreferrer" className="block h-full">
      {inner}
    </Link>
  );
}

export function HakunnaFitBrandShowcase() {
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

        <div className="mx-auto mt-12 grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-2">
          {cards.map((card) => (
            <BrandCardItem key={card.id} card={card} />
          ))}
        </div>
      </div>
    </section>
  );
}
