"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { Upload } from "lucide-react";
import { updateOwnBrand, updateOwnColors, uploadOwnPhoto, type OwnPhotoSlot } from "@/lib/trainer-actions";
import type { TrainerRow } from "@/lib/admin-actions";
import { useLivePreview } from "./live-preview-context";
import { TRAINER_BRANCHES, planLabel } from "@/lib/catalog";

const SUGGESTED_PALETTES: { label: string; primario: string; secundario: string; terciario: string }[] = [
  { label: "Verde Lima", primario: "#22C55E", secundario: "#15803D", terciario: "#86EFAC" },
  { label: "Azul Cian", primario: "#00C8FF", secundario: "#0072B8", terciario: "#7DE8FF" },
  { label: "Púrpura", primario: "#6D2EFF", secundario: "#4A1FB0", terciario: "#C9A8FF" },
  { label: "Fucsia", primario: "#FF2DB8", secundario: "#B0107D", terciario: "#FFB3E6" },
  { label: "Naranja", primario: "#FF8A00", secundario: "#C25E00", terciario: "#FFC98A" },
  { label: "Rojo Fuego", primario: "#EF4444", secundario: "#B91C1C", terciario: "#FCA5A5" },
];

/**
 * Mi Marca — todo lo que hace que la landing "se vea tuya": logo, foto de
 * perfil, banner, colores, contacto/redes, bio, especialidad y frase
 * principal. A diferencia de Mi Sitio Web, aquí cada campo se guarda al
 * instante (como los ajustes de marca de Shopify) — no hay concepto de
 * borrador porque no son decisiones estructurales de la página.
 */
export function TrainerBrandForm({ trainer }: { trainer: TrainerRow }) {
  const { patchDraft } = useLivePreview();

  // --- Fotos (logo / avatar / banner) ---
  const [photoUrls, setPhotoUrls] = useState<Record<"logo_url" | "avatar_url" | "banner_url", string | null>>({
    logo_url: trainer.logo_url,
    avatar_url: trainer.avatar_url,
    banner_url: trainer.banner_url,
  });
  const [photoErrors, setPhotoErrors] = useState<Partial<Record<OwnPhotoSlot, string>>>({});

  const PHOTO_DRAFT_KEY = { logo_url: "logoUrl", avatar_url: "avatarUrl", banner_url: "bannerUrl" } as const;

  function onPhotoUploaded(slot: "logo_url" | "avatar_url" | "banner_url", url: string) {
    setPhotoUrls((prev) => ({ ...prev, [slot]: url }));
    patchDraft({ [PHOTO_DRAFT_KEY[slot]]: url });
  }

  // --- Colores ---
  const [colorPrimario, setColorPrimarioState] = useState(trainer.color_primario || "#22C55E");
  const [colorSecundario, setColorSecundarioState] = useState(trainer.color_secundario || "#15803D");
  const [colorTerciario, setColorTerciarioState] = useState(trainer.color_terciario || "#86EFAC");
  const [colorStatus, setColorStatus] = useState<"idle" | "ok" | "error">("idle");
  const [colorError, setColorError] = useState<string | null>(null);
  const [isColorPending, startColorTransition] = useTransition();

  function setColorPrimario(v: string) {
    setColorPrimarioState(v);
    patchDraft({ colorPrimario: v });
  }
  function setColorSecundario(v: string) {
    setColorSecundarioState(v);
    patchDraft({ colorSecundario: v });
  }
  function setColorTerciario(v: string) {
    setColorTerciarioState(v);
    patchDraft({ colorTerciario: v });
  }
  function applyPalette(p: (typeof SUGGESTED_PALETTES)[number]) {
    setColorPrimario(p.primario);
    setColorSecundario(p.secundario);
    setColorTerciario(p.terciario);
    setColorStatus("idle");
  }
  function saveColors() {
    setColorStatus("idle");
    setColorError(null);
    startColorTransition(async () => {
      const res = await updateOwnColors({ colorPrimario, colorSecundario, colorTerciario });
      if (!res.ok) {
        setColorStatus("error");
        setColorError(res.error || "No se pudieron guardar los colores.");
        return;
      }
      setColorStatus("ok");
    });
  }

  // --- Identidad (tagline/bio/especialidad/contacto/redes) ---
  const [tagline, setTaglineState] = useState(trainer.tagline || "");
  const [biografia, setBiografiaState] = useState(trainer.biografia || "");
  const [especialidad, setEspecialidadState] = useState(trainer.especialidad || "");
  const [whatsapp, setWhatsappState] = useState(trainer.whatsapp || "");
  const [ciudad, setCiudadState] = useState(trainer.ciudad || "");
  const [emailPublico, setEmailPublicoState] = useState(trainer.email_publico || "");
  const [instagram, setInstagramState] = useState(trainer.instagram || "");
  const [facebook, setFacebookState] = useState(trainer.facebook || "");
  const [dominioPropio, setDominioPropio] = useState(trainer.dominio_propio || "");
  const [brandStatus, setBrandStatus] = useState<"idle" | "ok" | "error">("idle");
  const [brandError, setBrandError] = useState<string | null>(null);
  const [isBrandPending, startBrandTransition] = useTransition();

  function setTagline(v: string) {
    setTaglineState(v);
    patchDraft({ tagline: v });
  }
  function setBiografia(v: string) {
    setBiografiaState(v);
    patchDraft({ biografia: v });
  }
  function setEspecialidad(v: string) {
    setEspecialidadState(v);
    patchDraft({ especialidad: v || null });
  }
  function setWhatsapp(v: string) {
    setWhatsappState(v);
    patchDraft({ whatsapp: v });
  }
  function setEmailPublico(v: string) {
    setEmailPublicoState(v);
    patchDraft({ emailPublico: v });
  }
  function setInstagram(v: string) {
    setInstagramState(v);
    patchDraft({ instagram: v });
  }
  function setFacebook(v: string) {
    setFacebookState(v);
    patchDraft({ facebook: v });
  }
  function setCiudad(v: string) {
    setCiudadState(v);
    patchDraft({ ciudad: v });
  }

  function saveBrand() {
    setBrandStatus("idle");
    setBrandError(null);
    startBrandTransition(async () => {
      const res = await updateOwnBrand({
        tagline,
        biografia,
        especialidad,
        whatsapp,
        ciudad,
        emailPublico,
        instagram,
        facebook,
        dominioPropio: trainer.plan === "elite" ? dominioPropio : undefined,
      });
      if (!res.ok) {
        setBrandStatus("error");
        setBrandError(res.error || "No se pudo guardar.");
        return;
      }
      setBrandStatus("ok");
    });
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-xl font-bold text-white">Mi Marca</h1>
      <p className="mt-1 text-sm text-white/50">
        Todo lo que hace que tu landing se vea tuya. Cada cambio se guarda al instante.
      </p>

      {/* Plan-específico */}
      <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-white/40">Plan {planLabel(trainer.plan)}</p>
        {trainer.plan === "starter" && (
          <p className="mt-1.5 text-sm text-white/60">
            Puedes elegir entre los 3 modelos de landing desde la vista previa, a la derecha.
          </p>
        )}
        {trainer.plan === "pro" && (
          <p className="mt-1.5 text-sm text-white/60">
            Tu landing la personaliza Nando a mano según tu marca — desde aquí controlas los datos que se usan
            (colores, fotos, textos). En Mi Sitio Web puedes activar/desactivar secciones.
          </p>
        )}
        {trainer.plan === "elite" && (
          <p className="mt-1.5 text-sm text-white/60">
            Branding avanzado: además de lo anterior, puedes usar tu propio dominio.
          </p>
        )}
      </div>

      {/* Fotos */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <PhotoSlotCard
          slot="logo_url"
          label="Logo"
          hint="Si no subes uno, se muestra tu nombre con un estilo acorde al diseño."
          url={photoUrls.logo_url}
          error={photoErrors.logo_url}
          onUploaded={(url) => onPhotoUploaded("logo_url", url)}
          onError={(err) => setPhotoErrors((prev) => ({ ...prev, logo_url: err }))}
        />
        <PhotoSlotCard
          slot="avatar_url"
          label="Foto de perfil"
          url={photoUrls.avatar_url}
          error={photoErrors.avatar_url}
          onUploaded={(url) => onPhotoUploaded("avatar_url", url)}
          onError={(err) => setPhotoErrors((prev) => ({ ...prev, avatar_url: err }))}
        />
        <PhotoSlotCard
          slot="banner_url"
          label="Banner"
          hint="Franja ancha arriba de tu landing (Impacto y Claro)."
          url={photoUrls.banner_url}
          error={photoErrors.banner_url}
          onUploaded={(url) => onPhotoUploaded("banner_url", url)}
          onError={(err) => setPhotoErrors((prev) => ({ ...prev, banner_url: err }))}
        />
      </div>

      {/* Colores */}
      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <p className="mb-4 text-sm font-semibold text-white">Colores</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {SUGGESTED_PALETTES.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => applyPalette(p)}
              className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-left hover:border-white/25"
            >
              <div className="flex gap-1.5">
                <span className="h-6 w-6 rounded-full" style={{ backgroundColor: p.primario }} />
                <span className="h-6 w-6 rounded-full" style={{ backgroundColor: p.secundario }} />
                <span className="h-6 w-6 rounded-full" style={{ backgroundColor: p.terciario }} />
              </div>
              <p className="mt-2 text-xs font-semibold text-white">{p.label}</p>
            </button>
          ))}
        </div>
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <ColorField label="Primario" value={colorPrimario} onChange={setColorPrimario} />
          <ColorField label="Secundario" value={colorSecundario} onChange={setColorSecundario} />
          <ColorField label="Terciario" value={colorTerciario} onChange={setColorTerciario} />
        </div>
        {colorStatus === "error" && <p className="mt-3 text-sm text-red-400">{colorError}</p>}
        {colorStatus === "ok" && <p className="mt-3 text-sm text-emerald-400">Colores guardados.</p>}
        <button
          type="button"
          disabled={isColorPending}
          onClick={saveColors}
          className="mt-4 rounded-full px-6 py-2.5 text-sm font-semibold text-black disabled:opacity-50"
          style={{ background: "linear-gradient(90deg,#00C8FF,#6D2EFF)" }}
        >
          {isColorPending ? "Guardando..." : "Guardar colores"}
        </button>
      </div>

      {/* Identidad */}
      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <p className="mb-4 text-sm font-semibold text-white">Identidad</p>
        <div className="flex flex-col gap-4">
          <Field label="Frase principal" value={tagline} onChange={setTagline} placeholder="Ej: Entrena tu cuerpo, transforma tu vida." />
          <Field label="Biografía" value={biografia} onChange={setBiografia} textarea />
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-white/70">Especialidad</span>
            <select
              value={especialidad}
              onChange={(e) => setEspecialidad(e.target.value)}
              className="h-10 w-full rounded-lg border border-white/15 bg-white/5 px-3 text-sm text-white focus:border-hf-blue focus:outline-none"
            >
              <option value="">Sin especificar</option>
              {TRAINER_BRANCHES.map((b) => (
                <option key={b.key} value={b.key}>
                  {b.label}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-4">
            <Field label="WhatsApp" value={whatsapp} onChange={setWhatsapp} />
            <Field label="Ciudad" value={ciudad} onChange={setCiudad} />
          </div>
          <Field label="Correo público" value={emailPublico} onChange={setEmailPublico} />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Instagram" value={instagram} onChange={setInstagram} placeholder="@tuusuario" />
            <Field label="Facebook" value={facebook} onChange={setFacebook} />
          </div>
          {trainer.plan === "elite" && (
            <Field
              label="Dominio propio"
              value={dominioPropio}
              onChange={setDominioPropio}
              placeholder="www.tudominio.com"
            />
          )}
        </div>

        {brandStatus === "error" && <p className="mt-4 text-sm text-red-400">{brandError}</p>}
        {brandStatus === "ok" && <p className="mt-4 text-sm text-emerald-400">Guardado.</p>}
        <button
          type="button"
          disabled={isBrandPending}
          onClick={saveBrand}
          className="mt-5 rounded-full px-6 py-2.5 text-sm font-semibold text-black disabled:opacity-50"
          style={{ background: "linear-gradient(90deg,#00C8FF,#6D2EFF)" }}
        >
          {isBrandPending ? "Guardando..." : "Guardar identidad"}
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  textarea,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  textarea?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-white/70">{label}</span>
      {textarea ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={4}
          className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white focus:border-hf-blue focus:outline-none"
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-10 w-full rounded-lg border border-white/15 bg-white/5 px-3 text-sm text-white focus:border-hf-blue focus:outline-none"
        />
      )}
    </label>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-white/70">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-12 cursor-pointer rounded-lg border border-white/15 bg-white/5"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-full rounded-lg border border-white/15 bg-white/5 px-3 text-sm text-white focus:border-hf-blue focus:outline-none"
        />
      </div>
    </label>
  );
}

function PhotoSlotCard({
  slot,
  label,
  hint,
  url,
  error,
  onUploaded,
  onError,
}: {
  slot: OwnPhotoSlot;
  label: string;
  hint?: string;
  url: string | null;
  error?: string;
  onUploaded: (url: string) => void;
  onError: (err: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();

  function onPick(file: File) {
    onError("");
    const formData = new FormData();
    formData.set("foto", file);
    startTransition(async () => {
      const res = await uploadOwnPhoto(slot, formData);
      if (!res.ok || !res.url) {
        onError(res.error || "No se pudo subir la imagen.");
        return;
      }
      onUploaded(res.url);
    });
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-sm font-semibold text-white">{label}</p>
      {hint && <p className="mt-1 text-[11px] text-white/40">{hint}</p>}

      <div className="relative mt-3 aspect-video overflow-hidden rounded-xl bg-white/5">
        {url ? (
          <Image src={url} alt={label} fill className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-white/30">Sin imagen</div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onPick(file);
        }}
      />

      <button
        type="button"
        disabled={isPending}
        onClick={() => fileInputRef.current?.click()}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-full border border-white/15 px-3 py-2 text-xs font-semibold text-white/70 hover:border-white/30 disabled:opacity-50"
      >
        <Upload size={12} /> {isPending ? "Subiendo..." : url ? "Cambiar" : "Subir"}
      </button>

      {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
    </div>
  );
}
