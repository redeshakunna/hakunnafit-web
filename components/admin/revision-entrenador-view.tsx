"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Instagram,
  Facebook,
  Mail,
  MapPin,
  Phone,
  Star,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { activarEntrenador, type LeadRow, type TrainerRow } from "@/lib/admin-actions";
import { PLANS, STARTER_LANDING_TEMPLATES, branchLabel } from "@/lib/catalog";
import { fmtDate, Pill, planTone } from "./admin-ui";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <h3 className="mb-4 text-sm font-semibold text-white">{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[11px] text-white/40">{label}</p>
      <p className="mt-0.5 text-sm text-white">{value || "—"}</p>
    </div>
  );
}

export function RevisionEntrenadorView({ lead, trainer }: { lead: LeadRow; trainer: TrainerRow }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const planLabelTxt = PLANS.find((p) => p.key === trainer.plan)?.label ?? "—";
  const templateLabel = trainer.landing_template
    ? STARTER_LANDING_TEMPLATES.find((t) => t.key === trainer.landing_template)?.label ?? trainer.landing_template
    : null;

  const yaCreado = lead.estado === "entrenador_creado";
  const puedeActivar = lead.estado === "informacion_completada";

  const fotos = [trainer.avatar_url, trainer.foto2_url, trainer.foto3_url, trainer.foto4_url].filter(
    (f): f is string => !!f
  );

  function handleActivar() {
    setError(null);
    startTransition(async () => {
      const res = await activarEntrenador(lead.id);
      if (!res.ok) {
        setError(res.error || "No se pudo activar el entrenador.");
        setConfirming(false);
        return;
      }
      router.push(`/panel-hakunna/entrenadores?open=${trainer.id}`);
    });
  }

  return (
    <div className="mx-auto max-w-4xl pb-32">
      <Link
        href="/panel-hakunna/solicitudes"
        className="mb-6 inline-flex items-center gap-1.5 text-xs font-medium text-white/50 hover:text-white"
      >
        <ArrowLeft size={14} /> Volver a Solicitudes
      </Link>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">Crear Entrenador</h1>
          <p className="mt-1 text-sm text-white/50">
            Revisión final de la información que envió {trainer.business_name} en el onboarding.
          </p>
        </div>
        <Pill tone={planTone(trainer.plan)}>{planLabelTxt}</Pill>
      </div>

      {yaCreado && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-medium text-emerald-400">
          <CheckCircle2 size={16} /> Este entrenador ya fue creado y activado.
        </div>
      )}
      {!puedeActivar && !yaCreado && (
        <div className="mb-6 flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-medium text-amber-400">
          <AlertTriangle size={16} /> Esta solicitud todavía no completó el onboarding.
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <Section title="Perfil">
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-white/10">
              {trainer.avatar_url ? (
                <Image src={trainer.avatar_url} alt={trainer.business_name} fill className="object-cover" />
              ) : null}
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{trainer.business_name}</p>
              <p className="text-xs text-white/50">
                {trainer.subdominio ? `${trainer.subdominio}.hakunnafit.com` : "Sin subdominio"}
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Field label="Rama" value={branchLabel(trainer.especialidad)} />
            <Field label="Ciudad" value={trainer.ciudad} />
          </div>
          {trainer.tagline && <div className="mt-3"><Field label="Frase principal" value={trainer.tagline} /></div>}
          {trainer.biografia && <div className="mt-3"><Field label="Biografía" value={trainer.biografia} /></div>}
        </Section>

        <Section title="Contacto">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-sm text-white">
              <Phone size={14} className="text-white/40" /> {trainer.whatsapp || "—"}
            </div>
            <div className="flex items-center gap-2 text-sm text-white">
              <Mail size={14} className="text-white/40" /> {trainer.email_publico || lead.email}
            </div>
            <div className="flex items-center gap-2 text-sm text-white">
              <Instagram size={14} className="text-white/40" /> {trainer.instagram || "—"}
            </div>
            <div className="flex items-center gap-2 text-sm text-white">
              <Facebook size={14} className="text-white/40" /> {trainer.facebook || "—"}
            </div>
            <div className="flex items-center gap-2 text-sm text-white">
              <MapPin size={14} className="text-white/40" /> {trainer.ciudad || "—"}
            </div>
          </div>
        </Section>

        {templateLabel && (
          <Section title="Plantilla de landing">
            <p className="text-sm text-white">{templateLabel}</p>
          </Section>
        )}

        {trainer.servicios && trainer.servicios.length > 0 && (
          <Section title="Servicios">
            <div className="flex flex-col gap-3">
              {trainer.servicios.map((s, i) => (
                <div key={i} className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-white">{s.titulo}</p>
                    <span className="text-[10px] uppercase text-white/40">{s.tipo}</span>
                  </div>
                  <p className="mt-1 text-xs text-white/60">{s.descripcion}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {fotos.length > 0 && (
          <Section title="Fotos">
            <div className="grid grid-cols-4 gap-2">
              {fotos.map((f, i) => (
                <div key={i} className="relative aspect-square overflow-hidden rounded-lg bg-white/10">
                  <Image src={f} alt={`Foto ${i + 1}`} fill className="object-cover" />
                </div>
              ))}
            </div>
          </Section>
        )}

        {trainer.mostrar_transformaciones && trainer.transformaciones && trainer.transformaciones.length > 0 && (
          <Section title="Transformaciones">
            <div className="grid grid-cols-2 gap-3">
              {trainer.transformaciones.map((t, i) => (
                <div key={i} className="rounded-lg border border-white/10 bg-white/5 p-2">
                  <div className="grid grid-cols-2 gap-1">
                    <div className="relative aspect-square overflow-hidden rounded">
                      <Image src={t.antes} alt="Antes" fill className="object-cover" />
                    </div>
                    <div className="relative aspect-square overflow-hidden rounded">
                      <Image src={t.despues} alt="Después" fill className="object-cover" />
                    </div>
                  </div>
                  {t.nombre && <p className="mt-1.5 text-center text-[11px] text-white/50">{t.nombre}</p>}
                </div>
              ))}
            </div>
          </Section>
        )}

        {trainer.estadisticas && trainer.estadisticas.length > 0 && (
          <Section title="Estadísticas">
            <div className="grid grid-cols-2 gap-3">
              {trainer.estadisticas.map((e, i) => (
                <div key={i} className="rounded-lg border border-white/10 bg-white/5 p-3 text-center">
                  <p className="text-lg font-bold text-white">{e.valor}</p>
                  <p className="text-[11px] text-white/50">{e.etiqueta}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        {trainer.testimonios && trainer.testimonios.length > 0 && (
          <Section title="Testimonios">
            <div className="flex flex-col gap-3">
              {trainer.testimonios.map((t, i) => (
                <div key={i} className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <div className="flex items-center gap-0.5">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <Star
                        key={j}
                        size={12}
                        className={j < t.estrellas ? "fill-amber-400 text-amber-400" : "text-white/20"}
                      />
                    ))}
                  </div>
                  <p className="mt-1.5 text-xs text-white/70">&ldquo;{t.texto}&rdquo;</p>
                  <p className="mt-1 text-[11px] font-semibold text-white/50">{t.nombre}</p>
                </div>
              ))}
            </div>
          </Section>
        )}

        <Section title="Otros datos">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Solicitud enviada" value={fmtDate(lead.created_at)} />
            <Field label="Onboarding completado" value={trainer.onboarding_completed_at ? fmtDate(trainer.onboarding_completed_at) : "—"} />
          </div>
        </Section>
      </div>

      {!yaCreado && puedeActivar && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-[#0a0d16]/95 px-6 py-4 backdrop-blur lg:pl-72">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-4">
            <div>
              {error && <p className="text-xs font-medium text-red-400">{error}</p>}
              {!error && (
                <p className="text-xs text-white/50">
                  Al confirmar se{" "}
                  {trainer.plan === "starter" ? "publica la landing" : "activa el dashboard"} y se le avisa por correo.
                </p>
              )}
            </div>
            {confirming ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => setConfirming(false)}
                  className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold text-white/70 hover:border-white/30 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleActivar}
                  className="rounded-full px-5 py-2 text-xs font-semibold text-black disabled:opacity-50"
                  style={{ background: "linear-gradient(90deg,#00C8FF,#6D2EFF)" }}
                >
                  {isPending ? "Creando..." : "Confirmar y crear"}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                className="rounded-full px-6 py-2.5 text-sm font-semibold text-black"
                style={{ background: "linear-gradient(90deg,#00C8FF,#6D2EFF)" }}
              >
                Crear Entrenador
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
