// Catálogo maestro de HakunnaFit.
//
// Única fuente de verdad para los valores que se repiten en toda la
// plataforma: planes, estados, funcionalidades e integraciones. Cualquier
// combo, permiso o relación de la app debe leer de aquí en vez de escribir
// estos valores a mano en cada componente.
//
// Nota: esto NO construye ninguna pantalla de configuración todavía — es
// solo el catálogo de datos que esa pantalla (y el resto de la plataforma)
// va a consumir más adelante.

export const PLANS = [
  { key: "starter", label: "Starter", priceCop: 120000 },
  { key: "pro", label: "Pro", priceCop: 220000 },
  { key: "elite", label: "Elite", priceCop: 390000 },
] as const;
export type PlanKey = (typeof PLANS)[number]["key"];
export const PLAN_PRICE_COP: Record<PlanKey, number> = Object.fromEntries(
  PLANS.map((p) => [p.key, p.priceCop])
) as Record<PlanKey, number>;
export function planLabel(key: PlanKey | null): string {
  return PLANS.find((p) => p.key === key)?.label ?? "—";
}

// Tope de clientes por plan (mismo límite usado en precios.tsx y el
// formulario de leads) — única fuente de verdad para el editor de entrenadores.
export const PLAN_CLIENT_CAP: Record<PlanKey, number> = {
  starter: 5,
  pro: 15,
  elite: 30,
};

export const LANDING_TYPES = [
  { key: "plantilla", label: "Landing Plantilla" },
  { key: "personalizada", label: "Landing Personalizada" },
  { key: "premium", label: "Landing Premium" },
] as const;
export type LandingTypeKey = (typeof LANDING_TYPES)[number]["key"];

export const LANDING_STATUSES = [
  { key: "pendiente", label: "Pendiente" },
  { key: "en_diseno", label: "En Diseño" },
  { key: "en_revision", label: "En Revisión" },
  { key: "publicada", label: "Publicada" },
  { key: "suspendida", label: "Suspendida" },
] as const;
export type LandingStatusKey = (typeof LANDING_STATUSES)[number]["key"];
export function landingStatusLabel(key: LandingStatusKey): string {
  return LANDING_STATUSES.find((s) => s.key === key)?.label ?? key;
}

export const DASHBOARD_STATUSES = [
  { key: "sin_acceso", label: "Sin acceso" },
  { key: "activo", label: "Activo" },
  { key: "suspendido", label: "Suspendido" },
  { key: "bloqueado", label: "Bloqueado" },
] as const;
export type DashboardStatusKey = (typeof DASHBOARD_STATUSES)[number]["key"];
export function dashboardStatusLabel(key: DashboardStatusKey): string {
  return DASHBOARD_STATUSES.find((s) => s.key === key)?.label ?? key;
}

// Estado general del entrenador como entidad de negocio (todavía no se
// persiste en ninguna tabla — catálogo listo para cuando se construya).
export const TRAINER_STATUSES = [
  { key: "lead", label: "Lead" },
  { key: "configuracion", label: "Configuración" },
  { key: "activo", label: "Activo" },
  { key: "suspendido", label: "Suspendido" },
  { key: "cancelado", label: "Cancelado" },
] as const;
export type TrainerStatusKey = (typeof TRAINER_STATUSES)[number]["key"];

// Funcionalidades que eventualmente se asignarán por plan.
export const FEATURES = [
  "Landing",
  "Dashboard",
  "Clientes",
  "Rutinas",
  "Nutrición",
  "Agenda",
  "Chat",
  "Seguimiento",
  "Fotos de progreso",
  "Biblioteca de ejercicios",
  "HakAI",
  "Automatizaciones",
  "Marketplace",
  "App Cliente",
  "App Personalizada",
  "Dominio Propio",
  "White Label",
  "Tienda de Suplementos",
  "Reportes Avanzados",
  "Soporte VIP",
] as const;
export type FeatureKey = (typeof FEATURES)[number];

// Qué funciones de FEATURES trae cada plan — alimenta las tarjetas
// "incluidas / no disponibles" del editor de entrenadores (sobre todo
// Starter, que necesita mostrar el gancho de upgrade a Pro).
export const PLAN_FEATURES: Record<PlanKey, FeatureKey[]> = {
  starter: ["Landing", "Clientes", "Seguimiento", "Reportes Avanzados"],
  pro: [
    "Landing",
    "Dashboard",
    "Clientes",
    "Rutinas",
    "Nutrición",
    "Agenda",
    "Chat",
    "Seguimiento",
    "Fotos de progreso",
    "Biblioteca de ejercicios",
    "HakAI",
    "App Cliente",
    "Reportes Avanzados",
  ],
  elite: [
    "Landing",
    "Dashboard",
    "Clientes",
    "Rutinas",
    "Nutrición",
    "Agenda",
    "Chat",
    "Seguimiento",
    "Fotos de progreso",
    "Biblioteca de ejercicios",
    "HakAI",
    "Automatizaciones",
    "App Cliente",
    "App Personalizada",
    "Dominio Propio",
    "White Label",
    "Tienda de Suplementos",
    "Reportes Avanzados",
    "Soporte VIP",
  ],
};

// Descripciones cortas para las tarjetas de funciones del editor (solo las
// que de verdad se muestran hoy — el resto de FEATURES queda listo para
// cuando se necesiten en otra pantalla).
export const FEATURE_DESCRIPTIONS: Partial<Record<FeatureKey, string>> = {
  Landing: "Tu sitio público para atraer clientes.",
  Dashboard: "Administra clientes, rutinas y pagos.",
  Clientes: "Formularios de contacto y gestión básica de clientes.",
  Rutinas: "Rutinas y planes nutricionales con IA.",
  Nutrición: "Planes de alimentación generados con IA.",
  HakAI: "IA para rutinas, nutrición y más.",
  "App Cliente": "Tu propia app para tus clientes.",
  "App Personalizada": "App con tu logo y tu marca.",
  "Dominio Propio": "Tu propio dominio, sin el subdominio de HakunnaFit.",
  "Tienda de Suplementos": "Vende planes y recibe pagos online.",
  Automatizaciones: "Emails, WhatsApp y recordatorios automáticos.",
  "Reportes Avanzados": "Visitas y contactos de tu landing.",
};

// Funciones puntuales que HakAI puede ejecutar (varían según plan/nicho).
export const HAKAI_FUNCTIONS = [
  "Evaluación Inicial",
  "Generar Rutina",
  "Generar Nutrición",
  "Generar Seguimiento",
  "Recomendación de Suplementos",
  "Mensajes Motivacionales",
  "Ajuste de Calorías",
  "Responder Chat",
  "Resumen del Cliente",
] as const;
export type HakaiFunctionKey = (typeof HAKAI_FUNCTIONS)[number];

// Pipeline de onboarding de un entrenador (todavía no persistido).
export const IMPLEMENTATION_STATUSES = [
  { key: "lead", label: "Lead" },
  { key: "pago_recibido", label: "Pago recibido" },
  { key: "cuenta_creada", label: "Cuenta creada" },
  { key: "landing_diseno", label: "Landing en Diseño" },
  { key: "landing_publicada", label: "Landing Publicada" },
  { key: "dashboard_activo", label: "Dashboard Activo" },
  { key: "primer_cliente", label: "Primer Cliente" },
  { key: "operando", label: "Operando" },
] as const;
export type ImplementationStatusKey = (typeof IMPLEMENTATION_STATUSES)[number]["key"];

// Estado de la suscripción (hoy se deriva de proximo_cobro; este catálogo
// queda listo para cuando exista facturación recurrente real vía Wompi).
export const SUBSCRIPTION_STATUSES = [
  { key: "prueba", label: "Prueba" },
  { key: "activa", label: "Activa" },
  { key: "proxima_vencer", label: "Próxima a vencer" },
  { key: "suspendida", label: "Suspendida" },
  { key: "cancelada", label: "Cancelada" },
] as const;
export type SubscriptionStatusKey = (typeof SUBSCRIPTION_STATUSES)[number]["key"];

export const INTEGRATIONS = [
  "OpenAI",
  "Gemini",
  "Claude",
  "Wompi",
  "Cloudinary",
  "Resend",
  "WhatsApp",
  "Google Calendar",
] as const;
export type IntegrationKey = (typeof INTEGRATIONS)[number];

export const SYSTEM_ROLES = [
  { key: "super_admin", label: "Super Admin" },
  { key: "administrador", label: "Administrador" },
  { key: "entrenador", label: "Entrenador" },
  { key: "cliente", label: "Cliente" },
] as const;
export type SystemRoleKey = (typeof SYSTEM_ROLES)[number]["key"];
