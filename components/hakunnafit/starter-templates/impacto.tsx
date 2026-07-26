import Image from "next/image";
import {
  ArrowRight,
  ClipboardCheck,
  Dumbbell,
  Facebook,
  Instagram,
  Mail,
  MapPin,
  MessageCircle,
  Quote,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  User,
  Users,
  Utensils,
} from "lucide-react";
import {
  brandColorVars,
  facebookHref,
  galleryPhotos,
  heroWhatsappMessage,
  initialsOf,
  instagramHref,
  planWhatsappMessage,
  resolveEstadisticas,
  resolveFaqs,
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

const servicioIcons = [Dumbbell, Utensils, Sparkles, TrendingUp];
const statIcons = [User, Users, ClipboardCheck, ShieldCheck];
const GREEN = "linear-gradient(90deg,var(--hf-primary),var(--hf-secondary))";
const GREEN_DIAG = "linear-gradient(135deg,var(--hf-primary),var(--hf-secondary))";

// Modelo "Impacto" — fondo oscuro, franja diagonal verde y foto grande,
// pensado para transmitir energía. Estructura de landing completa: nav,
// hero, sobre mí + cifras, servicios, transformaciones, testimonios,
// contacto, footer.
export function ImpactoTemplate({ trainer }: { trainer: StarterTrainerProfile }) {
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
  const faqs = resolveFaqs(trainer);
  const [nombrePila, ...resto] = trainer.businessName.split(" ");
  const apellido = resto.join(" ");

  return (
    <main className="min-h-screen w-full bg-hf-black text-white" style={brandColorVars(trainer)}>
      {/* Nav */}
      <header className="sticky top-0 z-30 border-b border-white/10 bg-hf-black/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <BrandMark
            logoUrl={trainer.logoUrl}
            businessName={trainer.businessName}
            className="h-9 w-36"
            textClassName="font-[family-name:var(--font-hf-heading)] text-sm font-bold uppercase tracking-wide"
          />
          <nav className="hidden items-center gap-7 text-sm font-medium text-white/60 sm:flex">
            <a href="#inicio" className="border-b-2 border-[var(--hf-primary)] pb-1 text-white">Inicio</a>
            <a href="#sobre-mi" className="hover:text-white">Sobre mí</a>
            <a href="#servicios" className="hover:text-white">Servicios</a>
            <a href="#resultados" className="hover:text-white">Resultados</a>
            <a href="#contacto" className="hover:text-white">Contacto</a>
          </nav>
          {wa && (
            <a
              href={wa}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold text-white"
              style={{ background: GREEN }}
            >
              <MessageCircle size={14} />
              WhatsApp
            </a>
          )}
        </div>
      </header>

      {/* Banner de marca — opcional, solo si el entrenador subió uno desde Mi Marca */}
      {trainer.bannerUrl && (
        <div className="relative h-32 w-full sm:h-52">
          <Image src={trainer.bannerUrl} alt="" fill sizes="100vw" className="object-cover" priority />
          <div className="absolute inset-0 bg-gradient-to-t from-hf-black to-transparent" />
        </div>
      )}

      {/* Hero */}
      <section id="inicio" className="relative overflow-hidden px-6 pb-20 pt-16 sm:pt-24">
        <div
          className="pointer-events-none absolute inset-y-0 right-0 hidden w-[45%] opacity-90 lg:block"
          style={{
            background: GREEN_DIAG,
            clipPath: "polygon(38% 0, 100% 0, 100% 100%, 0% 100%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-[4%] hidden w-[8%] opacity-30 lg:block"
          style={{
            background: "linear-gradient(135deg,var(--hf-tertiary),var(--hf-primary))",
            clipPath: "polygon(38% 0, 100% 0, 100% 100%, 0% 100%)",
          }}
        />
        <div
          className="pointer-events-none absolute -left-20 top-24 h-64 w-64 rounded-full blur-[110px]"
          style={{ backgroundColor: "color-mix(in srgb, var(--hf-primary) 10%, transparent)" }}
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--hf-primary)]">
              {trainer.especialidad || "Entrenador Personal"}
            </span>
            <h1 className="mt-4 font-[family-name:var(--font-hf-heading)] text-5xl font-black uppercase leading-[0.95] sm:text-6xl">
              <span className="block text-white">{nombrePila}</span>
              {apellido && <span className="block text-[var(--hf-primary)]">{apellido}</span>}
            </h1>
            <p
              className="mt-4 max-w-md font-[family-name:var(--font-hf-heading)] text-lg italic"
              style={{ color: "color-mix(in srgb, var(--hf-tertiary) 90%, transparent)" }}
            >
              {tagline}
            </p>
            {trainer.ciudad && (
              <span className="mt-3 flex items-center gap-1.5 text-sm text-white/50">
                <MapPin size={14} className="text-[var(--hf-primary)]" />
                {trainer.ciudad}
              </span>
            )}
            <div className="mt-7 flex flex-wrap items-center gap-4">
              {wa && (
                <a
                  href={wa}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-[1.03]"
                  style={{ background: GREEN }}
                >
                  <MessageCircle size={16} />
                  Escríbeme por WhatsApp
                </a>
              )}
              <a
                href="#contacto"
                className="rounded-full border border-white/20 px-7 py-3.5 text-sm font-semibold text-white/80 hover:border-white/40"
              >
                Agenda tu valoración
              </a>
            </div>
            {(ig || fb || trainer.emailPublico) && (
              <div className="mt-7 flex items-center gap-3">
                {ig && (
                  <a href={ig} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white/70 hover:border-[var(--hf-primary)] hover:text-[var(--hf-primary)]">
                    <Instagram size={16} />
                  </a>
                )}
                {fb && (
                  <a href={fb} target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white/70 hover:border-[var(--hf-primary)] hover:text-[var(--hf-primary)]">
                    <Facebook size={16} />
                  </a>
                )}
                {trainer.emailPublico && (
                  <a href={`mailto:${trainer.emailPublico}`} aria-label="Correo" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white/70 hover:border-[var(--hf-primary)] hover:text-[var(--hf-primary)]">
                    <Mail size={16} />
                  </a>
                )}
              </div>
            )}
          </div>

          <div className="relative mx-auto aspect-[4/5] w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 sm:max-w-md">
            <Image
              src={trainer.avatarUrl || "/images/NO_image.png"}
              alt={trainer.businessName}
              fill
              sizes="(min-width: 1024px) 448px, 90vw"
              className="object-cover"
              priority
            />
          </div>
        </div>
      </section>

      {/* Sobre mí + estadísticas */}
      <section id="sobre-mi" className="relative overflow-hidden bg-[#0b0f1a] px-6 py-20">
        <div
          className="pointer-events-none absolute -left-10 top-10 h-40 w-40 rounded-[45%] border"
          style={{ borderColor: "color-mix(in srgb, var(--hf-primary) 20%, transparent)" }}
        />
        <div className="mx-auto grid max-w-5xl items-center gap-10 sm:grid-cols-[260px_1fr]">
          <div className="relative mx-auto aspect-square w-52 overflow-hidden rounded-2xl sm:w-full">
            <Image
              src={secondaryPhoto(trainer)}
              alt={trainer.businessName}
              fill
              sizes="(min-width: 640px) 260px, 208px"
              className="object-cover"
            />
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--hf-primary)]">Sobre mí</span>
            <h2 className="mt-2 font-[family-name:var(--font-hf-heading)] text-3xl font-bold text-white">
              Entreno personas,{" "}
              <span className="text-[var(--hf-primary)]">transformo vidas.</span>
            </h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-white/65">
              {trainer.biografia ||
                `Soy ${trainer.businessName}${trainer.especialidad ? `, especialista en ${trainer.especialidad.toLowerCase()}` : ""}. Mi enfoque es 100% personalizado, adaptado a tu objetivo, tu estilo de vida y tus necesidades.`}
            </p>
            <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
              {estadisticas.map((stat, i) => {
                const Icon = statIcons[i % statIcons.length];
                return (
                  <div key={i} className="flex items-start gap-2">
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--hf-primary)]"
                      style={{ backgroundColor: "color-mix(in srgb, var(--hf-primary) 15%, transparent)" }}
                    >
                      <Icon size={16} />
                    </div>
                    <div>
                      <p className="font-[family-name:var(--font-hf-heading)] text-sm font-bold text-white">{stat.valor}</p>
                      <p className="text-[11px] leading-tight text-white/50">{stat.etiqueta}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Servicios */}
      {seccionActiva(trainer, "servicios") && (
      <section id="servicios" className="bg-hf-black px-6 py-20">
        <div className="mx-auto max-w-5xl text-center">
          <span className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--hf-primary)]">Servicios</span>
          <h2 className="mt-2 font-[family-name:var(--font-hf-heading)] text-3xl font-bold">¿Cómo puedo ayudarte?</h2>
          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {servicios.map((s, i) => {
              const Icon = servicioIcons[i % servicioIcons.length];
              const waPlan = whatsappHref(trainer.whatsapp, planWhatsappMessage(s.titulo));
              return (
                <div key={s.titulo} className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-left">
                  <div className="flex items-center justify-between">
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-full text-[var(--hf-primary)]"
                      style={{ backgroundColor: "color-mix(in srgb, var(--hf-primary) 15%, transparent)" }}
                    >
                      <Icon size={19} />
                    </div>
                    <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white/50">
                      {s.tipo === "personalizado" ? "Personalizado" : "Directo"}
                    </span>
                  </div>
                  <h3 className="mt-4 font-semibold text-white">{s.titulo}</h3>
                  <p className="mt-1.5 flex-1 text-sm leading-relaxed text-white/55">{s.descripcion}</p>
                  {waPlan && (
                    <a
                      href={waPlan}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 text-xs font-semibold text-[var(--hf-primary)] hover:text-white"
                    >
                      Quiero este plan →
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
      )}

      {/* Transformaciones */}
      {seccionActiva(trainer, "transformaciones") && transformaciones && (
        <section id="resultados" className="bg-[#0b0f1a] px-6 py-20">
          <div className="mx-auto max-w-5xl text-center">
            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--hf-primary)]">Transformaciones</span>
            <h2 className="mt-2 font-[family-name:var(--font-hf-heading)] text-3xl font-bold text-white">Resultados reales</h2>
            <div className="mt-10 grid gap-6 sm:grid-cols-3">
              {transformaciones.map((pair, i) => (
                <div key={i} className="overflow-hidden rounded-2xl border border-white/10">
                  <div className="relative grid grid-cols-2">
                    <div className="relative aspect-[3/4]">
                      <Image
                        src={pair.antes}
                        alt={pair.nombre ? `Antes de ${pair.nombre}` : "Antes"}
                        fill
                        sizes="(min-width: 640px) 160px, 45vw"
                        className="object-cover"
                      />
                      <span className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white">Antes</span>
                    </div>
                    <div className="relative aspect-[3/4]">
                      <Image
                        src={pair.despues}
                        alt={pair.nombre ? `Después de ${pair.nombre}` : "Después"}
                        fill
                        sizes="(min-width: 640px) 160px, 45vw"
                        className="object-cover"
                      />
                      <span className="absolute bottom-2 right-2 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white" style={{ background: GREEN }}>Después</span>
                    </div>
                    <span
                      className="absolute left-1/2 top-1/2 flex h-7 w-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white text-white"
                      style={{ background: GREEN }}
                    >
                      <ArrowRight size={13} />
                    </span>
                  </div>
                  {pair.nombre && (
                    <p className="border-t border-white/10 bg-white/[0.02] px-3 py-2 text-xs font-semibold text-white/70">
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
                className="mt-8 inline-flex items-center gap-2 rounded-full border border-white/20 px-7 py-3 text-sm font-semibold text-white/85 hover:border-white/40"
              >
                Ver más transformaciones
                <ArrowRight size={15} />
              </a>
            )}
          </div>
        </section>
      )}

      {/* Galería adicional — solo si el entrenador subió más de 2 fotos */}
      {seccionActiva(trainer, "galeria") && galeria.length > 0 && (
        <section className="bg-hf-black px-6 py-16">
          <div className="mx-auto max-w-5xl">
            <div className={`grid gap-4 ${galeria.length > 1 ? "sm:grid-cols-2" : ""}`}>
              {galeria.map((url, i) => (
                <div key={i} className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-white/10">
                  <Image
                    src={url}
                    alt={trainer.businessName}
                    fill
                    sizes="(min-width: 640px) 500px, 100vw"
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Testimonios */}
      <section className="bg-[#0b0f1a] px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <div className="flex flex-col items-center gap-2 text-center">
            <Quote style={{ color: "color-mix(in srgb, var(--hf-primary) 40%, transparent)" }} size={30} />
            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--hf-primary)]">Testimonios</span>
            <h2 className="font-[family-name:var(--font-hf-heading)] text-3xl font-bold text-white">Lo que dicen mis clientes</h2>
          </div>
          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {testimonios.map((t, i) => (
              <div key={i} className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <p className="flex-1 text-sm italic leading-relaxed text-white/75">“{t.texto}”</p>
                <div className="mt-4 flex items-center gap-3">
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-[var(--hf-tertiary)]"
                    style={{ backgroundColor: "color-mix(in srgb, var(--hf-primary) 20%, transparent)" }}
                  >
                    {initialsOf(t.nombre)}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-white">{t.nombre}</p>
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
        <section id="faq" className="bg-[#0b0f1a] px-6 py-20">
          <div className="mx-auto max-w-3xl">
            <div className="text-center">
              <span className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--hf-primary)]">Preguntas frecuentes</span>
              <h2 className="mt-2 font-[family-name:var(--font-hf-heading)] text-3xl font-bold text-white">¿Tienes dudas?</h2>
            </div>
            <div className="mt-10 flex flex-col gap-3">
              {faqs.map((f, i) => (
                <details key={i} className="group rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-white">
                    {f.pregunta}
                    <span className="shrink-0 text-[var(--hf-primary)] transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 text-sm leading-relaxed text-white/60">{f.respuesta}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Contacto */}
      <section id="contacto" className="px-6 py-20" style={{ background: GREEN }}>
        <div className="mx-auto grid max-w-5xl gap-10 sm:grid-cols-2">
          <div>
            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-white/70">Contacto</span>
            <h2 className="mt-2 font-[family-name:var(--font-hf-heading)] text-3xl font-bold text-white">
              Estoy aquí para ayudarte a lograr tu mejor versión.
            </h2>
            <div className="mt-6 flex flex-col gap-3 text-sm text-white/90">
              {trainer.whatsapp && (
                <span className="flex items-center gap-2"><MessageCircle size={15} />{trainer.whatsapp}</span>
              )}
              {ig && <span className="flex items-center gap-2"><Instagram size={15} />{trainer.instagram}</span>}
              {trainer.emailPublico && <span className="flex items-center gap-2"><Mail size={15} />{trainer.emailPublico}</span>}
              {trainer.ciudad && <span className="flex items-center gap-2"><MapPin size={15} />{trainer.ciudad}</span>}
            </div>
          </div>
          <WhatsappContactForm whatsapp={trainer.whatsapp} subdominio={trainer.subdominio} theme="light" />
        </div>
      </section>

      <footer className="border-t border-white/10 bg-hf-black px-6 py-8">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-2 text-center text-xs text-white/40 sm:flex-row sm:justify-between">
          <span>© {new Date().getFullYear()} {trainer.businessName}. Todos los derechos reservados.</span>
          <span className="flex items-center gap-1">
            Powered by <span className="font-bold text-white/60">HAKUNNA FIT</span>
          </span>
        </div>
      </footer>
    </main>
  );
}
