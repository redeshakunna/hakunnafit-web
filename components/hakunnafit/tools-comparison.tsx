import Image from "next/image";

export function HakunnaFitToolsComparison() {
  return (
    <section className="relative w-full py-14 sm:py-16">
      <div className="relative mx-auto max-w-5xl px-6 text-center">
        <span className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-white/60">
          Todo en un solo lugar
        </span>

        <h2 className="mt-6 whitespace-nowrap font-[family-name:var(--font-hf-heading)] text-xl font-bold uppercase leading-tight text-white sm:text-3xl lg:text-4xl">
          Deja de usar{" "}
          <span className="bg-gradient-to-r from-hf-blue via-hf-purple to-hf-fuchsia bg-clip-text text-transparent">
            5 herramientas distintas
          </span>
        </h2>

        <div className="relative mx-auto mt-8 max-w-2xl">
          <Image
            src="/images/Banner_Herramientas_cropped.png"
            alt="Deja de usar Excel, WhatsApp, Google Drive, Canva y PDF por separado: HakunnaFit lo reemplaza todo"
            width={1465}
            height={408}
            className="relative mx-auto w-full"
          />
        </div>
      </div>
    </section>
  );
}
