// Tema visual por rama del entrenador (running/crossfit/gym) — pensado para
// personalizar pantallas que hoy son idénticas sin importar la disciplina
// (ficha de cliente, dashboard). Reusa las mismas fotos de stock de Unsplash
// ya curadas para las landings Starter (ver starter-templates/types.ts,
// GALLERY_BY_BRANCH/STOCK_GALLERY) en vez de buscar imágenes nuevas, y los
// colores de marca ya definidos en tailwind.config.ts (hf-blue/hf-purple/
// hf-fuchsia — los mismos que usa site-background.tsx) en vez de inventar
// una paleta nueva.
//
// El "modo parallax" se logra con background-attachment: fixed (bg-fixed) —
// es CSS puro, sin JS ni librería nueva, coherente con "Simplicidad" del
// proyecto: la imagen queda fija mientras el contenido se desplaza encima.

export type BranchThemeKey = "running" | "crossfit" | "gym";

export interface BranchTheme {
  key: BranchThemeKey;
  label: string;
  heroImage: string;
  // Degradado oscuro (de abajo hacia arriba) con un toque de color de marca
  // arriba, para que el texto siempre sea legible sobre la foto.
  overlayClassName: string;
  accentTextClassName: string;
  accentBadgeClassName: string;
  accentBorderClassName: string;
}

const THEMES: Record<BranchThemeKey, BranchTheme> = {
  running: {
    key: "running",
    label: "Running",
    heroImage: "https://images.unsplash.com/photo-1590333748338-d629e4564ad9?auto=format&fit=crop&w=1600&q=80",
    overlayClassName: "bg-gradient-to-t from-hf-black via-hf-black/75 to-hf-blue/25",
    accentTextClassName: "text-hf-blue",
    accentBadgeClassName: "bg-hf-blue/15 text-hf-blue",
    accentBorderClassName: "border-hf-blue/30",
  },
  crossfit: {
    key: "crossfit",
    label: "Crossfit",
    heroImage: "https://images.unsplash.com/photo-1570440828762-ab7a993dbde8?auto=format&fit=crop&w=1600&q=80",
    overlayClassName: "bg-gradient-to-t from-hf-black via-hf-black/75 to-hf-fuchsia/25",
    accentTextClassName: "text-hf-fuchsia",
    accentBadgeClassName: "bg-hf-fuchsia/15 text-hf-fuchsia",
    accentBorderClassName: "border-hf-fuchsia/30",
  },
  gym: {
    key: "gym",
    label: "Modo Gym",
    heroImage: "https://images.unsplash.com/photo-1534368959876-26bf04f2c947?auto=format&fit=crop&w=1600&q=80",
    overlayClassName: "bg-gradient-to-t from-hf-black via-hf-black/75 to-hf-purple/25",
    accentTextClassName: "text-hf-purple",
    accentBadgeClassName: "bg-hf-purple/15 text-hf-purple",
    accentBorderClassName: "border-hf-purple/30",
  },
};

export function branchTheme(especialidad: string | null): BranchTheme {
  if (especialidad === "running") return THEMES.running;
  if (especialidad === "crossfit") return THEMES.crossfit;
  return THEMES.gym;
}
