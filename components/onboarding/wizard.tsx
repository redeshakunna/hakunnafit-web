"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { Camera, Check, ChevronLeft, ChevronRight, Loader2, Plus, Trash2 } from "lucide-react";
import {
  saveOnboardingStep,
  submitOnboardingWizard,
  uploadOnboardingPhoto,
  type OnboardingPhotoSlot,
  type OnboardingSessionData,
} from "@/lib/onboarding-actions";
import { checkSubdominioDisponible } from "@/lib/actions";
import { slugify } from "@/lib/slug";
import { STARTER_LANDING_TEMPLATES, DEFAULT_STARTER_TEMPLATE, TRAINER_BRANCHES, type StarterLandingTemplateKey } from "@/lib/catalog";
import { TemplatePreviewCard } from "@/components/hakunnafit/template-preview-card";
import { DEFAULT_SERVICIOS } from "@/components/hakunnafit/starter-templates/types";
import { OnboardingStatusScreen } from "./status-screen";

type Servicio = { titulo: string; descripcion: string; tipo: "directo" | "personalizado" };

// El wizard guiado de Starter — 6 pasos, con guardado al avanzar/retroceder
// (no formulario largo de una vez). Pro/Elite quedan fuera hasta que existan
// sus pasos adicionales (ver app/onboarding/[token]/page.tsx).
const STEPS = [
  { key: "personal", label: "Información personal" },
  { key: "profesional", label: "Información profesional" },
  { key: "branding", label: "Branding" },
  { key: "servicios", label: "Servicios" },
  { key: "fotos", label: "Fotografías" },
  { key: "confirmacion", label: "Confirmación" },
] as const;

type StepKey = (typeof STEPS)[number]["key"];

export function OnboardingWizard({ token, initialData }: { token: string; initialData: OnboardingSessionData }) {
  const startIndex = Math.max(
    0,
    STEPS.findIndex((s) => s.key === initialData.currentStep)
  );
  const [stepIndex, setStepIndex] = useState(startIndex);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const [form, setForm] = useState({
    businessName: initialData.businessName || "",
    whatsapp: initialData.whatsapp || "",
    ciudad: initialData.ciudad || "",
    emailPublico: initialData.emailPublico || "",
    especialidad: initialData.especialidad || "",
    biografia: initialData.biografia || "",
    instagram: initialData.instagram || "",
    facebook: initialData.facebook || "",
    subdominio: initialData.subdominio || "",
    landingTemplate: (initialData.landingTemplate as StarterLandingTemplateKey) || DEFAULT_STARTER_TEMPLATE,
    tagline: initialData.tagline || "",
    servicios: (initialData.servicios?.length ? initialData.servicios : DEFAULT_SERVICIOS) as Servicio[],
  });

  const [photos, setPhotos] = useState<Record<OnboardingPhotoSlot, string | null>>({
    avatar_url: initialData.avatarUrl,
    foto2_url: initialData.foto2Url,
    foto3_url: initialData.foto3Url,
    foto4_url: initialData.foto4Url,
  });

  const step = STEPS[stepIndex];

  function payloadForStep(key: StepKey) {
    switch (key) {
      case "personal":
        return {
          businessName: form.businessName,
          whatsapp: form.whatsapp,
          ciudad: form.ciudad,
          emailPublico: form.emailPublico,
        };
      case "profesional":
        return {
          especialidad: form.especialidad,
          biografia: form.biografia,
          instagram: form.instagram,
          facebook: form.facebook,
        };
      case "branding":
        return { subdominio: form.subdominio, landingTemplate: form.landingTemplate, tagline: form.tagline };
      case "servicios":
        return { servicios: form.servicios };
      default:
        return {};
    }
  }

  function validateStep(key: StepKey): string | null {
    if (key === "personal") {
      if (!form.businessName.trim()) return "Escribe el nombre que quieres mostrar en tu página.";
      if (!form.whatsapp.trim()) return "Tu WhatsApp es obligatorio.";
      if (!form.ciudad.trim()) return "Tu ciudad es obligatoria.";
    }
    if (key === "branding" && !form.subdominio.trim()) {
      return "Elige el nombre de tu página.";
    }
    return null;
  }

  async function goTo(targetIndex: number) {
    setError(null);
    const validation = validateStep(step.key);
    if (validation && targetIndex > stepIndex) {
      setError(validation);
      return;
    }
    const clamped = Math.max(0, Math.min(targetIndex, STEPS.length - 1));
    setSaving(true);
    const result = await saveOnboardingStep({ token, step: STEPS[clamped].key, ...payloadForStep(step.key) });
    setSaving(false);
    if (!result.ok) {
      setError(result.error ?? "No se pudo guardar. Intenta de nuevo.");
      return;
    }
    setStepIndex(clamped);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleFinish() {
    setError(null);
    setSaving(true);
    const saveResult = await saveOnboardingStep({ token, step: "confirmacion", ...payloadForStep("servicios") });
    if (!saveResult.ok) {
      setSaving(false);
      setError(saveResult.error ?? "No se pudo guardar. Intenta de nuevo.");
      return;
    }
    const result = await submitOnboardingWizard(token);
    setSaving(false);
    if (!result.ok) {
      setError(result.error ?? "No se pudo enviar. Intenta de nuevo.");
      return;
    }
    setSubmitted(true);
  }

  async function handlePhotoUpload(slot: OnboardingPhotoSlot, file: File) {
    const fd = new FormData();
    fd.set("foto", file);
    const result = await uploadOnboardingPhoto(token, slot, fd);
    if (!result.ok) {
      alert(result.error ?? "No se pudo subir la foto.");
      return;
    }
    setPhotos((p) => ({ ...p, [slot]: result.url ?? null }));
  }

  if (submitted) {
    return (
      <OnboardingStatusScreen
        tone="good"
        eyebrow="Información recibida"
        title={`Gracias, ${form.businessName || initialData.businessName}`}
        message="Ya tenemos toda tu información. Nuestro equipo la está revisando — te avisamos por correo en cuanto tu espacio esté listo."
      />
    );
  }

  return (
    <main className="min-h-screen w-full bg-hf-black px-4 py-10 sm:py-16">
      <div className="mx-auto max-w-2xl">
        <div className="flex flex-col items-center text-center">
          <div className="relative h-14 w-14">
            <Image src="/images/LogoOriginal_Transparente.png" alt="HakunnaFit" fill className="object-contain" priority />
          </div>
          <h1 className="mt-3 font-[family-name:var(--font-hf-heading)] text-xl font-bold text-white sm:text-2xl">
            Arma tu espacio en Hakunna Fit
          </h1>
          <p className="mt-1.5 max-w-md text-sm text-white/55">
            Completa cada paso con calma — se guarda automáticamente, puedes cerrar y volver cuando quieras.
          </p>
        </div>

        <ProgressBar currentIndex={stepIndex} onJump={(i) => i < stepIndex && goTo(i)} />

        {initialData.revisionNotas && stepIndex === 0 && (
          <div className="mt-6 rounded-xl border border-amber-500/25 bg-amber-500/5 p-4">
            <p className="text-xs font-semibold text-amber-400">Nando te pidió un ajuste</p>
            <p className="mt-1 text-sm text-white/70">{initialData.revisionNotas}</p>
          </div>
        )}

        <div className="mt-6 rounded-[2rem] border border-white/10 bg-[#0b0f1a] p-6 sm:p-9">
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-hf-blue">
            Paso {stepIndex + 1} de {STEPS.length}
          </p>
          <h2 className="mt-1.5 font-[family-name:var(--font-hf-heading)] text-lg font-bold text-white sm:text-xl">
            {step.label}
          </h2>

          <div className="mt-6">
            {step.key === "personal" && <StepPersonal form={form} setForm={setForm} />}
            {step.key === "profesional" && <StepProfesional form={form} setForm={setForm} />}
            {step.key === "branding" && <StepBranding form={form} setForm={setForm} />}
            {step.key === "servicios" && <StepServicios form={form} setForm={setForm} />}
            {step.key === "fotos" && <StepFotos photos={photos} onUpload={handlePhotoUpload} />}
            {step.key === "confirmacion" && <StepConfirmacion form={form} photos={photos} />}
          </div>

          {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

          <div className="mt-8 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => goTo(stepIndex - 1)}
              disabled={stepIndex === 0 || saving}
              className="flex items-center gap-1.5 rounded-full border border-white/15 px-4 py-2.5 text-xs font-semibold text-white/70 hover:border-white/30 hover:text-white disabled:opacity-30"
            >
              <ChevronLeft size={14} /> Atrás
            </button>

            {step.key === "confirmacion" ? (
              <button
                type="button"
                onClick={handleFinish}
                disabled={saving}
                className="flex items-center gap-1.5 rounded-full px-6 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-[1.02] disabled:opacity-60"
                style={{ background: "linear-gradient(90deg,#00C8FF,#6D2EFF,#FF2DB8)" }}
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                Finalizar onboarding
              </button>
            ) : (
              <button
                type="button"
                onClick={() => goTo(stepIndex + 1)}
                disabled={saving}
                className="flex items-center gap-1.5 rounded-full px-6 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-[1.02] disabled:opacity-60"
                style={{ background: "linear-gradient(90deg,#00C8FF,#6D2EFF,#FF2DB8)" }}
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : null}
                Siguiente <ChevronRight size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function ProgressBar({ currentIndex, onJump }: { currentIndex: number; onJump: (index: number) => void }) {
  return (
    <div className="mt-8 flex items-center gap-1 overflow-x-auto pb-1">
      {STEPS.map((s, i) => (
        <div key={s.key} className="flex flex-1 items-center gap-1 last:flex-none">
          <button
            type="button"
            onClick={() => onJump(i)}
            disabled={i > currentIndex}
            aria-label={s.label}
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold transition-colors ${
              i < currentIndex
                ? "bg-emerald-500 text-white"
                : i === currentIndex
                  ? "text-white"
                  : "border border-white/15 text-white/30"
            }`}
            style={i === currentIndex ? { background: "linear-gradient(90deg,#00C8FF,#6D2EFF,#FF2DB8)" } : undefined}
          >
            {i < currentIndex ? <Check size={12} /> : i + 1}
          </button>
          {i < STEPS.length - 1 && (
            <span className={`h-px flex-1 ${i < currentIndex ? "bg-emerald-500" : "bg-white/10"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-white/70">
        {label} {required && <span className="text-hf-fuchsia">*</span>}
      </span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-white/15 bg-white/5 px-4 text-sm text-white placeholder:text-white/30 focus:border-hf-blue focus:outline-none"
      />
    </label>
  );
}

interface FormState {
  businessName: string;
  whatsapp: string;
  ciudad: string;
  emailPublico: string;
  especialidad: string;
  biografia: string;
  instagram: string;
  facebook: string;
  subdominio: string;
  landingTemplate: StarterLandingTemplateKey;
  tagline: string;
  servicios: Servicio[];
}

function StepPersonal({
  form,
  setForm,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <Field
          label="Nombre en tu página"
          required
          value={form.businessName}
          onChange={(v) => setForm((f) => ({ ...f, businessName: v }))}
          placeholder="Ej: Rivera Training"
        />
      </div>
      <Field label="WhatsApp" required value={form.whatsapp} onChange={(v) => setForm((f) => ({ ...f, whatsapp: v }))} placeholder="+57 300 123 4567" />
      <Field label="Ciudad" required value={form.ciudad} onChange={(v) => setForm((f) => ({ ...f, ciudad: v }))} placeholder="Ej: Medellín, Colombia" />
      <div className="sm:col-span-2">
        <Field
          label="Correo público (opcional, se muestra en tu página)"
          value={form.emailPublico}
          onChange={(v) => setForm((f) => ({ ...f, emailPublico: v }))}
          placeholder="contacto@tunegocio.com"
        />
      </div>
    </div>
  );
}

function StepProfesional({
  form,
  setForm,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
}) {
  return (
    <div className="grid gap-4">
      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold text-white/70">Rama de entrenamiento</span>
        <select
          value={form.especialidad}
          onChange={(e) => setForm((f) => ({ ...f, especialidad: e.target.value }))}
          className="h-11 w-full rounded-xl border border-white/15 bg-white/5 px-4 text-sm text-white focus:border-hf-blue focus:outline-none"
        >
          <option value="" className="bg-hf-black text-white">Selecciona una opción</option>
          {TRAINER_BRANCHES.map((b) => (
            <option key={b.key} value={b.key} className="bg-hf-black text-white">
              {b.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold text-white/70">Biografía / presentación</span>
        <textarea
          value={form.biografia}
          onChange={(e) => setForm((f) => ({ ...f, biografia: e.target.value }))}
          rows={4}
          placeholder="Cuéntale a tus visitantes quién eres y qué te hace diferente..."
          className="w-full rounded-xl border border-white/15 bg-white/5 p-4 text-sm text-white placeholder:text-white/30 focus:border-hf-blue focus:outline-none"
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Instagram" value={form.instagram} onChange={(v) => setForm((f) => ({ ...f, instagram: v }))} placeholder="@usuario" />
        <Field label="Facebook" value={form.facebook} onChange={(v) => setForm((f) => ({ ...f, facebook: v }))} placeholder="/usuario" />
      </div>
    </div>
  );
}

function StepBranding({
  form,
  setForm,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
}) {
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  function onSubdominioChange(v: string) {
    setForm((f) => ({ ...f, subdominio: v }));
    if (debounce.current) clearTimeout(debounce.current);
    if (!v.trim()) {
      setAvailable(null);
      return;
    }
    setChecking(true);
    debounce.current = setTimeout(() => {
      checkSubdominioDisponible(v)
        .then((r) => setAvailable(r.available && !r.reserved))
        .finally(() => setChecking(false));
    }, 500);
  }

  return (
    <div className="grid gap-5">
      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold text-white/70">
          Nombre de tu página <span className="text-hf-fuchsia">*</span>
        </span>
        <input
          value={form.subdominio}
          onChange={(e) => onSubdominioChange(e.target.value)}
          placeholder="Ej: riveratraining"
          className="h-11 w-full rounded-xl border border-white/15 bg-white/5 px-4 text-sm text-white placeholder:text-white/30 focus:border-hf-blue focus:outline-none"
        />
        <span className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] text-white/40">
          <span>
            Tu página se vería así:{" "}
            <span className="font-semibold text-white/70">
              {(form.subdominio.trim() ? slugify(form.subdominio) : "tu-negocio") + ".hakunnafit.com"}
            </span>
          </span>
          {form.subdominio.trim() &&
            (checking ? (
              <span>· comprobando...</span>
            ) : available === false ? (
              <span className="text-red-400">· ya está en uso, prueba otro</span>
            ) : available === true ? (
              <span className="text-emerald-400">· disponible</span>
            ) : null)}
        </span>
      </label>

      <label className="block">
        <span className="mb-1.5 block text-xs font-semibold text-white/70">Frase principal de tu página (opcional)</span>
        <input
          value={form.tagline}
          onChange={(e) => setForm((f) => ({ ...f, tagline: e.target.value }))}
          placeholder="Ej: Entrena tu cuerpo, transforma tu vida."
          className="h-11 w-full rounded-xl border border-white/15 bg-white/5 px-4 text-sm text-white placeholder:text-white/30 focus:border-hf-blue focus:outline-none"
        />
      </label>

      <div>
        <span className="mb-2 block text-xs font-semibold text-white/70">Elige el estilo de tu página</span>
        <div className="grid grid-cols-3 gap-3">
          {STARTER_LANDING_TEMPLATES.map((t) => (
            <TemplatePreviewCard
              key={t.key}
              template={t.key}
              label={t.label}
              tagline={t.tagline}
              selected={form.landingTemplate === t.key}
              onSelect={() => setForm((f) => ({ ...f, landingTemplate: t.key }))}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function StepServicios({
  form,
  setForm,
}: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
}) {
  function update(i: number, patch: Partial<Servicio>) {
    setForm((f) => ({ ...f, servicios: f.servicios.map((s, idx) => (idx === i ? { ...s, ...patch } : s)) }));
  }
  function add() {
    setForm((f) => ({ ...f, servicios: [...f.servicios, { titulo: "", descripcion: "", tipo: "directo" }] }));
  }
  function remove(i: number) {
    setForm((f) => ({ ...f, servicios: f.servicios.filter((_, idx) => idx !== i) }));
  }

  return (
    <div className="grid gap-3">
      <p className="text-xs text-white/50">
        Estos son los servicios o planes que le vas a ofrecer a tus clientes en tu página. Puedes editarlos después.
      </p>
      {form.servicios.map((s, i) => (
        <div key={i} className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
          <div className="flex items-start gap-2">
            <div className="flex-1 space-y-2">
              <input
                value={s.titulo}
                onChange={(e) => update(i, { titulo: e.target.value })}
                placeholder="Título (ej: Entrenamiento Personal)"
                className="h-9 w-full rounded-lg border border-white/15 bg-white/5 px-3 text-xs text-white placeholder:text-white/30"
              />
              <textarea
                value={s.descripcion}
                onChange={(e) => update(i, { descripcion: e.target.value })}
                rows={2}
                placeholder="Descripción corta"
                className="w-full rounded-lg border border-white/15 bg-white/5 p-2 text-xs text-white placeholder:text-white/30"
              />
              <select
                value={s.tipo}
                onChange={(e) => update(i, { tipo: e.target.value as Servicio["tipo"] })}
                className="h-8 rounded-lg border border-white/15 bg-white/5 px-2 text-[11px] text-white"
              >
                <option value="directo" className="bg-hf-black text-white">Precio directo</option>
                <option value="personalizado" className="bg-hf-black text-white">Personalizado (cotiza por WhatsApp)</option>
              </select>
            </div>
            <button
              type="button"
              onClick={() => remove(i)}
              disabled={form.servicios.length <= 1}
              aria-label="Eliminar"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/15 text-white/40 hover:border-red-500/40 hover:text-red-400 disabled:opacity-30"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        className="flex items-center justify-center gap-1.5 rounded-full border border-dashed border-white/20 py-2 text-xs font-semibold text-white/60 hover:border-white/40 hover:text-white"
      >
        <Plus size={13} /> Agregar servicio
      </button>
    </div>
  );
}

const PHOTO_SLOTS: { slot: OnboardingPhotoSlot; label: string; hint: string }[] = [
  { slot: "avatar_url", label: "Foto principal", hint: "La que se ve primero en tu página" },
  { slot: "foto2_url", label: "Foto “Sobre mí”", hint: "Puede ser la misma u otra" },
  { slot: "foto3_url", label: "Foto adicional 1", hint: "Opcional" },
  { slot: "foto4_url", label: "Foto adicional 2", hint: "Opcional" },
];

function StepFotos({
  photos,
  onUpload,
}: {
  photos: Record<OnboardingPhotoSlot, string | null>;
  onUpload: (slot: OnboardingPhotoSlot, file: File) => Promise<void>;
}) {
  const [uploading, setUploading] = useState<OnboardingPhotoSlot | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  async function handleChange(slot: OnboardingPhotoSlot, file: File | undefined) {
    if (!file) return;
    setUploading(slot);
    await onUpload(slot, file);
    setUploading(null);
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {PHOTO_SLOTS.map(({ slot, label, hint }) => (
        <div key={slot} className="flex flex-col items-center gap-2">
          <div className="relative h-24 w-24 overflow-hidden rounded-2xl border border-white/15 bg-white/5">
            {photos[slot] ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photos[slot] ?? undefined} alt={label} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-white/20">
                <Camera size={20} />
              </div>
            )}
            <button
              type="button"
              onClick={() => inputRefs.current[slot]?.click()}
              disabled={uploading === slot}
              className="absolute bottom-1 right-1 flex h-6 w-6 items-center justify-center rounded-full border border-white/20 bg-[#0b0f1a] text-white/70 hover:text-white disabled:opacity-50"
            >
              {uploading === slot ? <Loader2 size={11} className="animate-spin" /> : <Camera size={11} />}
            </button>
            <input
              ref={(el) => {
                inputRefs.current[slot] = el;
              }}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                handleChange(slot, file);
              }}
            />
          </div>
          <p className="text-center text-[11px] font-semibold text-white/70">{label}</p>
          <p className="text-center text-[10px] text-white/35">{hint}</p>
        </div>
      ))}
    </div>
  );
}

function StepConfirmacion({
  form,
  photos,
}: {
  form: FormState;
  photos: Record<OnboardingPhotoSlot, string | null>;
}) {
  const templateLabel = STARTER_LANDING_TEMPLATES.find((t) => t.key === form.landingTemplate)?.label ?? form.landingTemplate;
  return (
    <div className="grid gap-4">
      <p className="text-sm text-white/60">
        Revisa que todo esté bien. Al finalizar, tu información queda lista para que Nando la revise y active tu
        espacio — no se publica nada todavía en automático.
      </p>
      <div className="grid gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-4 text-xs">
        <Row label="Nombre en tu página" value={form.businessName || "—"} />
        <Row label="Ciudad" value={form.ciudad || "—"} />
        <Row label="WhatsApp" value={form.whatsapp || "—"} />
        <Row label="Dirección de tu página" value={form.subdominio ? `${slugify(form.subdominio)}.hakunnafit.com` : "—"} />
        <Row label="Estilo elegido" value={String(templateLabel)} />
        <Row label="Servicios cargados" value={String(form.servicios.filter((s) => s.titulo.trim()).length)} />
        <Row label="Fotos cargadas" value={String(Object.values(photos).filter(Boolean).length) + " de 4"} />
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-white/5 py-1.5 last:border-0">
      <span className="text-white/45">{label}</span>
      <span className="text-right text-white/85">{value}</span>
    </div>
  );
}
