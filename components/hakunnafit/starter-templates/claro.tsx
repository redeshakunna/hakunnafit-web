import Image from "next/image";
import Link from "next/link";
import {
  Award,
  Dumbbell,
  Facebook,
  Instagram,
  LogIn,
  Mail,
  MapPin,
  MessageCircle,
  Quote,
  Star,
  Target,
  TrendingUp,
  Utensils,
} from "lucide-react";
import {
  brandColorVars,
  facebookHref,
  formatPlanPrice,
  galleryPhotos,
  heroWhatsappMessage,
  initialsOf,
  instagramHref,
  planWhatsappMessage,
  resolveEstadisticas,
  resolveFaqs,
  resolvePlanes,
  resolvePublicWhatsapp,
  resolveServicios,
  resolveTagline,
  resolveTestimonios,
  resolveTransformaciones,
  seccionActiva,
  secondaryPhoto,
  transformacionesWhatsappMessage,
  whatsappHref,
  type StarterTrainerProfile,
} from "./types";
import { WhatsappContactForm } from "./contact-form";
import { BrandMark } from "./brand-mark";

const iconRow = [Dumbbell, Utensils, TrendingUp, Target, Award];
const DEFAULT_ICON_LABELS = ["Motivación y disciplina", "Resultados garantizados"];

// Modelo "Claro" — fondo claro, tipografía grande y una fila de íconos de
// features en vez de tarjetas. Misma información que "Impacto" (servicios,
// sobre mí, cifras, transformaciones, testimonios, contacto), distribuida de
// forma editorial y minimalista.
export function ClaroTemplate({ trainer }: { trainer: StarterTrainerProfile }) {
  const publicWhatsapp = resolvePublicWhatsapp(trainer);
  const wa = whatsappHref(publicWhatsapp, heroWhatsappMessage(trainer.businessName));
  const ig = instagramHref(trainer.instagram);
  const fb = facebookHref(trainer.facebook);
  const transformaciones = resolveTransformaciones(trainer);
  const waTransformaciones = whatsappHref(publicWhatsapp, transformacionesWhatsappMessage());
  const servicios = resolveServicios(trainer);
  const planes = resolvePlanes(trainer);
  const galeria = galleryPhotos(trainer);
  const estadisticas = resolveEstadisticas(trainer);
  const testimonios = resolveTestimonios(trainer);
  const tagline = resolveTagline(trainer);
  const faqs = resolveFaqs(trainer);
  const featureLabels = [...servicios.map((s) => s.titulo), ...DEFAULT_ICON_LABELS].slice(0, 5);
  const primerStat = estadisticas[0];

  return (
    <main className="min-h-screen w-full bg-[#F7F7F2] text-gray-900" style={brandColorVars(trainer)}>
      {/* Nav */}
      <header className="border-b border-gray-200/70">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <BrandMark
            logoUrl={trainer.logoUrl}
            businessName={trainer.businessName}
            className="h-8 w-36"
            textClassName="font-[family-name:var(--font-hf-heading)] text-sm font-bold uppercase tracking-[0.15em]"
          />
          <nav className="hidden items-center gap-7 text-sm font-medium text-gray-500 sm:flex">
            <a href="#inicio" className="border-b-2 border-[var(--hf-primary)] pb-1 text-gray-900">Inicio</a>
            <a href="#sobre-mi" className="hover:text-gray-900">Sobre mí</a>
            <a href="#servicios" className="hover:text-gray-900">Servicios</a>
            <a href="#resultados" className="hover:text-gray-900">Resultados</a>
            <a href="#contacto" className="hover:text-gray-900">Contacto</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href={`/landing/${trainer.subdominio}/registro`}
              className="flex items-center gap-1.5 rounded-full border-2 border-gray-300 px-4 py-1.5 text-xs font-semibold text-gray-600 hover:border-gray-400 hover:text-gray-900"
            >
              <LogIn size={14} />
              Ingresar
            </Link>
            {wa && (
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border-2 border-[var(--hf-primary)] px-4 py-1.5 text-xs font-semibold text-[var(--hf-secondary)] hover:bg-[var(--hf-primary)] hover:text-white"
              >
                WhatsApp
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Banner de marca — opcional, solo si el entrenador subió uno desde Mi Marca */}
      {trainer.bannerUrl && (
        <div className="relative h-32 w-full sm:h-52">
          <Image src={trainer.bannerUrl} alt="" fill sizes="100vw" className="object-cover" priority />
        </div>
      )}

      {/* Hero */}
      <section id="inicio" className="relative overflow-hidden px-6 pb-16 pt-16 sm:pt-24">
        <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1fr_auto_auto]">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">
              {trainer.especialidad || "Entrenador Personal"}
            </span>
            <h1 className="mt-4 font-[family-name:var(--font-hf-heading)] text-4xl font-black uppercase leading-[1.05] text-gray-900 sm:text-5xl">
              <span className="block">{tagline.split(",")[0]}</span>
              {tagline.includes(",") && (
                <span className="block text-[var(--hf-primary)]">{tagline.split(",").slice(1).join(",").trim()}</span>
              )}
            </h1>
            <p className="mt-5 max-w-md text-base leading-relaxed text-gray-500">
              {trainer.biografia
                ? trainer.biografia.split(".")[0] + "."
                : "Entrenamiento personalizado, disciplina y acompañamiento para lograr tu mejor versión."}
            </p>
            {trainer.ciudad && (
              <span className="mt-3 flex items-center gap-1.5 text-sm text-gray-400">
                <MapPin size={13} />
                {trainer.ciudad}
              </span>
            )}
            <div className="mt-7 flex flex-wrap items-center gap-4">
              {wa && (
                <a
                  href={wa}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-gray-900 px-7 py-3.5 text-sm font-semibold text-white hover:bg-gray-800"
                >
                  <MessageCircle size={16} />
                  Escríbeme por WhatsApp
                </a>
              )}
              <a href="#contacto" className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-700 hover:text-gray-900">
                Agenda tu valoración
                <span aria-hidden>→</span>
              </a>
            </div>
            {(ig || fb) && (
              <div className="mt-7 flex items-center gap-3">
                {ig && (
                  <a href={ig} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:border-gray-900 hover:text-gray-900">
                    <Instagram size={15} />
                  </a>
                )}
                {fb && (
                  <a href={fb} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:border-gray-900 hover:text-gray-900">
                    <Facebook size={15} />
                  </a>
                )}
              </div>
            )}
          </div>

          <div className="relative mx-auto aspect-[4/5] w-full max-w-xs overflow-hidden rounded-3xl">
            <div
              className="pointer-events-none absolute inset-0 -z-10 scale-125 rounded-full blur-2xl"
              style={{ backgroundColor: "color-mix(in srgb, var(--hf-primary) 10%, transparent)" }}
            />
            <Image
              src={trainer.avatarUrl || "/images/NO_image.png"}
              alt={trainer.businessName}
              fill
              sizes="(min-width: 1024px) 320px, 90vw"
              className="rounded-3xl object-cover"
              priority
            />
          </div>

          <div className="hidden -rotate-90 whitespace-nowrap text-[10px] font-semibold uppercase tracking-[0.4em] text-gray-300 lg:block">
            Disciplina · Enfoque · Constancia
          </div>
        </div>
      </section>

      {/* Fila de features */}
      <section className="border-y border-gray-200/70 bg-white px-6 py-10">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 text-center sm:grid-cols-5">
          {featureLabels.map((label, i) => {
            const Icon = iconRow[i % iconRow.length];
            return (
              <div key={label} className="flex flex-col items-center gap-2">
                <div
                  className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--hf-primary)]"
                  style={{ backgroundColor: "color-mix(in srgb, var(--hf-primary) 8%, white)" }}
                >
                  <Icon size={18} />
                </div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-600">{label}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Sobre mí */}
      <section id="sobre-mi" className="px-6 py-20">
        <div className="mx-auto grid max-w-5xl items-center gap-10 sm:grid-cols-[280px_1fr]">
          <div className="relative mx-auto aspect-[4/3] w-full overflow-hidden rounded-2xl border-l-4 border-[var(--hf-primary)] sm:aspect-[3/4]">
            <Image
              src={secondaryPhoto(trainer)}
              alt={trainer.businessName}
              fill
              sizes="(min-width: 640px) 280px, 90vw"
              className="object-cover grayscale"
            />
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--hf-primary)]">Sobre mí</span>
            <h2 className="mt-2 font-[family-name:var(--font-hf-heading)] text-3xl font-bold uppercase leading-tight text-gray-900">
              {primerStat ? `Más de ${primerStat.valor.replace(/^\+/, "")} ayudando` : "Ayudando"}
              <br />a personas a cambiar su vida.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-gray-500">
              {trainer.biografia ||
                `Soy ${trainer.businessName}${trainer.especialidad ? `, especialista en ${trainer.especialidad.toLowerCase()}` : ""}. Mi enfoque es 100% personalizado, adaptado a tu objetivo, tu estilo de vida y tus necesidades.`}
            </p>
            {wa && (
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wide text-gray-900 hover:text-[var(--hf-secondary)]"
              >
                Conoce más sobre mí
                <span aria-hidden>→</span>
              </a>
            )}
          </div>
        </div>
      </section>

      {/* Estadísticas */}
      <section className="bg-gray-900 px-6 py-10">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 divide-gray-700 text-center sm:grid-cols-4 sm:divide-x">
          {estadisticas.map((stat, i) => (
            <div key={i} className="px-2">
              <p className="font-[family-name:var(--font-hf-heading)] text-2xl font-bold text-[var(--hf-tertiary)]">{stat.valor}</p>
              <p className="mt-1 text-[11px] uppercase tracking-wide text-white/50">{stat.etiqueta}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Servicios */}
      {seccionActiva(trainer, "servicios") && (
      <section id="servicios" className="border-t border-gray-200/70 px-6 py-20">
        <div className="mx-auto max-w-2xl">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">Servicios</span>
          <h2 className="mt-2 font-[family-name:var(--font-hf-heading)] text-2xl font-bold text-gray-900">
            Cómo trabajamos juntos
          </h2>
          <div className="mt-8 divide-y divide-gray-200">
            {servicios.map((s, i) => {
              const waPlan = whatsappHref(publicWhatsapp, planWhatsappMessage(s.titulo));
              return (
                <div key={s.titulo} className="flex items-start gap-5 py-5">
                  <span className="font-[family-name:var(--font-hf-heading)] text-2xl font-bold text-gray-200">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{s.titulo}</h3>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                        {s.tipo === "personalizado" ? "Personalizado" : "Directo"}
                      </span>
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-gray-500">{s.descripcion}</p>
                    {waPlan && (
                      <a href={waPlan} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs font-semibold text-gray-900 underline underline-offset-2">
                        Quiero este plan
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
      )}

      {/* Planes */}
      {seccionActiva(trainer, "planes") && planes.length > 0 && (
      <section id="planes" className="border-t border-gray-200/70 px-6 py-20">
        <div className="mx-auto max-w-2xl">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">Planes</span>
          <h2 className="mt-2 font-[family-name:var(--font-hf-heading)] text-2xl font-bold text-gray-900">Elige tu plan</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {planes.map((p) => {
              const waPlan = whatsappHref(publicWhatsapp, planWhatsappMessage(p.nombre));
              return (
                <div key={p.nombre} className="flex flex-col rounded-2xl border border-gray-200 p-5">
                  <h3 className="font-semibold text-gray-900">{p.nombre}</h3>
                  <p className="mt-2 text-xl font-bold text-[var(--hf-secondary)]">
                    {formatPlanPrice(p.precioCop)}
                    {p.precioCop != null && <span className="text-xs font-normal text-gray-400"> / mes</span>}
                  </p>
                  {p.incluye && <p className="mt-2 flex-1 whitespace-pre-line text-sm leading-relaxed text-gray-500">{p.incluye}</p>}
                  {waPlan && (
                    <a
                      href={waPlan}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-block text-xs font-semibold text-gray-900 underline underline-offset-2"
                    >
                      Quiero este plan
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
      )}

      {/* Galería adicional — solo si el entrenador subió más de 2 fotos */}
      {seccionActiva(trainer, "galeria") && galeria.length > 0 && (
        <section className="border-t border-gray-200/70 px-6 py-16">
          <div className={`mx-auto grid max-w-2xl gap-4 ${galeria.length > 1 ? "sm:grid-cols-2" : ""}`}>
            {galeria.map((url, i) => (
              <div key={i} className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-gray-200">
                <Image
                  src={url}
                  alt={trainer.businessName}
                  fill
                  sizes="(min-width: 640px) 328px, 100vw"
                  className="object-cover"
                />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Transformaciones */}
      {seccionActiva(trainer, "transformaciones") && transformaciones && (
        <section id="resultados" className="border-t border-gray-200/70 px-6 py-20">
          <div className="mx-auto max-w-4xl">
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">Resultados</span>
            <h2 className="mt-2 font-[family-name:var(--font-hf-heading)] text-2xl font-bold text-gray-900">
              Transformaciones reales
            </h2>
            <div className="mt-8 flex gap-5 overflow-x-auto pb-2">
              {transformaciones.map((pair, i) => (
                <div key={i} className="flex shrink-0 flex-col overflow-hidden rounded-xl border border-gray-200">
                  <div className="flex gap-1.5">
                    <div className="relative h-48 w-32">
                      <Image
                        src={pair.antes}
                        alt={pair.nombre ? `Antes de ${pair.nombre}` : "Antes"}
                        fill
                        sizes="128px"
                        className="object-cover"
                      />
                    </div>
                    <div className="relative h-48 w-32">
                      <Image
                        src={pair.despues}
                        alt={pair.nombre ? `Después de ${pair.nombre}` : "Después"}
                        fill
                        sizes="128px"
                        className="object-cover"
                      />
                    </div>
                  </div>
                  {pair.nombre && (
                    <p className="px-2 py-1.5 text-center text-[11px] font-semibold text-gray-600">{pair.nombre}</p>
                  )}
                </div>
              ))}
            </div>
            {waTransformaciones && (
              <a
                href={waTransformaciones}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex items-center gap-2 rounded-full border-2 border-gray-900 px-6 py-3 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-900 hover:text-white"
              >
                <MessageCircle size={15} />
                Quiero resultados como estos
              </a>
            )}
          </div>
        </section>
      )}

      {/* Testimonios */}
      <section className="border-t border-gray-200/70 bg-white px-6 py-20">
        <div className="mx-auto max-w-5xl text-center">
          <Quote className="mx-auto" style={{ color: "color-mix(in srgb, var(--hf-primary) 30%, transparent)" }} size={26} />
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">Testimonios</span>
          <h2 className="mt-2 font-[family-name:var(--font-hf-heading)] text-2xl font-bold text-gray-900">
            Lo que dicen mis clientes
          </h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-3">
            {testimonios.map((t, i) => (
              <div key={i} className="flex flex-col rounded-2xl border border-gray-200 bg-[#FAFAF7] p-5 text-left">
                <p className="flex-1 text-sm leading-relaxed text-gray-600">“{t.texto}”</p>
                <div className="mt-4 flex items-center gap-3">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-[var(--hf-secondary)]"
                    style={{ backgroundColor: "color-mix(in srgb, var(--hf-primary) 15%, white)" }}
                  >
                    {initialsOf(t.nombre)}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-900">{t.nombre}</p>
                    <div className="flex gap-0.5 text-[var(--hf-primary)]">
                      {Array.from({ length: 5 }).map((_, s) => (
                        <Star key={s} size={11} fill={s < t.estrellas ? "currentColor" : "none"} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Preguntas frecuentes */}
      {seccionActiva(trainer, "faq") && faqs.length > 0 && (
        <section id="faq" className="border-t border-gray-200/70 bg-white px-6 py-20">
          <div className="mx-auto max-w-3xl">
            <div className="text-center">
              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-400">Preguntas frecuentes</span>
              <h2 className="mt-2 font-[family-name:var(--font-hf-heading)] text-2xl font-bold text-gray-900">¿Tienes dudas?</h2>
            </div>
            <div className="mt-8 flex flex-col gap-3">
              {faqs.map((f, i) => (
                <details key={i} className="group rounded-2xl border border-gray-200 px-5 py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-gray-900">
                    {f.pregunta}
                    <span className="shrink-0 text-[var(--hf-primary)] transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-gray-500">{f.respuesta}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Contacto */}
      <section
        id="contacto"
        className="border-t border-gray-200/70 px-6 py-16"
        style={{ backgroundColor: "color-mix(in srgb, var(--hf-primary) 8%, white)" }}
      >
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-8 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-center sm:text-left">
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--hf-secondary)]">Hablemos de tus objetivos</span>
            <h2 className="mt-2 max-w-sm font-[family-name:var(--font-hf-heading)] text-2xl font-bold text-gray-900">
              Estoy aquí para ayudarte a lograr tu mejor versión.
            </h2>
            {wa && (
              <a
                href={wa}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-gray-900 px-6 py-3 text-sm font-semibold text-white hover:bg-gray-800"
              >
                <MessageCircle size={15} />
                Escríbeme por WhatsApp
              </a>
            )}
          </div>
          <div className="w-full max-w-xs rounded-2xl bg-white p-5 shadow-sm">
            <WhatsappContactForm whatsapp={publicWhatsapp} subdominio={trainer.subdominio} theme="light" />
            {trainer.emailPublico && (
              <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-gray-500">
                <Mail size={13} />
                {trainer.emailPublico}
              </p>
            )}
          </div>
        </div>
      </section>

      <footer className="border-t border-gray-200/70 px-6 py-6">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-2 text-center text-xs text-gray-400 sm:flex-row sm:justify-between">
          <span className="font-[family-name:var(--font-hf-heading)] font-bold uppercase tracking-wide text-gray-700">
            {trainer.businessName}
          </span>
          <span>© {new Date().getFullYear()} {trainer.businessName}. Todos los derechos reservados.</span>
          <span className="text-[var(--hf-secondary)]">{tagline}</span>
        </div>
      </footer>
    </main>
  );
}
