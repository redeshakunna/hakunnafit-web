"use client";

import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { useLeadModal } from "./lead-modal-context";

export function HakunnaFitCtaBanner() {
  const { openModal } = useLeadModal();

  return (
    <section className="relative mx-auto max-w-7xl px-6 py-10 sm:py-14">
      <div className="relative">
        <div
          className="absolute inset-0 rounded-[28px]"
          style={{ background: "linear-gradient(135deg,#00C8FF,#6D2EFF,#FF2DB8)", opacity: 0.12 }}
        />
        <div className="absolute inset-0 rounded-[28px] border border-white/10" />

        <div className="relative z-10 flex flex-col items-center gap-6 rounded-[28px] px-8 py-10 text-center sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:px-12 sm:py-12 sm:text-left">
          <div className="relative -mb-6 -mt-4 h-36 w-36 shrink-0 sm:-my-8 sm:h-52 sm:w-52">
            <Image
              src="/images/BannerOnlyLogo.png"
              alt="Mascota HakunnaFit levantando pesas"
              fill
              className="object-contain drop-shadow-2xl"
              sizes="(min-width: 640px) 208px, 144px"
            />
          </div>

          <div className="flex-1">
            <h2 className="font-[family-name:var(--font-hf-heading)] text-2xl font-bold uppercase leading-tight text-white sm:text-3xl">
              ¿Listo para convertirte en{" "}
              <span className="bg-gradient-to-r from-hf-blue via-hf-purple to-hf-fuchsia bg-clip-text text-transparent">
                una marca imparable
              </span>
              ?
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-white/60 sm:mx-0 sm:text-base">
              Solicita tu demo gratuita y descubre todo lo que HakunnaFit puede hacer por tu
              negocio.
            </p>
          </div>

          <button
            type="button"
            onClick={openModal}
            className="inline-flex shrink-0 items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold text-white transition-transform hover:scale-105 sm:text-base"
            style={{ background: "linear-gradient(90deg,#00C8FF,#6D2EFF,#FF2DB8)" }}
          >
            Quiero mi demo <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}
