import Image from "next/image";

// Pantalla completa reutilizada para los 3 estados "sin wizard" de
// /onboarding/[token]: enlace inválido/vencido, ya completado, o plan
// Pro/Elite (cuyos pasos extra todavía no existen). Mismo lenguaje visual
// que TrainerComingSoon, para que se sienta parte del mismo producto y no un
// error genérico de servidor.
export function OnboardingStatusScreen({
  eyebrow,
  title,
  message,
  tone = "neutral",
}: {
  eyebrow: string;
  title: string;
  message: string;
  tone?: "neutral" | "good" | "bad";
}) {
  const eyebrowColor = tone === "good" ? "text-emerald-400" : tone === "bad" ? "text-red-400" : "text-hf-blue";

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

      <div className="relative z-10 mx-auto flex max-w-lg flex-col items-center text-center">
        <div className="relative h-24 w-24 drop-shadow-[0_0_45px_rgba(109,46,255,0.35)] sm:h-28 sm:w-28">
          <Image src="/images/LogoOriginal_Transparente.png" alt="HakunnaFit" fill className="object-contain" priority />
        </div>

        <div className={`mt-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.35em] ${eyebrowColor}`}>
          <span className="h-px w-8 bg-current opacity-40" />
          {eyebrow}
          <span className="h-px w-8 bg-current opacity-40" />
        </div>

        <h1 className="mt-5 font-[family-name:var(--font-hf-heading)] text-2xl font-bold leading-tight text-white sm:text-3xl">
          {title}
        </h1>

        <p className="mt-5 max-w-md text-base leading-relaxed text-white/70">{message}</p>
      </div>
    </main>
  );
}
