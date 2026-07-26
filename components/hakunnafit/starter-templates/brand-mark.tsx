import Image from "next/image";

/**
 * Logo del entrenador en el header/hero de su landing — si no subió uno
 * (logo_url), en vez de dejar un hueco vacío se muestra el nombre de su
 * negocio con un tratamiento tipográfico a juego con sus colores de marca.
 */
export function BrandMark({
  logoUrl,
  businessName,
  className,
  textClassName,
  gradientText = true,
  imageClassName,
}: {
  logoUrl: string | null;
  businessName: string;
  className?: string;
  textClassName?: string;
  // Si es false, el nombre de respaldo se muestra con el color de texto que
  // traiga textClassName tal cual (sin degradado) — para fondos donde el
  // degradado de marca ya es el fondo mismo (ej. plantilla "Personal") y un
  // texto en degradado encima perdería legibilidad.
  gradientText?: boolean;
  imageClassName?: string;
}) {
  if (logoUrl) {
    return (
      <div className={`relative ${className ?? "h-10 w-40"}`}>
        <Image
          src={logoUrl}
          alt={businessName}
          fill
          className={imageClassName ?? "object-contain object-left"}
          sizes="200px"
        />
      </div>
    );
  }

  return (
    <span
      className={
        textClassName ??
        "font-[family-name:var(--font-hf-heading)] text-lg font-extrabold tracking-tight"
      }
      style={
        gradientText
          ? {
              background: "linear-gradient(90deg, var(--hf-primary), var(--hf-secondary))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }
          : undefined
      }
    >
      {businessName}
    </span>
  );
}
