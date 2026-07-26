import Image from "next/image";
import { ChevronDown, Facebook, Instagram, Mail, MapPin, MessageCircle, Star } from "lucide-react";
import {
  facebookHref,
  galleryPhotos,
  heroWhatsappMessage,
  initialsOf,
  instagramHref,
  planWhatsappMessage,
  resolveEstadisticas,
  resolveServicios,
  resolveTagline,
  resolveTestimonios,
  resolveTransformaciones,
  transformacionesWhatsappMessage,
  whatsappHref,
  type StarterTrainerProfile,
} from "./types";
import { WhatsappContactForm } from "./contact-form";

// Modelo "Personal" — formato centrado tipo tarjeta de presentación /
// link-in-bio, todo en una sola tarjeta que se desplaza verticalmente.
// Misma información que los otros 2 modelos, pero con componentes propios de
// este formato: acordeón para servicios y un carrusel angosto de
// transformaciones en vez de grillas o listas tradicionales.
export function PersonalTemplate({ trainer }: { trainer: StarterTrainerProfile }) {
  const wa = whatsappHref(trainer.whatsapp, heroWhatsappMessage(trainer.businessName));
  const ig = instagramHref(trainer.instagram);
  const fb = facebookHref(trainer.facebook);
  const transformaciones = resolveTransformaciones(trainer);
  const waTransformaciones = whatsappHref(trainer.whatsapp, transformacionesWhatsappMessage());
  const servicios = resolveServicios(trainer);
  const galeria = galleryPhotos(trainer);
  const estadisticas = resolveEstadisticas(trainer);
  const testimonios = resolveTestimonios(trainer);
  const tagline = resolveTagline(trainer);

  return (
    <main
      className="flex min-h-screen w-full justify-center px-4 py-10 sm:py-16"
      style={{ background: "linear-gradient(160deg,#00C8FF,#6D2EFF 55%,#FF2DB8)" }}
    >
      <div className="w-full max-w-sm rounded-[2rem] border border-white/20 bg-white/10 p-7 text-center backdrop-blur-md sm:p-8">
        <div className="relative mx-auto h-24 w-24 overflow-hidden rounded-full border-2 border-white/70">
          <Image
            src={trainer.avatarUrl || "/images/NO_image.png"}
            alt={trainer.businessName}
            fill
            sizes="96px"
            className="object-cover"
            priority
          />
        </div>

        <h1 className="mt-5 font-[family-name:var(--font-hf-heading)] text-2xl font-bold leading-tight text-white">
          {trainer.businessName}
        </h1>
        <p className="mt-1 font-[family-name:var(--font-hf-heading)] text-sm italic text-white/80">{tagline}</p>

        {trainer.especialidad && <p className="mt-1.5 text-sm font-medium text-white/85">{trainer.especialidad}</p>}

        {trainer.ciudad && (
          <span className="mt-1.5 flex items-center justify-center gap-1 text-xs text-white/70">
            <MapPin size={12} />
            {trainer.ciudad}
          </span>
        )}

        {trainer.biografia && <p className="mt-4 text-sm leading-relaxed text-white/85">{trainer.biografia}</p>}
        {trainer.emailPublico && (
          <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-white/70">
            <Mail size={12} />
            {trainer.emailPublico}
          </p>
        )}

        {/* Estadísticas */}
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          {estadisticas.map((stat, i) => (
            <div key={i} className="rounded-xl border border-white/15 bg-white/5 px-2 py-2.5 text-center">
              <p className="font-[family-name:var(--font-hf-heading)] text-sm font-bold text-white">{stat.valor}</p>
              <p className="text-[9.5px] leading-tight text-white/60">{stat.etiqueta}</p>
            </div>
          ))}
        </div>

        {/* Contacto principal */}
        <div className="mt-6 flex flex-col gap-3">
          {wa && (
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-gray-900 shadow-lg transition-transform hover:scale-[1.02]"
            >
              <MessageCircle size={16} />
              Escríbeme por WhatsApp
            </a>
          )}
          {ig && (
            <a href={ig} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-full border border-white/50 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10">
              <Instagram size={15} />
              Instagram
            </a>
          )}
          {fb && (
            <a href={fb} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-full border border-white/50 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10">
              <Facebook size={15} />
              Facebook
            </a>
          )}
        </div>

        {/* Servicios/planes — acordeón */}
        <div className="mt-8 rounded-2xl border border-white/20 bg-white/5 p-1.5 text-left">
          {servicios.map((s) => {
            const waPlan = whatsappHref(trainer.whatsapp, planWhatsappMessage(s.titulo));
            return (
              <details key={s.titulo} className="group border-b border-white/10 px-3 py-2.5 last:border-0">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold text-white">
                  <span className="flex items-center gap-2">
                    {s.titulo}
                    <span className="rounded-full bg-white/15 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white/70">
                      {s.tipo === "personalizado" ? "Personalizado" : "Directo"}
                    </span>
                  </span>
                  <ChevronDown size={15} className="shrink-0 text-white/60 transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-1.5 text-xs leading-relaxed text-white/70">{s.descripcion}</p>
                {waPlan && (
                  <a href={waPlan} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs font-semibold text-white underline underline-offset-2">
                    Quiero este plan
                  </a>
                )}
              </details>
            );
          })}
        </div>

        {/* Transformaciones — carrusel angosto */}
        {transformaciones && (
          <div className="mt-8 text-left">
            <p className="mb-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-white/60">Resultados</p>
            <div className="flex gap-2.5 overflow-x-auto pb-1">
              {transformaciones.map((pair, i) => (
                <div key={i} className="flex shrink-0 flex-col overflow-hidden rounded-xl border border-white/20">
                  <div className="flex gap-1">
                    <div className="relative h-24 w-16">
                      <Image
                        src={pair.antes}
                        alt={pair.nombre ? `Antes de ${pair.nombre}` : "Antes"}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    </div>
                    <div className="relative h-24 w-16">
                      <Image
                        src={pair.despues}
                        alt={pair.nombre ? `Después de ${pair.nombre}` : "Después"}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    </div>
                  </div>
                  {pair.nombre && (
                    <p className="truncate px-1 py-1 text-center text-[9px] font-semibold text-white/70">
                      {pair.nombre}
                    </p>
                  )}
                </div>
              ))}
            </div>
            {waTransformaciones && (
              <a
                href={waTransformaciones}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block text-xs font-semibold text-white underline underline-offset-2"
              >
                Quiero resultados como estos
              </a>
            )}
          </div>
        )}

        {/* Testimonios */}
        <div className="mt-8 text-left">
          <p className="mb-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-white/60">Lo que dicen mis clientes</p>
          <div className="flex gap-2.5 overflow-x-auto pb-1">
            {testimonios.map((t, i) => (
              <div key={i} className="w-52 shrink-0 rounded-xl border border-white/20 bg-white/5 p-3">
                <p className="text-xs italic leading-relaxed text-white/80">“{t.texto}”</p>
                <div className="mt-2.5 flex items-center gap-2">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/15 text-[10px] font-bold text-white">
                    {initialsOf(t.nombre)}
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-white">{t.nombre}</p>
                    <div className="flex gap-0.5 text-white/80">
                      {Array.from({ length: 5 }).map((_, s) => (
                        <Star key={s} size={9} fill={s < t.estrellas ? "currentColor" : "none"} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Galería adicional — solo si el entrenador subió más de 2 fotos */}
        {galeria.length > 0 && (
          <div className="mt-8 text-left">
            <p className="mb-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-white/60">Más fotos</p>
            <div className="flex gap-2.5 overflow-x-auto pb-1">
              {galeria.map((url, i) => (
                <div key={i} className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-white/20">
                  <Image src={url} alt={trainer.businessName} fill sizes="96px" className="object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Formulario de contacto */}
        <div className="mt-8 text-left">
          <p className="mb-2.5 text-xs font-semibold uppercase tracking-[0.2em] text-white/60">¿Hablamos?</p>
          <WhatsappContactForm whatsapp={trainer.whatsapp} theme="glass" />
        </div>

        <p className="mt-8 text-[10px] uppercase tracking-[0.3em] text-white/50">Impulsado por HakunnaFit</p>
      </div>
    </main>
  );
}
