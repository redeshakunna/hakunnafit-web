import Image from "next/image";
import { Facebook, Instagram, MessageCircle } from "lucide-react";

const nav = [
  { label: "Producto", href: "#producto" },
  { label: "Funciones", href: "#pilares" },
  { label: "Precios", href: "#precios" },
  { label: "Tienda", href: "/tienda" },
];

const legal = ["Términos", "Privacidad", "Cookies"];

const social = [
  { icon: Instagram, label: "Instagram" },
  { icon: Facebook, label: "Facebook" },
  { icon: MessageCircle, label: "WhatsApp" },
];

export function HakunnaFitFooter() {
  return (
    <footer className="relative border-t border-white/10 bg-hf-black text-white">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="flex flex-col items-center text-center">
          <div className="relative h-[147px] w-[280px] sm:h-[242px] sm:w-[460px]">
            <Image
              src="/images/LogoHorizontal-trasnparente.png"
              alt="HakunnaFit"
              fill
              className="object-contain"
            />
          </div>

          <p className="mt-5 max-w-md text-sm leading-relaxed text-white/50">
            La plataforma que impulsa a entrenadores a escalar su negocio con tecnología, IA y su
            propia marca.
          </p>

          <nav className="mt-8 flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {nav.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="font-[family-name:var(--font-hf-body)] text-xs font-medium uppercase tracking-[0.12em] text-white/70 transition-colors hover:text-hf-blue"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
            {legal.map((l) => (
              <span key={l} className="text-xs text-white/40">
                {l}
              </span>
            ))}
          </div>

          <div className="mt-7 flex items-center justify-center gap-3">
            {social.map((s) => (
              <a
                key={s.label}
                href="#"
                aria-label={s.label}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white/60 transition-colors hover:border-hf-blue/50 hover:text-hf-blue"
              >
                <s.icon size={16} />
              </a>
            ))}
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center gap-2 border-t border-white/10 pt-6 text-center sm:flex-row sm:justify-between sm:gap-4 sm:text-left">
          <p className="text-[11px] text-white/40">
            © {new Date().getFullYear()} HakunnaFit. Todos los derechos reservados.
          </p>
          <p className="text-[11px] text-white/40">
            By <span className="font-semibold text-white/70">Hakunna</span>{" "}
            <span className="italic text-white/70">Digital</span>
          </p>
        </div>
      </div>
    </footer>
  );
}
