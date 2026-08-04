import type { ReactNode } from "react";
import type { BranchTheme } from "@/lib/branch-theme";

/**
 * Cabecera reutilizable "temática" por rama — foto de stock de la disciplina
 * del entrenador (running/crossfit/gym) + degradado de marca + efecto
 * "parallax" vía bg-fixed (CSS puro, ver lib/branch-theme.ts). Reemplaza los
 * títulos planos de texto blanco/gris que tenían Dashboard, Clientes,
 * Agenda y Entrenamientos — mismo componente en los 4 para que la
 * personalización se sienta consistente en todo el panel, no como un
 * parche puntual en una sola pantalla.
 */
export function BranchHero({
  theme,
  eyebrow,
  title,
  subtitle,
  right,
}: {
  theme: BranchTheme;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    // La foto+overlay viven en una capa absoluta APARTE con su propio
    // overflow-hidden (para que la imagen respete las esquinas redondeadas)
    // — el contenido (título + botones de "right") va en un hermano sin
    // overflow-hidden. Antes todo compartía un mismo contenedor
    // overflow-hidden: cualquier menú desplegable dentro de "right" (p. ej.
    // TrainerAgendaSettingsMenu, el botón "..." de conectar Google) quedaba
    // recortado por ese overflow-hidden apenas se abría — se veía "cortado"
    // en vez de flotar sobre el resto de la pantalla.
    <div className="relative rounded-3xl border border-white/10">
      <div className="absolute inset-0 overflow-hidden rounded-3xl">
        <div className="absolute inset-0 bg-cover bg-center bg-fixed" style={{ backgroundImage: `url(${theme.heroImage})` }} />
        <div className={`absolute inset-0 ${theme.overlayClassName}`} />
      </div>
      <div className="relative flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
        <div>
          {eyebrow && (
            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${theme.accentBadgeClassName}`}>
              {eyebrow}
            </span>
          )}
          <h1 className="mt-2 text-xl font-bold text-white">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-white/70">{subtitle}</p>}
        </div>
        {right && <div className="flex flex-wrap items-center gap-2">{right}</div>}
      </div>
    </div>
  );
}
