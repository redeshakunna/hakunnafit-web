import Image from "next/image";

// Placeholder que se muestra en <subdominio>.hakunnafit.com para un
// entrenador ya aprobado, mientras la plantilla real y personalizada de su
// plan todavía no existe. Se reemplazará por el diseño estandarizado del
// plan (Starter/Pro/Elite) cuando esté construido — por ahora deja claro que
// la cuenta es real y que su página está en camino.
export function TrainerComingSoon({ businessName }: { businessName: string }) {
  return (
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-hf-black px-6 py-16">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "26px 26px",
        }}
      />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 opacity-[0.04]">
        <Image src="/images/LogoOriginal_Transparente.png" alt="" fill className="object-contain" />
      </div>

      <div className="relative z-10 mx-auto flex max-w-xl flex-col items-center text-center">
        <div className="relative h-28 w-28 drop-shadow-[0_0_45px_rgba(109,46,255,0.35)] sm:h-32 sm:w-32">
          <Image src="/images/LogoOriginal_Transparente.png" alt="HakunnaFit" fill className="object-contain" priority />
        </div>

        <div className="mt-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.35em] text-hf-blue">
          <span className="h-px w-8 bg-hf-blue/40" />
          Página en construcción
          <span className="h-px w-8 bg-hf-fuchsia/40" />
        </div>

        <h1 className="mt-5 font-[family-name:var(--font-hf-heading)] text-3xl font-bold leading-tight text-white sm:text-4xl">
          Próximamente aparecerá
          <br />
          <span
            style={{
              background: "linear-gradient(90deg,#00C8FF,#6D2EFF,#FF2DB8)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {businessName}
          </span>
          <br />
          aquí en este sitio
        </h1>

        <p className="mt-5 max-w-md text-base leading-relaxed text-white/70">
          Estamos preparando esta página. Muy pronto podrás conocer los servicios de{" "}
          <span className="text-hf-blue">{businessName}</span> en HakunnaFit.
        </p>
      </div>
    </main>
  );
}
