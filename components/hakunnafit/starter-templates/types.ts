// Datos mínimos que cualquiera de las 3 plantillas Starter necesita para
// renderizar. Todos los campos opcionales pueden llegar vacíos porque
// normalmente el entrenador solo llena nombre/especialidad/ciudad/whatsapp al
// registrarse — bio, foto y redes las agrega Nando después desde el admin.
// Cada plantilla debe verse bien incluso si biografia/avatar_url/instagram/
// facebook son null. Las 3 plantillas comparten esta misma información — lo
// que cambia entre ellas es la distribución y los componentes usados para
// mostrarla, no los datos.
import type { CSSProperties } from "react";
import { TRAINER_BRANCHES } from "@/lib/catalog";
import type { PlanOfrecido } from "@/lib/admin-actions";
import { formatCop } from "@/lib/currency";

export interface StarterServicio {
  titulo: string;
  descripcion: string;
  tipo: "directo" | "personalizado";
}

// Un par de fotos "antes"/"después". "nombre" es opcional — se muestra como
// pie de foto (ej. "María González") y es editable incluso cuando las fotos
// son de stock, mientras el entrenador no tenga fotos reales de clientes.
export interface StarterTransformacion {
  antes: string;
  despues: string;
  nombre?: string | null;
}

// Cifra corta tipo "+8 Años de experiencia" en la franja de estadísticas de
// Impacto/Claro. Editable por el admin; si no hay ninguna guardada se usa
// DEFAULT_ESTADISTICAS.
export interface StarterEstadistica {
  valor: string;
  etiqueta: string;
}

// Testimonio de cliente. El avatar en pantalla se dibuja con iniciales (no
// foto de stock) para no atribuir una cara real a una cita de ejemplo
// mientras el admin no cargue testimonios reales.
export interface StarterTestimonio {
  texto: string;
  nombre: string;
  estrellas: number;
}

// Pregunta frecuente de la sección FAQ — la única sección de la landing que
// no tenía ningún dato asociado hasta ahora (Mi Sitio Web, ver panel).
export interface StarterFaq {
  pregunta: string;
  respuesta: string;
}

// Qué secciones de la landing están visibles — controlado desde Mi Sitio
// Web en el panel. "hero", "sobre_mi" y "contacto" no están aquí a propósito:
// son la portada, la presentación y el único medio de contacto de la
// landing, así que siempre se muestran (ninguna landing útil debería poder
// quedar sin ellas). Lo que sí se puede activar/desactivar es lo demás.
export interface StarterSeccionesActivas {
  servicios: boolean;
  planes: boolean;
  transformaciones: boolean;
  galeria: boolean;
  faq: boolean;
}

export const DEFAULT_SECCIONES_ACTIVAS: StarterSeccionesActivas = {
  servicios: true,
  planes: true,
  transformaciones: true,
  galeria: true,
  faq: true,
};

export interface StarterTrainerProfile {
  subdominio: string;
  businessName: string;
  especialidad: string | null;
  ciudad: string | null;
  whatsapp: string | null;
  whatsappPublico: string | null;
  emailPublico: string | null;
  biografia: string | null;
  avatarUrl: string | null;
  foto2Url: string | null;
  foto3Url: string | null;
  foto4Url: string | null;
  instagram: string | null;
  facebook: string | null;
  servicios: StarterServicio[] | null;
  planesOfrecidos: PlanOfrecido[] | null;
  mostrarTransformaciones: boolean;
  transformaciones: StarterTransformacion[] | null;
  estadisticas: StarterEstadistica[] | null;
  testimonios: StarterTestimonio[] | null;
  tagline: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  colorPrimario: string;
  colorSecundario: string;
  colorTerciario: string;
  faqs: StarterFaq[] | null;
  seccionesActivas: StarterSeccionesActivas;
}

// CSS custom properties con los 3 colores del entrenador — se ponen una vez
// en el contenedor raíz de cada plantilla (spread sobre su `style`) y de ahí
// en adelante cualquier elemento de la plantilla los usa vía var(--hf-primary)
// / var(--hf-secondary) / var(--hf-tertiary) en vez de un hex fijo. Así el
// panel de autoservicio del entrenador (updateOwnColors) cambia la landing
// entera sin tocar ningún componente.
export function brandColorVars(trainer: StarterTrainerProfile): CSSProperties {
  return {
    ["--hf-primary" as string]: trainer.colorPrimario,
    ["--hf-secondary" as string]: trainer.colorSecundario,
    ["--hf-tertiary" as string]: trainer.colorTerciario,
  } as CSSProperties;
}

// El pago en Starter es siempre por transferencia manual — no hay checkout
// online, así que cada botón de contacto de la landing termina en WhatsApp
// con un mensaje distinto según de qué sección viene (hero, un plan puntual,
// el formulario de contacto), en vez de un solo botón genérico repetido.
// El WhatsApp de la landing (el que ven los clientes) puede ser distinto
// del WhatsApp con el que el entrenador habla con Nando por cobros/soporte
// (ese vive en Mi Marca). Mientras el entrenador no configure uno de
// atención a clientes en Mi Sitio Web, se sigue usando el de Mi Marca como
// respaldo para no dejar los botones de la landing sin número.
export function resolvePublicWhatsapp(trainer: StarterTrainerProfile): string | null {
  return trainer.whatsappPublico?.trim() || trainer.whatsapp;
}

export function whatsappHref(whatsapp: string | null, presetMessage?: string): string | null {
  if (!whatsapp) return null;
  const digits = whatsapp.replace(/[^\d]/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}${presetMessage ? `?text=${encodeURIComponent(presetMessage)}` : ""}`;
}

export function heroWhatsappMessage(businessName: string): string {
  return `Hola, vi la página de ${businessName} y quiero más información.`;
}

export function planWhatsappMessage(titulo: string): string {
  return `Hola, quiero más información sobre el plan "${titulo}".`;
}

export function transformacionesWhatsappMessage(): string {
  return "Hola, vi tus resultados y quiero lograr algo similar.";
}

export function instagramHref(handle: string | null): string | null {
  if (!handle) return null;
  const clean = handle.trim().replace(/^@/, "");
  if (!clean) return null;
  return clean.startsWith("http") ? clean : `https://instagram.com/${clean}`;
}

export function facebookHref(handle: string | null): string | null {
  if (!handle) return null;
  const clean = handle.trim().replace(/^@/, "");
  if (!clean) return null;
  return clean.startsWith("http") ? clean : `https://facebook.com/${clean}`;
}

// Servicios/planes genéricos que le sirven a cualquier entrenador personal
// mientras no haya definido los suyos desde el admin (cada uno puede ser
// "directo" — precio y alcance fijo — o "personalizado" — a la medida, se
// cotiza por WhatsApp). "gym" es el set genérico de siempre; running/crossfit
// tienen el suyo propio acorde a la rama (ver TRAINER_BRANCHES en catalog.ts).
export const DEFAULT_SERVICIOS: StarterServicio[] = [
  {
    titulo: "Entrenamiento Personal",
    descripcion: "Rutinas personalizadas según tus objetivos y nivel.",
    tipo: "directo",
  },
  {
    titulo: "Asesoría Nutricional",
    descripcion: "Plan de alimentación adaptado a tu estilo de vida y metas.",
    tipo: "directo",
  },
  {
    titulo: "Plan a tu medida",
    descripcion: "Un programa 100% personalizado según lo que necesites lograr.",
    tipo: "personalizado",
  },
];

const SERVICIOS_BY_BRANCH: Record<string, StarterServicio[]> = {
  running: [
    {
      titulo: "Plan de Running Personalizado",
      descripcion: "Series, ritmos y mesociclos según tu objetivo: 5K, 10K, media o maratón.",
      tipo: "directo",
    },
    {
      titulo: "Asesoría en Nutrición Deportiva",
      descripcion: "Alimentación pensada para rendimiento, carga de carbohidratos y recuperación.",
      tipo: "directo",
    },
    {
      titulo: "Preparación para tu carrera",
      descripcion: "Plan 100% a la medida para tu próxima competencia.",
      tipo: "personalizado",
    },
  ],
  crossfit: [
    {
      titulo: "Programación de WODs",
      descripcion: "Metcons y trabajo funcional variado, semana a semana.",
      tipo: "directo",
    },
    {
      titulo: "Coaching de Levantamientos",
      descripcion: "Técnica en snatch, clean & jerk y levantamientos olímpicos.",
      tipo: "directo",
    },
    {
      titulo: "Plan a tu medida",
      descripcion: "Programación 100% personalizada para tu box o entrenamiento individual.",
      tipo: "personalizado",
    },
  ],
};

export function resolveServicios(trainer: StarterTrainerProfile): StarterServicio[] {
  if (trainer.servicios?.length) return trainer.servicios;
  return (trainer.especialidad && SERVICIOS_BY_BRANCH[trainer.especialidad]) || DEFAULT_SERVICIOS;
}

// Planes ofrecidos (Mi Sitio Web) — a diferencia de servicios/estadísticas/
// testimonios no hay un set genérico de relleno: son precios reales del
// entrenador, así que si todavía no cargó ninguno la sección simplemente no
// se muestra (mismo criterio que FAQ, ver resolveFaqs).
export function formatPlanPrice(precioCop: number | null): string {
  return precioCop != null ? formatCop(precioCop) : "Personalizado";
}

export function resolvePlanes(trainer: StarterTrainerProfile): PlanOfrecido[] {
  return trainer.planesOfrecidos?.filter((p) => p.nombre.trim()) ?? [];
}

// Fotos de stock (Unsplash, ya autorizado en next.config.mjs) que se usan
// como relleno de la sección de transformaciones mientras el entrenador no
// tiene fotos reales de clientes. Se reemplazan editando
// trainer.transformaciones desde el admin — no son de la misma persona, son
// solo ilustrativas.
// w=900&q=82: suficiente resolución para verse nítidas incluso en pantallas
// retina en la columna más ancha en que aparecen (~320px en el modelo
// Impacto), sin pasarse de peso para las cajas chicas de Claro/Personal.
export const STOCK_TRANSFORMACIONES: StarterTransformacion[] = [
  {
    antes: "https://images.unsplash.com/photo-1571731956672-f2b94d7dd0cb?auto=format&fit=crop&w=900&q=82",
    despues: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=900&q=82",
    nombre: "Camila Torres",
  },
  {
    antes: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=900&q=82",
    despues: "https://images.unsplash.com/photo-1544033527-b192daee1f5b?auto=format&fit=crop&w=900&q=82",
    nombre: "Andrés Gómez",
  },
  {
    antes: "https://images.unsplash.com/photo-1594381898411-846e7d193883?auto=format&fit=crop&w=900&q=82",
    despues: "https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?auto=format&fit=crop&w=900&q=82",
    nombre: "Valentina Ruiz",
  },
];

// Sets de fotos de stock por rama (Unsplash, mismo patrón que STOCK_TRANSFORMACIONES
// genérico de arriba, que ahora queda reservado a la rama "gym"). Se reemplazan
// editando trainer.transformaciones desde el admin — no son la misma persona,
// solo ilustrativas de la rama.
const TRANSFORMACIONES_BY_BRANCH: Record<string, StarterTransformacion[]> = {
  running: [
    {
      antes: "https://images.unsplash.com/photo-1645822937278-5e84025713f3?auto=format&fit=crop&w=900&q=82",
      despues: "https://images.unsplash.com/photo-1667781838690-5f32ea0ccea6?auto=format&fit=crop&w=900&q=82",
      nombre: "Camila Torres",
    },
    {
      antes: "https://images.unsplash.com/photo-1524646349956-1590eacfa324?auto=format&fit=crop&w=900&q=82",
      despues: "https://images.unsplash.com/photo-1598011872583-100f9b06de80?auto=format&fit=crop&w=900&q=82",
      nombre: "Andrés Gómez",
    },
    {
      antes: "https://images.unsplash.com/photo-1586280246643-9e2f01e3c14e?auto=format&fit=crop&w=900&q=82",
      despues: "https://images.unsplash.com/photo-1667917796503-b1dbf8abced0?auto=format&fit=crop&w=900&q=82",
      nombre: "Valentina Ruiz",
    },
  ],
  crossfit: [
    {
      antes: "https://images.unsplash.com/photo-1601422407692-ec4eeec1d9b3?auto=format&fit=crop&w=900&q=82",
      despues: "https://images.unsplash.com/photo-1632077804406-188472f1a810?auto=format&fit=crop&w=900&q=82",
      nombre: "Camila Torres",
    },
    {
      antes: "https://images.unsplash.com/photo-1653647358769-c0465db60293?auto=format&fit=crop&w=900&q=82",
      despues: "https://images.unsplash.com/photo-1644085159448-1659fd88a217?auto=format&fit=crop&w=900&q=82",
      nombre: "Andrés Gómez",
    },
    {
      antes: "https://images.unsplash.com/photo-1566568531155-07244e00963d?auto=format&fit=crop&w=900&q=82",
      despues: "https://images.unsplash.com/photo-1623428455276-c5243d302dbe?auto=format&fit=crop&w=900&q=82",
      nombre: "Valentina Ruiz",
    },
  ],
};

export function resolveTransformaciones(trainer: StarterTrainerProfile) {
  if (!trainer.mostrarTransformaciones) return null;
  if (trainer.transformaciones?.length) return trainer.transformaciones;
  return (trainer.especialidad && TRANSFORMACIONES_BY_BRANCH[trainer.especialidad]) || STOCK_TRANSFORMACIONES;
}

// Foto secundaria para la sección "Sobre mí" — si el entrenador subió una
// segunda foto se usa esa (da variedad entre secciones); si no, se repite la
// foto principal en vez de dejar un vacío.
export function secondaryPhoto(trainer: StarterTrainerProfile): string {
  return trainer.foto2Url || trainer.avatarUrl || "/images/NO_image.png";
}

// Relleno gratuito para la mini-galería cuando el entrenador no subió foto 3
// o 4 — para no dejar la sección vacía. A propósito son solo ambiente de
// gimnasio (sin personas reconocibles), nunca fotos de otra persona: eso sí
// se prestaría a confusión, porque esta sección se presenta como fotos del
// propio entrenador.
export const STOCK_GALLERY: string[] = [
  "https://images.unsplash.com/photo-1534368959876-26bf04f2c947?auto=format&fit=crop&w=1000&q=80",
  "https://images.unsplash.com/photo-1571902943202-507ec2618e8f?auto=format&fit=crop&w=1000&q=80",
];

// Galería ambiente por rama (sin personas reconocibles, mismo criterio que
// STOCK_GALLERY genérico de arriba, reservado ahora a la rama "gym").
const GALLERY_BY_BRANCH: Record<string, string[]> = {
  running: [
    "https://images.unsplash.com/photo-1590333748338-d629e4564ad9?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1602248349525-be667454a880?auto=format&fit=crop&w=1000&q=80",
  ],
  crossfit: [
    "https://images.unsplash.com/photo-1570440828762-ab7a993dbde8?auto=format&fit=crop&w=1000&q=80",
    "https://images.unsplash.com/photo-1706029831387-fd8bc3d27d01?auto=format&fit=crop&w=1000&q=80",
  ],
};

// Fotos 3 y 4 son opcionales — alimentan una mini-galería adicional. Si el
// entrenador no subió ninguna, se completa con el set de stock de su rama
// (o STOCK_GALLERY genérico) para que la sección nunca quede vacía.
export function galleryPhotos(trainer: StarterTrainerProfile): string[] {
  const reales = [trainer.foto3Url, trainer.foto4Url].filter((u): u is string => !!u);
  if (reales.length) return reales;
  return (trainer.especialidad && GALLERY_BY_BRANCH[trainer.especialidad]) || STOCK_GALLERY;
}

// Frase principal del hero (ej. "Entrena tu cuerpo, transforma tu vida.").
// Genérica y editable — mientras el admin no la personalice, se usa la
// tagline por defecto de la rama del entrenador (ver TRAINER_BRANCHES).
export function resolveTagline(trainer: StarterTrainerProfile): string {
  if (trainer.tagline?.trim()) return trainer.tagline.trim();
  const branch = trainer.especialidad && TRAINER_BRANCHES.find((b) => b.key === trainer.especialidad);
  return branch ? branch.tagline : "Entrena tu cuerpo, transforma tu vida.";
}

// Estadísticas genéricas — se muestran mientras el entrenador no tenga las
// suyas cargadas desde el admin. Los valores son ejemplos, no datos reales;
// deben reemplazarse cuando el entrenador confirme sus cifras.
export const DEFAULT_ESTADISTICAS: StarterEstadistica[] = [
  { valor: "+8 Años", etiqueta: "de experiencia" },
  { valor: "+300", etiqueta: "Clientes transformados" },
  { valor: "100%", etiqueta: "Planes personalizados" },
  { valor: "Compromiso", etiqueta: "y resultados garantizados" },
];

const ESTADISTICAS_BY_BRANCH: Record<string, StarterEstadistica[]> = {
  running: [
    { valor: "+500", etiqueta: "Corredores entrenados" },
    { valor: "+50", etiqueta: "Carreras completadas" },
    { valor: "100%", etiqueta: "Planes por objetivo (5K–Maratón)" },
    { valor: "Mejora de marca", etiqueta: "personal garantizada" },
  ],
  crossfit: [
    { valor: "+300", etiqueta: "Atletas en el box" },
    { valor: "+1.000", etiqueta: "WODs programados" },
    { valor: "100%", etiqueta: "Trabajo funcional variado" },
    { valor: "Comunidad", etiqueta: "y resultados garantizados" },
  ],
};

export function resolveEstadisticas(trainer: StarterTrainerProfile): StarterEstadistica[] {
  if (trainer.estadisticas?.length) return trainer.estadisticas;
  return (trainer.especialidad && ESTADISTICAS_BY_BRANCH[trainer.especialidad]) || DEFAULT_ESTADISTICAS;
}

// Testimonios genéricos de ejemplo — claramente placeholder (sin foto real
// adjunta, solo iniciales) para que el admin sepa que debe reemplazarlos por
// los de clientes reales antes de publicar.
export const DEFAULT_TESTIMONIOS: StarterTestimonio[] = [
  { texto: "Cambió mi mentalidad y mi cuerpo. Hoy me siento más fuerte y seguro que nunca.", nombre: "Cliente real", estrellas: 5 },
  { texto: "Sus rutinas y su seguimiento marcaron la diferencia. 100% recomendado.", nombre: "Cliente real", estrellas: 5 },
  { texto: "Entrenar aquí es otra cosa: te motiva y te lleva al siguiente nivel.", nombre: "Cliente real", estrellas: 5 },
];

const TESTIMONIOS_BY_BRANCH: Record<string, StarterTestimonio[]> = {
  running: [
    { texto: "Bajé mi marca en 10K más de lo que imaginaba. El plan y el seguimiento hicieron la diferencia.", nombre: "Cliente real", estrellas: 5 },
    { texto: "Llegué a mi primera maratón sin lesionarme, con un plan hecho a mi medida.", nombre: "Cliente real", estrellas: 5 },
    { texto: "Entender mis ritmos cambió por completo mi manera de correr.", nombre: "Cliente real", estrellas: 5 },
  ],
  crossfit: [
    { texto: "Rompí varios PRs en meses. La programación semanal se siente hecha para mí.", nombre: "Cliente real", estrellas: 5 },
    { texto: "Los WODs nunca se sienten repetidos y el coaching en técnica es excelente.", nombre: "Cliente real", estrellas: 5 },
    { texto: "Encontré una comunidad además de un entrenador — eso se nota en los resultados.", nombre: "Cliente real", estrellas: 5 },
  ],
};

export function resolveTestimonios(trainer: StarterTrainerProfile): StarterTestimonio[] {
  if (trainer.testimonios?.length) return trainer.testimonios;
  return (trainer.especialidad && TESTIMONIOS_BY_BRANCH[trainer.especialidad]) || DEFAULT_TESTIMONIOS;
}

// FAQ — a diferencia de servicios/estadísticas/testimonios, no hay set por
// defecto ni por rama: si el entrenador no ha escrito ninguna desde Mi Sitio
// Web, la sección simplemente no se muestra (no tiene sentido inventar
// preguntas genéricas que no reflejen su negocio real).
export function resolveFaqs(trainer: StarterTrainerProfile): StarterFaq[] {
  return trainer.faqs?.filter((f) => f.pregunta.trim() && f.respuesta.trim()) ?? [];
}

export function seccionActiva(trainer: StarterTrainerProfile, key: keyof StarterSeccionesActivas): boolean {
  return trainer.seccionesActivas?.[key] ?? DEFAULT_SECCIONES_ACTIVAS[key];
}

// Iniciales para el avatar de un testimonio (nunca foto de stock — sería una
// cara real atribuida a una cita que podría ser de ejemplo).
export function initialsOf(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .filter(Boolean)
    .join("")
    .toUpperCase();
}
