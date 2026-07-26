"use server";

// Alta pública de un cliente final — nada de sesión, nadie autenticado:
// corre cuando un visitante llena el formulario de la landing de un
// entrenador o el link dedicado /landing/[subdominio]/registro (mismo
// server action para los dos puntos de entrada, ver comentario en cada
// componente que lo llama). Sigue el mismo patrón que submitHakunnaFitLead
// en actions.ts: resuelve todo con el cliente de servicio porque "clients"
// no tiene lectura pública (solo el propio entrenador puede leer sus
// clientes vía RLS), así que encadenar .select() tras el insert con el
// cliente anon fallaría.
//
// Los 3 planes comparten esta misma pieza: lo que cambia por plan no es la
// captura de datos (Starter también la tiene), sino qué hace el entrenador
// con el cliente después (Pro/Elite pueden generarle rutina con IA de una).

import { getSupabaseAdmin } from "./supabase-admin";
import { sendLeadEmail, renderLeadEmail } from "./email";

export interface PublicClientIntakeInput {
  subdominio: string;
  fullName: string;
  email?: string | null;
  whatsapp?: string | null;
  sexo?: string | null;
  nivel?: string | null;
  objetivo?: string | null;
  diasPorSemana?: number | null;
  horarioEntreno?: string | null;
  // Campo trampa: invisible para una persona real, cualquier bot que llene
  // todos los inputs del formulario (incluido este) cae aquí. Si viene con
  // contenido, se descarta la solicitud en silencio (200 falso-positivo, no
  // le decimos al bot que fue detectado).
  honeypot?: string | null;
}

export interface PublicClientIntakeResult {
  ok: boolean;
  error?: string;
  updated?: boolean; // true si ya existía y solo se completaron datos
}

function normalizeContact(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function submitPublicClientIntake(
  input: PublicClientIntakeInput
): Promise<PublicClientIntakeResult> {
  if (input.honeypot) {
    // Silencioso a propósito — no delatar al bot que fue detectado.
    return { ok: true };
  }

  const fullName = input.fullName?.trim();
  const email = normalizeContact(input.email);
  const whatsapp = normalizeContact(input.whatsapp);

  if (!fullName) {
    return { ok: false, error: "Tu nombre es obligatorio." };
  }
  if (!email && !whatsapp) {
    return { ok: false, error: "Déjanos tu correo o tu WhatsApp para que tu entrenador te contacte." };
  }

  const supabase = getSupabaseAdmin();

  const { data: trainer } = await supabase
    .from("trainers")
    .select("id, business_name, plan")
    .eq("subdominio", input.subdominio)
    .maybeSingle();

  if (!trainer) {
    return { ok: false, error: "No pudimos encontrar esta página. Verifica el link." };
  }

  // Deduplicar por WhatsApp o correo dentro del mismo entrenador — si la
  // persona ya había escrito por el formulario ligero de la landing y ahora
  // completa el link largo (o al revés), se completa la misma fila en vez
  // de crear un cliente repetido.
  let existingId: string | null = null;
  if (whatsapp || email) {
    const orFilters = [
      whatsapp ? `whatsapp.eq.${whatsapp}` : null,
      email ? `email.eq.${email}` : null,
    ]
      .filter(Boolean)
      .join(",");
    const { data: existing } = await supabase
      .from("clients")
      .select("id, email, whatsapp, sexo, nivel, objetivo, dias_por_semana, horario_entreno")
      .eq("trainer_id", trainer.id)
      .or(orFilters)
      .limit(1)
      .maybeSingle();
    if (existing) existingId = existing.id;
  }

  const diasPorSemana =
    typeof input.diasPorSemana === "number" && input.diasPorSemana > 0 ? input.diasPorSemana : null;

  if (existingId) {
    const { error } = await supabase
      .from("clients")
      .update({
        full_name: fullName,
        email: email ?? undefined,
        whatsapp: whatsapp ?? undefined,
        sexo: input.sexo || undefined,
        nivel: input.nivel || undefined,
        objetivo: input.objetivo || undefined,
        dias_por_semana: diasPorSemana ?? undefined,
        horario_entreno: input.horarioEntreno || undefined,
      })
      .eq("id", existingId);
    if (error) return { ok: false, error: "No pudimos guardar tus datos. Intenta de nuevo." };

    await notifyTrainer(trainer.id, trainer.business_name, fullName, true);
    return { ok: true, updated: true };
  }

  const { error } = await supabase.from("clients").insert({
    trainer_id: trainer.id,
    full_name: fullName,
    email,
    whatsapp,
    sexo: input.sexo || null,
    nivel: input.nivel || null,
    objetivo: input.objetivo || null,
    dias_por_semana: diasPorSemana,
    horario_entreno: input.horarioEntreno || null,
    status: "pendiente_evaluacion",
  });
  if (error) return { ok: false, error: "No pudimos guardar tus datos. Intenta de nuevo." };

  await notifyTrainer(trainer.id, trainer.business_name, fullName, false);
  return { ok: true, updated: false };
}

/**
 * Aviso al entrenador de que le llegó un cliente por su landing/link — no
 * usa createNotification() a propósito: ese sistema alimenta la campanita
 * de Nando en /panel-hakunna (solicitudes de entrenadores), no tiene nada
 * que ver con los clientes finales de cada entrenador. Aquí se reusa
 * trainer_activity (el feed que ya se ve en el Dashboard del panel del
 * entrenador) + un correo directo best-effort.
 */
async function notifyTrainer(
  trainerId: string,
  businessName: string,
  clientName: string,
  wasUpdate: boolean
): Promise<void> {
  const supabase = getSupabaseAdmin();

  await supabase.from("trainer_activity").insert({
    trainer_id: trainerId,
    type: "cliente_creado",
    title: wasUpdate ? `${clientName} completó sus datos` : `Nuevo cliente desde tu página: ${clientName}`,
  });

  const { data: profile } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", trainerId)
    .maybeSingle();
  if (!profile?.email) return;

  await sendLeadEmail({
    to: profile.email,
    subject: wasUpdate ? `${clientName} completó sus datos` : `Nuevo cliente: ${clientName}`,
    html: renderLeadEmail({
      nombre: businessName,
      title: wasUpdate ? "Un cliente completó sus datos" : "Tienes un cliente nuevo",
      message: `${clientName} ${
        wasUpdate ? "completó su información" : "se registró"
      } desde tu página. Entra al panel para revisar sus datos y agendar su evaluación.`,
      ctaLabel: "Ver en el panel",
      ctaUrl: `${process.env.NEXT_PUBLIC_SITE_URL || "https://hakunnafit.com"}/panel/clientes`,
      color: "#00C8FF",
    }),
  }).catch(() => {});
}
