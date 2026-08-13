"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { EXAMPLE_LIVE_URL } from "./hero";

const CASE_STUDY_IMG = "/images/Personalizado.png";

export function HakunnaFitCaseStudy() {
  return (
    <section id="caso-real" className="mx-auto max-w-7xl px-6 py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6 }}
        className="grid gap-10 rounded-[2rem] border border-black/5 bg-[#FAFAFB] p-8 sm:p-12 lg:grid-cols-2 lg:items-center"
      >
        <div>
          <span className="inline-block rounded-full border border-hf-fuchsia/30 bg-white px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-hf-fuchsia-text">
            Así se ve en producción
          </span>
          <h2 className="mt-4 font-[family-name:var(--font-hf-heading)] text-2xl font-black leading-tight sm:text-3xl">
            Caso real: Marion, entrenadora piloto
          </h2>
          <p className="mt-2 text-sm text-black/55">
            Entrenamiento personal de alto rendimiento — la primera cuenta
            corriendo sobre HakunnaFit.
          </p>

          <p className="mt-6 max-w-md text-[15px] leading-relaxed text-black/70">
            &ldquo;Con HakunnaFit tengo mi web, mi panel de clientes y las
            propuestas de plan armadas por IA, todo bajo mi marca. Solo reviso
            y apruebo.&rdquo;
          </p>

          <a
            href={EXAMPLE_LIVE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex items-center gap-2 text-sm font-semibold text-hf-blue-text"
          >
            Ver el sitio de Marion
            <ArrowRight size={15} />
          </a>
        </div>

        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          className="relative aspect-[1536/1024] w-full"
        >
          <Image
            src={CASE_STUDY_IMG}
            alt="Sitio de Marion corriendo sobre HakunnaFit"
            fill
            className="object-contain drop-shadow-2xl"
            sizes="(min-width: 1024px) 600px, 90vw"
          />
        </motion.div>
      </motion.div>
    </section>
  );
}
