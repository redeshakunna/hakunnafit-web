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

// Los 3 modelos de landing estandarizados para el plan Starter. El propio
// entrenador elige uno al llenar el formulario público (ver lead-modal.tsx);
// la elección viaja con el lead y se copia al entrenador al aprobarlo
// (convertLeadToTrainer). El componente real de cada uno vive en
// components/hakunnafit/starter-templates/. Por ahora esto solo cubre
// Starter — Pro/Elite quedan fuera de este catálogo hasta que se diseñen.
export const STARTER_LANDING_TEMPLATES = [
  {
    key: "impacto",
    label: "Impacto",
    tagline: "Oscuro y deportivo",
    description: "El mismo estilo de HakunnaFit: fondo oscuro, degradados de color y foto grande. Ideal para transmitir energía y fuerza.",
  },
  {
    key: "claro",
    label: "Claro",
    tagline: "Minimalista y editorial",
    description: "Fondo blanco, mucho espacio y tipografía grande. Ideal para un estilo boutique, profesional y elegante.",
  },
  {
    key: "personal",
    label: "Personal",
    tagline: "Cercano, tipo tarjeta",
    description: "Formato centrado tipo tarjeta de presentación, con tu foto y botones grandes para WhatsApp y redes. Ideal para verte cercano y fácil de contactar.",
  },
] as const;
export type StarterLandingTemplateKey = (typeof STARTER_LANDING_TEMPLATES)[number]["key"];
export const DEFAULT_STARTER_TEMPLATE: StarterLandingTemplateKey = "impacto";

// Las 3 ramas/nichos de entrenador que HakunnaFit atiende. Reemplaza el
// concepto anterior de "especialidad" genérica (fuerza/pérdida de
// peso/funcional/otro) — el campo `especialidad` de hakunnafit_leads y
// trainers ahora guarda una de estas 3 claves. Define tanto el copy/imágenes
// por defecto de las landings Starter (ver starter-templates/types.ts) como,
// más adelante, qué prompt usa HAKAI para generar rutinas.
export const TRAINER_BRANCHES = [
  {
    key: "running",
    label: "Running",
    tagline: "Corre más rápido, corre más lejos.",
    description: "Entrenadores de running: planes de ritmo, series, fondo y preparación para carreras.",
  },
  {
    key: "crossfit",
    label: "Crossfit",
    tagline: "Más fuerte cada WOD.",
    description: "Entrenadores/boxes de Crossfit: WODs, metcons y trabajo funcional de alta intensidad.",
  },
  {
    key: "gym",
    label: "Modo Gym",
    tagline: "Entrena tu cuerpo, transforma tu vida.",
    description: "Entrenamiento de fuerza y físico en gimnasio: hipertrofia, fuerza y composición corporal.",
  },
] as const;
export type TrainerBranchKey = (typeof TRAINER_BRANCHES)[number]["key"];
export function branchLabel(key: string | null): string {
  return TRAINER_BRANCHES.find((b) => b.key === key)?.label ?? "Entrenamiento personal";
}

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
