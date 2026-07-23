import Image from "next/image";
import { Dumbbell, HeartPulse, BrainCircuit, ShieldCheck, Instagram, MessageCircle, Youtube, Mail } from "lucide-react";

// Progreso decorativo — ajusta este número a mano según qué tan avanzada
// esté la plataforma cuando se muestre esta página.
const PROGRESS_PCT = 70;

const features = [
  { icon: Dumbbell, label: "Entrena\nInteligente", color: "#00C8FF" },
  { icon: HeartPulse, label: "Vive Más\nFuerte", color: "#FF2DB8" },
  { icon: BrainCircuit, label: "Impulsado por\nInteligencia Artificial", color: "#6D2EFF" },
  { icon: ShieldCheck, label: "Seguro y\nConfiable", color: "#FF2DB8" },
] as const;

const socials = [
  { icon: Instagram, href: "https://instagram.com/HakunnaFit", label: "Instagram" },
  { icon: MessageCircle, href: "https://wa.me/573126070588", label: "WhatsApp" },
  { icon: Youtube, href: "#", label: "YouTube" },
  { icon: Mail, href: "mailto:soporte@send.hakunnafit.com", label: "Correo" },
] as const;

export function HakunnaFitComingSoon() {
  return (
    <main className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-hf-black px-6 py-16">
      {/* Fondo: puntos + marca de agua gigante + líneas diagonales de acento */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "26px 26px",
        }}
      />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[900px] w-[900px] -translate-x-1/2 -translate-y-1/2 opacity-[0.04]">
        <Image src="/images/LogoOriginal_Transparente.png" alt="" fill className="object-contain" />
      </div>
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-[420px] w-[420px] rotate-[18deg] opacity-30 blur-[1px]"
        style={{
          background: "linear-gradient(135deg, transparent 48%, #00C8FF 49%, transparent 51%)",
        }}
      />
      <div
        className="pointer-events-none absolute -bottom-32 -left-24 h-[420px] w-[420px] rotate-[18deg] opacity-30 blur-[1px]"
        style={{
          background: "linear-gradient(135deg, transparent 48%, #FF2DB8 49%, transparent 51%)",
        }}
      />

      <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center text-center">
        <div className="relative h-48 w-48 drop-shadow-[0_0_45px_rgba(109,46,255,0.35)] sm:h-56 sm:w-56">
          <Image src="/images/LogoOriginal_Transparente.png" alt="HakunnaFit" fill className="object-contain" priority />
        </div>

        <div className="mt-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.35em] text-hf-blue">
          <span className="h-px w-8 bg-hf-blue/40" />
          Sitio en construcción
          <span className="h-px w-8 bg-hf-fuchsia/40" />
        </div>

        <h1 className="mt-5 font-[family-name:var(--font-hf-heading)] text-5xl font-bold uppercase leading-[0.95] text-white sm:text-6xl">
          Estamos
          <br />
          <span
            style={{
              background: "linear-gradient(90deg,#00C8FF,#6D2EFF,#FF2DB8)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Construyendo
          </span>
        </h1>

        <p className="mt-5 max-w-lg text-base leading-relaxed text-white/70 sm:text-lg">
          Algo increíble está en camino. Muy pronto tendrás acceso a la plataforma fitness{" "}
          <span className="text-hf-blue">más completa</span> e <span className="text-hf-fuchsia">inteligente</span>.
        </p>

        <div className="mt-10 grid w-full grid-cols-2 gap-x-4 gap-y-8 border-y border-white/10 py-8 sm:grid-cols-4 sm:divide-x sm:divide-white/10">
          {features.map((f) => (
            <div key={f.label} className="flex flex-col items-center gap-2 px-2">
              <f.icon size={26} style={{ color: f.color }} />
              <span className="whitespace-pre-line text-xs font-semibold uppercase leading-snug text-white/80">
                {f.label}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-10 w-full max-w-md">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-white/50">Muy pronto disponible</p>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full"
              style={{ width: `${PROGRESS_PCT}%`, background: "linear-gradient(90deg,#00C8FF,#6D2EFF,#FF2DB8)" }}
            />
          </div>
          <p
            className="mt-2 font-[family-name:var(--font-hf-heading)] text-2xl font-bold"
            style={{
              background: "linear-gradient(90deg,#00C8FF,#6D2EFF,#FF2DB8)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            {PROGRESS_PCT}%
          </p>
        </div>

        <div className="mt-8 flex items-center gap-3">
          {socials.map((s) => (
            <a
              key={s.label}
              href={s.href}
              target={s.href.startsWith("http") ? "_blank" : undefined}
              rel="noopener noreferrer"
              aria-label={s.label}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-white/70 transition-colors hover:border-hf-blue/50 hover:text-hf-blue"
            >
              <s.icon size={18} />
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}
