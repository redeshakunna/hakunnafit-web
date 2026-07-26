"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Camera,
  Check,
  ExternalLink,
  Mail,
  MessageCircle,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import {
  updateTrainer,
  uploadTrainerPhoto,
  uploadTransformacionPhoto,
  type TrainerRow,
  type PhotoSlot,
  type TransformacionPar,
  type Estadistica,
  type Testimonio,
} from "@/lib/admin-actions";
import { LANDING_STATUSES, STARTER_LANDING_TEMPLATES, type StarterLandingTemplateKey } from "@/lib/catalog";
import { TemplatePreviewWide } from "@/components/hakunnafit/template-preview-card";
import { Pill, planTone } from "./admin-ui";
import type { StarterServicio } from "@/components/hakunnafit/starter-templates/types";

const DEFAULT_ROW: StarterServicio = { titulo: "", descripcion: "", tipo: "directo" };

/**
 * Pantalla dedicada para editar el contenido de la landing de un
 * entrenador Starter — más visible que el modal genérico de Entrenadores
 * porque solo muestra lo que de verdad se edita aquí: contenido, planes que
 * ofrece, contacto (todo apunta a WhatsApp porque el pago es por
 * transferencia), fotos y antes/después. Con vista previa en vivo al lado.
 */
export function LandingEditorView({ initialTrainer }: { initialTrainer: TrainerRow }) {
  const router = useRouter();
  const [trainer, setTrainer] = useState(initialTrainer);
  const [isPending, startTransition] = useTransition();
  const [previewKey, setPreviewKey] = useState(0);
  const [uploadingSlot, setUploadingSlot] = useState<PhotoSlot | null>(null);
  const fileInputs: Record<PhotoSlot, React.RefObject<HTMLInputElement>> = {
    avatar_url: useRef<HTMLInputElement>(null),
    foto2_url: useRef<HTMLInputElement>(null),
    foto3_url: useRef<HTMLInputElement>(null),
    foto4_url: useRef<HTMLInputElement>(null),
  };
  const transformFileInput = useRef<HTMLInputElement>(null);
  const [transformUploadTarget, setTransformUploadTarget] = useState<{
    index: number;
    field: "antes" | "despues";
  } | null>(null);
  const [uploadingTransform, setUploadingTransform] = useState<string | null>(null);

  const serviciosActuales: StarterServicio[] = trainer.servicios ?? [];

  function patch(fields: Partial<TrainerRow>) {
    setTrainer((t) => ({ ...t, ...fields }));
    startTransition(async () => {
      const result = await updateTrainer({
        trainerId: trainer.id,
        biografia: fields.biografia,
        whatsapp: fields.whatsapp,
        emailPublico: fields.email_publico,
        servicios: fields.servicios,
        mostrarTransformaciones: fields.mostrar_transformaciones,
        transformaciones: fields.transformaciones,
        landingStatus: fields.landing_status,
        landingTemplate: fields.landing_template,
        estadisticas: fields.estadisticas,
        testimonios: fields.testimonios,
        tagline: fields.tagline,
      });
      if (!result.ok) alert(result.error ?? "No se pudo guardar el cambio.");
      router.refresh();
      setPreviewKey((k) => k + 1);
    });
  }

  async function handlePhotoChange(slot: PhotoSlot, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingSlot(slot);
    const formData = new FormData();
    formData.set("foto", file);
    const result = await uploadTrainerPhoto(trainer.id, slot, formData);
    setUploadingSlot(null);
    if (!result.ok) {
      alert(result.error ?? "No se pudo subir la foto.");
      return;
    }
    setTrainer((t) => ({ ...t, [slot]: result.url ?? null }));
    setPreviewKey((k) => k + 1);
    router.refresh();
  }

  function updateServicio(index: number, fields: Partial<StarterServicio>) {
    const next = serviciosActuales.map((s, i) => (i === index ? { ...s, ...fields } : s));
    patch({ servicios: next });
  }

  function addServicio() {
    if (serviciosActuales.length >= 4) return;
    patch({ servicios: [...serviciosActuales, { ...DEFAULT_ROW }] });
  }

  function removeServicio(index: number) {
    const next = serviciosActuales.filter((_, i) => i !== index);
    patch({ servicios: next.length ? next : null });
  }

  const pares = trainer.transformaciones ?? [];
  const filas: TransformacionPar[] = [0, 1, 2].map((i) => pares[i] ?? { antes: "", despues: "", nombre: "" });

  function savePar(index: number, field: "antes" | "despues" | "nombre", value: string) {
    const next = [0, 1, 2].map((i) => (i === index ? { ...filas[i], [field]: value } : filas[i]));
    const cleaned = next.filter((p) => p.antes.trim() || p.despues.trim());
    patch({ transformaciones: cleaned.length ? cleaned : null });
  }

  function pickTransformPhoto(index: number, field: "antes" | "despues") {
    setTransformUploadTarget({ index, field });
    transformFileInput.current?.click();
  }

  async function handleTransformFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    const target = transformUploadTarget;
    if (!file || !target) return;
    const key = `${target.index}-${target.field}`;
    setUploadingTransform(key);
    const formData = new FormData();
    formData.set("foto", file);
    const result = await uploadTransformacionPhoto(trainer.id, formData);
    setUploadingTransform(null);
    if (!result.ok || !result.url) {
      alert(result.error ?? "No se pudo subir la foto.");
      return;
    }
    savePar(target.index, target.field, result.url);
  }

  const filasStats: Estadistica[] = [0, 1, 2, 3].map((i) => trainer.estadisticas?.[i] ?? { valor: "", etiqueta: "" });

  function saveStat(index: number, field: "valor" | "etiqueta", value: string) {
    const next = [0, 1, 2, 3].map((i) => (i === index ? { ...filasStats[i], [field]: value } : filasStats[i]));
    const cleaned = next.filter((s) => s.valor.trim() || s.etiqueta.trim());
    patch({ estadisticas: cleaned.length ? cleaned : null });
  }

  const filasTestimonios: Testimonio[] = [0, 1, 2].map(
    (i) => trainer.testimonios?.[i] ?? { texto: "", nombre: "", estrellas: 5 }
  );

  function saveTestimonio(index: number, field: "texto" | "nombre" | "estrellas", value: string | number) {
    const next = [0, 1, 2].map((i) => (i === index ? { ...filasTestimonios[i], [field]: value } : filasTestimonios[i]));
    const cleaned = next.filter((t) => t.texto.trim() || t.nombre.trim());
    patch({ testimonios: cleaned.length ? cleaned : null });
  }

  return (
    <div>
      <div className="flex items-center gap-3">
        <Link
          href="/panel-hakunna/landings"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white/60 hover:border-white/30 hover:text-white"
        >
          <ArrowLeft size={16} />
        </Link>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-lg font-bold text-white">{trainer.business_name}</h1>
            {trainer.plan && <Pill tone={planTone(trainer.plan)}>{trainer.plan.toUpperCase()}</Pill>}
          </div>
          <p className="truncate text-xs text-white/40">
            {trainer.subdominio ? `${trainer.subdominio}.hakunnafit.com` : "Sin subdominio"}
          </p>
        </div>
        {trainer.subdominio && (
          <Link
            href={`/landing/${trainer.subdominio}`}
            target="_blank"
            className="flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-2 text-xs font-semibold text-white/80 hover:border-white/30"
          >
            <ExternalLink size={13} />
            Abrir landing
          </Link>
        )}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[380px_1fr]">
        {/* Preview en vivo */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white/50">Vista previa en vivo</span>
            <button
              onClick={() => setPreviewKey((k) => k + 1)}
              className="flex items-center gap-1 text-[11px] text-white/50 hover:text-white"
            >
              <RefreshCw size={12} />
              Recargar
            </button>
          </div>
          <div className="mt-2 overflow-hidden rounded-[1.5rem] border border-white/15 bg-black" style={{ height: 700 }}>
            {trainer.subdominio ? (
              <iframe
                key={previewKey}
                src={`/landing/${trainer.subdominio}`}
                title="Vista previa"
                className="h-full w-full border-0"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-white/30">
                Sin subdominio asignado todavía.
              </div>
            )}
          </div>
        </div>

        {/* Formulario */}
        <div className="space-y-5">
          <Section title="Estado">
            <label className="block max-w-xs">
              <span className="mb-1 block text-[11px] text-white/50">Estado de la landing</span>
              <select
                value={trainer.landing_status}
                onChange={(e) => patch({ landing_status: e.target.value as TrainerRow["landing_status"] })}
                className="h-9 w-full rounded-lg border border-white/15 bg-white/5 px-2 text-xs text-white"
              >
                {LANDING_STATUSES.map((s) => (
                  <option key={s.key} value={s.key} className="bg-[#0b0f1a] text-white">
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
          </Section>

          {trainer.plan === "starter" && (
            <Section title="Plantilla" subtitle="El modelo de landing que se usa para este entrenador.">
              <div className="grid gap-3 sm:grid-cols-3">
                {STARTER_LANDING_TEMPLATES.map((t) => {
                  const selected = (trainer.landing_template ?? "impacto") === t.key;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => patch({ landing_template: t.key as StarterLandingTemplateKey })}
                      className={`relative rounded-2xl border p-1.5 text-left transition-colors ${
                        selected ? "border-hf-blue bg-hf-blue/5" : "border-white/15 bg-white/5 hover:border-white/30"
                      }`}
                    >
                      {selected && (
                        <span className="absolute right-2.5 top-2.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-hf-blue text-white">
                          <Check size={12} />
                        </span>
                      )}
                      <TemplatePreviewWide template={t.key} />
                      <p className="mt-1.5 px-0.5 text-xs font-semibold text-white">{t.label}</p>
                      <p className="px-0.5 pb-0.5 text-[10.5px] text-white/50">{t.tagline}</p>
                    </button>
                  );
                })}
              </div>
            </Section>
          )}

          <Section title="Contenido" subtitle="La frase principal del hero y la biografía de la sección 'Sobre mí'.">
            <label className="block">
              <span className="mb-1 block text-[11px] text-white/50">Frase principal (hero)</span>
              <input
                key={`tagline-${trainer.id}`}
                defaultValue={trainer.tagline ?? ""}
                placeholder="Ej: Entrena tu cuerpo, transforma tu vida."
                onBlur={(e) => patch({ tagline: e.target.value })}
                className="h-9 w-full rounded-lg border border-white/15 bg-white/5 px-2 text-xs text-white placeholder:text-white/30"
              />
            </label>
            <div className="mt-3">
              <span className="mb-1 block text-[11px] text-white/50">Biografía ("Sobre mí")</span>
              <TextArea
                defaultValue={trainer.biografia ?? ""}
                onSave={(v) => patch({ biografia: v })}
                placeholder="Cuéntale a tus visitantes quién eres y qué te hace diferente..."
              />
            </div>
          </Section>

          <Section
            title="Estadísticas"
            subtitle='Las cifras que aparecen en la landing (ej. "+8 Años de experiencia"). Mientras no cargues las tuyas, se muestran unas genéricas de ejemplo.'
          >
            <div className="grid gap-2 sm:grid-cols-2">
              {filasStats.map((stat, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    key={`stat-valor-${trainer.id}-${i}-${stat.valor}`}
                    defaultValue={stat.valor}
                    placeholder="Valor (ej. +8 Años)"
                    onBlur={(e) => saveStat(i, "valor", e.target.value)}
                    className="h-9 w-28 shrink-0 rounded-lg border border-white/15 bg-white/5 px-2 text-[11px] text-white placeholder:text-white/30"
                  />
                  <input
                    key={`stat-etiqueta-${trainer.id}-${i}-${stat.etiqueta}`}
                    defaultValue={stat.etiqueta}
                    placeholder="Etiqueta (ej. de experiencia)"
                    onBlur={(e) => saveStat(i, "etiqueta", e.target.value)}
                    className="h-9 flex-1 rounded-lg border border-white/15 bg-white/5 px-2 text-[11px] text-white placeholder:text-white/30"
                  />
                </div>
              ))}
            </div>
          </Section>

          <Section
            title="Testimonios"
            subtitle="Reemplaza estos testimonios de ejemplo por los de tus clientes reales antes de compartir tu página."
          >
            <div className="space-y-3">
              {filasTestimonios.map((t, i) => (
                <div key={i} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <textarea
                    key={`test-texto-${trainer.id}-${i}`}
                    defaultValue={t.texto}
                    placeholder="Lo que dice el cliente..."
                    rows={2}
                    onBlur={(e) => saveTestimonio(i, "texto", e.target.value)}
                    className="w-full rounded-lg border border-white/15 bg-white/5 p-2 text-[11px] text-white placeholder:text-white/30"
                  />
                  <div className="mt-2 flex gap-2">
                    <input
                      key={`test-nombre-${trainer.id}-${i}-${t.nombre}`}
                      defaultValue={t.nombre}
                      placeholder="Nombre del cliente"
                      onBlur={(e) => saveTestimonio(i, "nombre", e.target.value)}
                      className="h-9 flex-1 rounded-lg border border-white/15 bg-white/5 px-2 text-[11px] text-white placeholder:text-white/30"
                    />
                    <select
                      value={t.estrellas}
                      onChange={(e) => saveTestimonio(i, "estrellas", Number(e.target.value))}
                      className="h-9 rounded-lg border border-white/15 bg-white/5 px-2 text-[11px] text-white"
                    >
                      {[5, 4, 3, 2, 1].map((n) => (
                        <option key={n} value={n} className="bg-[#0b0f1a] text-white">
                          {n} ★
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          <Section
            title="Planes / Servicios"
            subtitle='Hasta 4. Cada uno puede ser "Directo" (precio y alcance fijo) o "Personalizado" (se cotiza por WhatsApp).'
            action={
              serviciosActuales.length < 4 ? (
                <button
                  onClick={addServicio}
                  className="flex items-center gap-1 text-[11px] font-semibold text-hf-blue hover:text-white"
                >
                  <Plus size={13} /> Agregar
                </button>
              ) : undefined
            }
          >
            {serviciosActuales.length === 0 && (
              <p className="text-[11px] text-white/30">
                Sin planes propios todavía — la landing muestra 3 genéricos por defecto. Agrega los tuyos aquí.
              </p>
            )}
            <div className="space-y-3">
              {serviciosActuales.map((s, i) => (
                <div key={i} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="flex items-center gap-2">
                    <input
                      key={`titulo-${trainer.id}-${i}`}
                      defaultValue={s.titulo}
                      placeholder="Nombre del plan"
                      onBlur={(e) => updateServicio(i, { titulo: e.target.value })}
                      className="h-9 flex-1 rounded-lg border border-white/15 bg-white/5 px-2 text-xs text-white"
                    />
                    <select
                      value={s.tipo}
                      onChange={(e) => updateServicio(i, { tipo: e.target.value as StarterServicio["tipo"] })}
                      className="h-9 rounded-lg border border-white/15 bg-white/5 px-2 text-xs text-white"
                    >
                      <option value="directo" className="bg-[#0b0f1a] text-white">Directo</option>
                      <option value="personalizado" className="bg-[#0b0f1a] text-white">Personalizado</option>
                    </select>
                    <button
                      onClick={() => removeServicio(i)}
                      aria-label="Eliminar plan"
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-red-500/20 text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                  <textarea
                    key={`desc-${trainer.id}-${i}`}
                    defaultValue={s.descripcion}
                    placeholder="Descripción breve"
                    rows={2}
                    onBlur={(e) => updateServicio(i, { descripcion: e.target.value })}
                    className="mt-2 w-full rounded-lg border border-white/15 bg-white/5 p-2 text-xs text-white placeholder:text-white/30"
                  />
                </div>
              ))}
            </div>
          </Section>

          <Section title="Contacto" subtitle='El pago en Starter es por transferencia — todo botón de la landing dirige a este WhatsApp con un mensaje distinto según la sección.'>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 flex items-center gap-1 text-[11px] text-white/50">
                  <MessageCircle size={12} /> WhatsApp
                </span>
                <input
                  key={`wa-${trainer.id}`}
                  defaultValue={trainer.whatsapp ?? ""}
                  onBlur={(e) => patch({ whatsapp: e.target.value })}
                  placeholder="+57 300 123 4567"
                  className="h-9 w-full rounded-lg border border-white/15 bg-white/5 px-2 text-xs text-white placeholder:text-white/30"
                />
              </label>
              <label className="block">
                <span className="mb-1 flex items-center gap-1 text-[11px] text-white/50">
                  <Mail size={12} /> Correo (opcional, solo para mostrar)
                </span>
                <input
                  key={`email-pub-${trainer.id}`}
                  type="email"
                  defaultValue={trainer.email_publico ?? ""}
                  onBlur={(e) => patch({ email_publico: e.target.value })}
                  placeholder="contacto@tunegocio.com"
                  className="h-9 w-full rounded-lg border border-white/15 bg-white/5 px-2 text-xs text-white placeholder:text-white/30"
                />
              </label>
            </div>
          </Section>

          <Section title="Fotos" subtitle="Foto principal (hero) + hasta 3 fotos más que se usan en distintas secciones de la landing.">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <PhotoSlotBox
                label="Principal"
                url={trainer.avatar_url}
                uploading={uploadingSlot === "avatar_url"}
                onPick={() => fileInputs.avatar_url.current?.click()}
              />
              <PhotoSlotBox
                label="Foto 2"
                url={trainer.foto2_url}
                uploading={uploadingSlot === "foto2_url"}
                onPick={() => fileInputs.foto2_url.current?.click()}
              />
              <PhotoSlotBox
                label="Foto 3"
                url={trainer.foto3_url}
                uploading={uploadingSlot === "foto3_url"}
                onPick={() => fileInputs.foto3_url.current?.click()}
              />
              <PhotoSlotBox
                label="Foto 4"
                url={trainer.foto4_url}
                uploading={uploadingSlot === "foto4_url"}
                onPick={() => fileInputs.foto4_url.current?.click()}
              />
            </div>
            {(["avatar_url", "foto2_url", "foto3_url", "foto4_url"] as PhotoSlot[]).map((slot) => (
              <input
                key={slot}
                ref={fileInputs[slot]}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => handlePhotoChange(slot, e)}
              />
            ))}
          </Section>

          <Section title="Antes y después">
            <label className="flex items-center gap-1.5 text-[11px] text-white/60">
              <input
                type="checkbox"
                checked={trainer.mostrar_transformaciones}
                onChange={(e) => patch({ mostrar_transformaciones: e.target.checked })}
                className="h-3.5 w-3.5 rounded border-white/20 bg-white/5 accent-hf-blue"
              />
              Mostrar esta sección en la landing
            </label>
            <p className="mt-1 text-[10.5px] text-white/30">
              Mientras no haya fotos reales, se muestran fotos de referencia genéricas (con nombre de ejemplo,
              editable). Sube tus propias fotos cuando el entrenador las envíe y cambia el nombre de cada persona.
            </p>
            {trainer.mostrar_transformaciones && (
              <div className="mt-3 space-y-2">
                {filas.map((pair, i) => (
                  <div key={i} className="flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] p-2">
                    <TransformPhotoBox
                      label="Antes"
                      url={pair.antes}
                      uploading={uploadingTransform === `${i}-antes`}
                      onPick={() => pickTransformPhoto(i, "antes")}
                    />
                    <TransformPhotoBox
                      label="Después"
                      url={pair.despues}
                      uploading={uploadingTransform === `${i}-despues`}
                      onPick={() => pickTransformPhoto(i, "despues")}
                    />
                    <input
                      key={`nombre-${trainer.id}-${i}-${pair.nombre}`}
                      defaultValue={pair.nombre ?? ""}
                      placeholder="Nombre y apellido (opcional)"
                      onBlur={(e) => savePar(i, "nombre", e.target.value)}
                      className="h-9 flex-1 rounded-lg border border-white/15 bg-white/5 px-2 text-[11px] text-white placeholder:text-white/30"
                    />
                  </div>
                ))}
                <input
                  ref={transformFileInput}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleTransformFileChange}
                />
              </div>
            )}
          </Section>

          <p className="text-[11px] text-white/30">
            Para cambiar el plan de HakunnaFit, precios o datos de la cuenta, hazlo desde{" "}
            <Link href={`/panel-hakunna/entrenadores?edit=${trainer.id}`} className="text-hf-blue hover:text-white">
              Entrenadores
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-white/70">{title}</p>
        {action}
      </div>
      {subtitle && <p className="mt-1 text-[10.5px] text-white/30">{subtitle}</p>}
      <div className="mt-3">{children}</div>
    </div>
  );
}

function TextArea({
  defaultValue,
  onSave,
  placeholder,
  rows = 4,
}: {
  defaultValue: string;
  onSave: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      defaultValue={defaultValue}
      placeholder={placeholder}
      rows={rows}
      onBlur={(e) => onSave(e.target.value)}
      className="w-full rounded-lg border border-white/15 bg-white/5 p-2.5 text-xs text-white placeholder:text-white/30"
    />
  );
}

function TransformPhotoBox({
  label,
  url,
  uploading,
  onPick,
}: {
  label: string;
  url: string;
  uploading: boolean;
  onPick: () => void;
}) {
  return (
    <div className="shrink-0 text-center">
      <div className="relative h-16 w-12 overflow-hidden rounded-lg border border-white/10 bg-white/5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url || "/images/NO_image.png"} alt="" className="h-full w-full object-cover" />
        <button
          type="button"
          onClick={onPick}
          disabled={uploading}
          className="absolute bottom-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white/80 hover:text-white disabled:opacity-50"
        >
          <Camera size={9} />
        </button>
      </div>
      <p className="mt-0.5 text-[8.5px] text-white/40">{uploading ? "..." : label}</p>
    </div>
  );
}

function PhotoSlotBox({
  label,
  url,
  uploading,
  onPick,
}: {
  label: string;
  url: string | null;
  uploading: boolean;
  onPick: () => void;
}) {
  return (
    <div className="text-center">
      <div className="relative aspect-square overflow-hidden rounded-xl border border-white/10 bg-white/5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url || "/images/NO_image.png"} alt="" className="h-full w-full object-cover" />
        <button
          type="button"
          onClick={onPick}
          disabled={uploading}
          className="absolute bottom-1 right-1 flex h-6 w-6 items-center justify-center rounded-full border border-white/20 bg-black/60 text-white/80 hover:text-white disabled:opacity-50"
        >
          <Camera size={11} />
        </button>
      </div>
      <p className="mt-1 text-[10px] text-white/40">{uploading ? "Subiendo..." : label}</p>
    </div>
  );
}
