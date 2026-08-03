"use server";

// Portal del cliente final — /mi-progreso/[token]. Sin login: un solo link
// permanente por cliente (clients.portal_token, generado en la base de datos
// con default y sin expiración, a diferencia de calendar_connect_token o
// session_proposals.token que son de un solo propósito y expiran). Mismo
// criterio de costo/complejidad que ya se usa en calendar-connections-actions.ts
// y public-session-proposal-actions.ts: nada de cuentas ni sesiones, solo un
// token validado en cada acción.
//
// Alcance intencionalmente básico (pedido del negocio): el cliente puede ver
// su hoja de vida, su rutina asignada, su próxima cita, aprobar/rechazar las
// sesiones que le propuso el entrenador, ver su historial de peso/fotos y
// subir una foto de avance nueva. No puede editar nada de su perfil ni ver
// datos de otros clientes del mismo entrenador.

import { getSupabaseAdmin } from "./supabase-admin";
import { validateImageFile, imageExtension } from "./image-validation";
import type { AdminActionResult } from "./admin-actions";
import type { ClientRow, MeasurementRow } from "./trainer-clients-actions";
import type { RoutineRow } from "./trainer-routines-actions";
import {
  approveProposalItem,
  rejectAndReplaceItem,
  getReplacementSuggestions,
  type SuggestedSlot,
} from "./public-session-proposal-actions";

export type { SuggestedSlot };

interface PortalClient {
  id: string;
  trainerId: string;
}

/** Resuelve el cliente dueño de este token — null si el token no existe (el
 * portal nunca expira, así que no hay chequeo de vencimiento como en los
 * demás tokens de la plataforma). */
async function resolvePortalClient(token: string): Promise<PortalClient | null> {
  if (!token?.trim()) return null;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("clients").select("id, trainer_id").eq("portal_token", token).maybeSingle();
  if (error || !data) return null;
  return { id: data.id, trainerId: data.trainer_id };
}

export interface PortalTrainerBranding {
  businessName: string;
  logoUrl: string | null;
  colorPrimario: string;
  colorSecundario: string;
  whatsapp: string | null;
}

export interface PortalNextAppointment {
  scheduledAt: string;
  modalidad: string;
  duracionMin: number;
  meetLink: string | null;
}

export interface PortalPendingItem {
  id: string;
  scheduledAt: string;
  durationMin: number;
  modalidad: string;
  status: "pendiente" | "aprobada" | "rechazada";
}

export interface PortalPendingProposal {
  proposalId: string;
  items: PortalPendingItem[];
}

export interface ClientPortalData {
  client: ClientRow;
  trainer: PortalTrainerBranding;
  routine: RoutineRow | null;
  nextAppointment: PortalNextAppointment | null;
  pendingProposal: PortalPendingProposal | null;
  measurements: MeasurementRow[];
}

export async function getClientPortalData(token: string): Promise<ClientPortalData | null> {
  const resolved = await resolvePortalClient(token);
  if (!resolved) return null;

  const supabase = getSupabaseAdmin();
  const [{ data: client }, { data: trainer }, { data: routine }, { data: nextAppt }, { data: proposal }, { data: measurements }] =
    await Promise.all([
      supabase.from("clients").select("*").eq("id", resolved.id).maybeSingle(),
      supabase
        .from("trainers")
        .select("business_name, logo_url, color_primario, color_secundario, whatsapp_publico, whatsapp")
        .eq("id", resolved.trainerId)
        .maybeSingle(),
      supabase
        .from("weekly_plans")
        .select("*")
        .eq("client_id", resolved.id)
        .eq("status", "aprobado")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("evaluations")
        .select("scheduled_at, modalidad, duracion_min, meet_link")
        .eq("client_id", resolved.id)
        .not("status", "in", "(cancelada,completada)")
        .not("scheduled_at", "is", null)
        .gte("scheduled_at", new Date().toISOString())
        .order("scheduled_at", { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase.from("session_proposals").select("id").eq("client_id", resolved.id).eq("status", "pendiente").maybeSingle(),
      supabase.from("measurements").select("*").eq("client_id", resolved.id).order("fecha", { ascending: false }),
    ]);

  if (!client || !trainer) return null;

  let pendingProposal: PortalPendingProposal | null = null;
  if (proposal) {
    const { data: items } = await supabase
      .from("session_proposal_items")
      .select("id, scheduled_at, duration_min, modalidad, status")
      .eq("proposal_id", proposal.id)
      .order("scheduled_at", { ascending: true });
    pendingProposal = {
      proposalId: proposal.id,
      items: ((items ?? []) as { id: string; scheduled_at: string; duration_min: number; modalidad: string; status: string }[]).map(
        (i) => ({
          id: i.id,
          scheduledAt: i.scheduled_at,
          durationMin: i.duration_min,
          modalidad: i.modalidad,
          status: i.status as PortalPendingItem["status"],
        })
      ),
    };
  }

  return {
    client: client as ClientRow,
    trainer: {
      businessName: trainer.business_name,
      logoUrl: trainer.logo_url,
      colorPrimario: trainer.color_primario,
      colorSecundario: trainer.color_secundario,
      whatsapp: trainer.whatsapp_publico?.trim() || trainer.whatsapp,
    },
    routine: (routine as RoutineRow | null) ?? null,
    nextAppointment: nextAppt
      ? {
          scheduledAt: nextAppt.scheduled_at as string,
          modalidad: nextAppt.modalidad,
          duracionMin: nextAppt.duracion_min,
          meetLink: nextAppt.meet_link,
        }
      : null,
    pendingProposal,
    measurements: (measurements ?? []) as MeasurementRow[],
  };
}

// ---------------------------------------------------------------------------
// Progreso — subir foto de avance (crea una medición con solo la foto).
// ---------------------------------------------------------------------------

export async function addPortalProgressPhoto(token: string, formData: FormData): Promise<AdminActionResult & { url?: string }> {
  const resolved = await resolvePortalClient(token);
  if (!resolved) return { ok: false, error: "Este link ya no es válido." };

  const validated = validateImageFile(formData.get("foto"));
  if (!validated.ok) return { ok: false, error: validated.error };

  const supabase = getSupabaseAdmin();
  const ext = imageExtension(validated.file);
  const path = `${resolved.trainerId}/clientes/${resolved.id}/progreso-${Date.now()}.${ext}`;
  const buffer = Buffer.from(await validated.file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, buffer, { contentType: validated.file.type, upsert: true });
  if (uploadError) return { ok: false, error: uploadError.message };

  const { data } = supabase.storage.from("avatars").getPublicUrl(path);

  const peso = formData.get("peso");
  const pesoNum = peso && typeof peso === "string" && peso.trim() ? parseFloat(peso) : null;

  const { error: insertError } = await supabase.from("measurements").insert({
    client_id: resolved.id,
    fecha: new Date().toISOString().slice(0, 10),
    peso: pesoNum,
    foto_url: data.publicUrl,
  });
  if (insertError) return { ok: false, error: insertError.message };

  if (pesoNum != null) {
    await supabase.from("clients").update({ peso_actual: pesoNum }).eq("id", resolved.id);
  }

  return { ok: true, url: data.publicUrl };
}

// ---------------------------------------------------------------------------
// Agenda — aprobar/rechazar sesiones propuestas, delegando en las mismas
// acciones que ya usa /agenda/aprobar/[token]. El token de la propuesta
// (session_proposals.token) nunca sale al navegador del cliente: se resuelve
// acá, del lado del servidor, a partir del portal_token.
// ---------------------------------------------------------------------------

async function resolveProposalToken(portalToken: string, proposalId: string): Promise<string | null> {
  const resolved = await resolvePortalClient(portalToken);
  if (!resolved) return null;
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("session_proposals")
    .select("token, client_id")
    .eq("id", proposalId)
    .maybeSingle();
  if (!data || data.client_id !== resolved.id) return null;
  return data.token;
}

export async function approvePortalProposalItem(portalToken: string, proposalId: string, itemId: string): Promise<AdminActionResult> {
  const proposalToken = await resolveProposalToken(portalToken, proposalId);
  if (!proposalToken) return { ok: false, error: "Este link ya no es válido." };
  return approveProposalItem(proposalToken, itemId);
}

export async function getPortalReplacementSuggestions(
  portalToken: string,
  proposalId: string,
  itemId: string
): Promise<AdminActionResult & { slots?: SuggestedSlot[] }> {
  const proposalToken = await resolveProposalToken(portalToken, proposalId);
  if (!proposalToken) return { ok: false, error: "Este link ya no es válido." };
  return getReplacementSuggestions(proposalToken, itemId);
}

export async function rejectAndReplacePortalItem(
  portalToken: string,
  proposalId: string,
  itemId: string,
  chosenIso: string
): Promise<AdminActionResult> {
  const proposalToken = await resolveProposalToken(portalToken, proposalId);
  if (!proposalToken) return { ok: false, error: "Este link ya no es válido." };
  return rejectAndReplaceItem(proposalToken, itemId, chosenIso);
}
