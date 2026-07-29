"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { Plus, Trash2, Upload, ExternalLink, Save, UploadCloud } from "lucide-react";
import {
  saveOwnSitioWebDraft,
  publishOwnSitioWeb,
  uploadOwnPhoto,
  uploadOwnTransformacionPhoto,
  type SitioWebDraftShape,
} from "@/lib/trainer-actions";
import type { TrainerRow, PlanOfrecido } from "@/lib/admin-actions";
import type { TransformacionPar } from "@/lib/admin-actions";
import { useLivePreview } from "./live-preview-context";
import { TrainerPlanesManager } from "./trainer-planes-manager";

type Servicio = { titulo: string; descripcion: string; tipo: "directo" | "personalizado" };
type Faq = { pregunta: string; respuesta: string };
type Secciones = { servicios: boolean; planes: boolean; transformaciones: boolean; galeria: boolean; faq: boolean };

const DEFAULT_SECCIONES: Secciones = { servicios: true, planes: true, transformaciones: true, galeria: true, faq: true };

function draftFromTrainer(trainer: TrainerRow): SitioWebDraftShape {
  // Si hay un borrador guardado, retomamos exactamente ahí; si no, partimos
  // de lo que ya está publicado.
  const saved = trainer.landing_draft as Partial<SitioWebDraftShape> | null;
  return {
    servicios: saved?.servicios ?? (trainer.servicios as Servicio[] | null) ?? [],
    seccionesActivas: { ...DEFAULT_SECCIONES, ...(saved?.seccionesActivas ?? trainer.secciones_activas) },
    faqs: saved?.faqs ?? trainer.preguntas_frecuentes ?? [],
    mostrarTransformaciones: saved?.mostrarTransformaciones ?? trainer.mostrar_transformaciones,
    transformaciones: saved?.transformaciones ?? (trainer.transformaciones as TransformacionPar[] | null),
  };
}

/**
 * Mi Sitio Web — el Centro de Publicación: qué secciones se ven, los
 * servicios, transformaciones y preguntas frecuentes. A diferencia de Mi
 * Marca, aquí los cambios NO se guardan solos — el entrenador puede dejar
 * un borrador a medias (Guardar borrador, vive en trainers.landing_draft) y
 * solo se reflejan en su landing pública al presionar Publicar cambios.
 */
export function TrainerSitioWebForm({ trainer }: { trainer: TrainerRow }) {
  const { patchDraft } = useLivePreview();
  const initial = useRef(draftFromTrainer(trainer)).current;

  const [servicios, setServicios] = useState<Servicio[]>(initial.servicios);
  const [seccionesActivas, setSeccionesActivas] = useState<Secciones>(initial.seccionesActivas);
  const [faqs, setFaqs] = useState<Faq[]>(initial.faqs);
  const [mostrarTransformaciones, setMostrarTransformaciones] = useState(initial.mostrarTransformaciones);
  const [transformaciones, setTransformaciones] = useState<TransformacionPar[]>(initial.transformaciones ?? []);

  const [foto3, setFoto3] = useState(trainer.foto3_url);
  const [foto4, setFoto4] = useState(trainer.foto4_url);

  const [status, setStatus] = useState<"idle" | "draft_ok" | "published_ok" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const canReorder = trainer.plan !== "starter"; // Reordenar servicios: Pro/Elite
  const landingUrl = trainer.subdominio ? `https://${trainer.subdominio}.hakunnafit.com` : null;

  function currentDraft(): SitioWebDraftShape {
    return { servicios, seccionesActivas, faqs, mostrarTransformaciones, transformaciones };
  }

  function pushPreview(patch: SitioWebDraftShape) {
    patchDraft({
      servicios: patch.servicios,
      faqs: patch.faqs,
      mostrarTransformaciones: patch.mostrarTransformaciones,
      transformaciones: patch.transformaciones,
      seccionesActivas: patch.seccionesActivas,
    });
  }

  function handlePlanesChange(planes: PlanOfrecido[]) {
    patchDraft({ planesOfrecidos: planes });
  }

  function toggleSeccion(key: keyof Secciones) {
    setSeccionesActivas((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      pushPreview({ servicios, seccionesActivas: next, faqs, mostrarTransformaciones, transformaciones });
      return next;
    });
  }

  // --- Servicios ---
  function updateServicio(i: number, patch: Partial<Servicio>) {
    setServicios((prev) => {
      const next = prev.map((s, idx) => (idx === i ? { ...s, ...patch } : s));
      pushPreview({ servicios: next, seccionesActivas, faqs, mostrarTransformaciones, transformaciones });
      return next;
    });
  }
  function addServicio() {
    setServicios((prev) => {
      const next = [...prev, { titulo: "", descripcion: "", tipo: "directo" as const }];
      pushPreview({ servicios: next, seccionesActivas, faqs, mostrarTransformaciones, transformaciones });
      return next;
    });
  }
  function removeServicio(i: number) {
    setServicios((prev) => {
      const next = prev.filter((_, idx) => idx !== i);
      pushPreview({ servicios: next, seccionesActivas, faqs, mostrarTransformaciones, transformaciones });
      return next;
    });
  }
  function moveServicio(i: number, dir: -1 | 1) {
    if (!canReorder) return;
    setServicios((prev) => {
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      pushPreview({ servicios: next, seccionesActivas, faqs, mostrarTransformaciones, transformaciones });
      return next;
    });
  }

  // --- FAQ ---
  function updateFaq(i: number, patch: Partial<Faq>) {
    setFaqs((prev) => {
      const next = prev.map((f, idx) => (idx === i ? { ...f, ...patch } : f));
      pushPreview({ servicios, seccionesActivas, faqs: next, mostrarTransformaciones, transformaciones });
      return next;
    });
  }
  function addFaq() {
    setFaqs((prev) => {
      const next = [...prev, { pregunta: "", respuesta: "" }];
      pushPreview({ servicios, seccionesActivas, faqs: next, mostrarTransformaciones, transformaciones });
      return next;
    });
  }
  function removeFaq(i: number) {
    setFaqs((prev) => {
      const next = prev.filter((_, idx) => idx !== i);
      pushPreview({ servicios, seccionesActivas, faqs: next, mostrarTransformaciones, transformaciones });
      return next;
    });
  }

  // --- Transformaciones ---
  function toggleMostrarTransformaciones() {
    setMostrarTransformaciones((prev) => {
      const next = !prev;
      pushPreview({ servicios, seccionesActivas, faqs, mostrarTransformaciones: next, transformaciones });
      return next;
    });
  }
  function updateTransformacion(i: number, patch: Partial<TransformacionPar>) {
    setTransformaciones((prev) => {
      const next = prev.map((t, idx) => (idx === i ? { ...t, ...patch } : t));
      pushPreview({ servicios, seccionesActivas, faqs, mostrarTransformaciones, transformaciones: next });
      return next;
    });
  }
  function addTransformacion() {
    setTransformaciones((prev) => {
      const next = [...prev, { antes: "", despues: "", nombre: "" }];
      pushPreview({ servicios, seccionesActivas, faqs, mostrarTransformaciones, transformaciones: next });
      return next;
    });
  }
  function removeTransformacion(i: number) {
    setTransformaciones((prev) => {
      const next = prev.filter((_, idx) => idx !== i);
      pushPreview({ servicios, seccionesActivas, faqs, mostrarTransformaciones, transformaciones: next });
      return next;
    });
  }

  // --- Guardar / Publicar ---
  function saveDraft() {
    setStatus("idle");
    setError(null);
    startTransition(async () => {
      const res = await saveOwnSitioWebDraft(currentDraft());
      if (!res.ok) {
        setStatus("error");
        setError(res.error || "No se pudo guardar el borrador.");
        return;
      }
      setStatus("draft_ok");
    });
  }
  function publish() {
    setStatus("idle");
    setError(null);
    startTransition(async () => {
      const res = await publishOwnSitioWeb(currentDraft());
      if (!res.ok) {
        setStatus("error");
        setError(res.error || "No se pudo publicar.");
        return;
      }
      setStatus("published_ok");
    });
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Mi Sitio Web</h1>
          <p className="mt-1 text-sm text-white/50">
            Activa, edita y publica cada sección de tu landing. Los cambios no salen al público hasta que
            presiones &quot;Publicar cambios&quot;.
          </p>
        </div>
        {landingUrl && (
          <a
            href={landingUrl}
            target="_blank"
            rel="noreferrer"
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-white/15 px-3 py-2 text-xs font-semibold text-white/70 hover:border-white/30 hover:text-white"
          >
            Ver Landing <ExternalLink size={13} />
          </a>
        )}
      </div>

      {trainer.landing_draft_updated_at && (
        <p className="mt-3 text-xs text-amber-300/80">
          Tienes un borrador sin publicar (guardado el {new Date(trainer.landing_draft_updated_at).toLocaleString("es-CO")}).
        </p>
      )}

      {/* Secciones */}
      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <p className="mb-1 text-sm font-semibold text-white">Secciones de tu landing</p>
        <p className="mb-4 text-xs text-white/40">
          Inicio, Sobre mí y Contacto siempre se muestran — son la base de cualquier landing.
        </p>
        <div className="flex flex-col divide-y divide-white/5">
          <SeccionToggle label="Servicios" checked={seccionesActivas.servicios} onChange={() => toggleSeccion("servicios")} />
          <SeccionToggle label="Planes / Paquetes" checked={seccionesActivas.planes} onChange={() => toggleSeccion("planes")} />
          <SeccionToggle
            label="Transformaciones"
            checked={seccionesActivas.transformaciones}
            onChange={() => toggleSeccion("transformaciones")}
          />
          <SeccionToggle label="Galería" checked={seccionesActivas.galeria} onChange={() => toggleSeccion("galeria")} />
          <SeccionToggle label="Preguntas frecuentes" checked={seccionesActivas.faq} onChange={() => toggleSeccion("faq")} />
        </div>
      </div>

      {/* Servicios */}
      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold text-white">Servicios</p>
          <button
            type="button"
            onClick={addServicio}
            className="flex items-center gap-1 rounded-full border border-white/15 px-3 py-1.5 text-[11px] font-semibold text-white/70 hover:border-white/30"
          >
            <Plus size={12} /> Agregar
          </button>
        </div>
        <div className="flex flex-col gap-3">
          {servicios.map((s, i) => (
            <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="flex items-start gap-2">
                <div className="flex-1 space-y-2">
                  <input
                    value={s.titulo}
                    onChange={(e) => updateServicio(i, { titulo: e.target.value })}
                    placeholder="Título del servicio"
                    className="h-9 w-full rounded-lg border border-white/15 bg-white/5 px-3 text-sm text-white focus:border-hf-blue focus:outline-none"
                  />
                  <textarea
                    value={s.descripcion}
                    onChange={(e) => updateServicio(i, { descripcion: e.target.value })}
                    placeholder="Descripción"
                    rows={2}
                    className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white focus:border-hf-blue focus:outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  {canReorder && (
                    <>
                      <button type="button" onClick={() => moveServicio(i, -1)} className="rounded-lg border border-white/10 px-2 py-1 text-[10px] text-white/50 hover:border-white/30">
                        ↑
                      </button>
                      <button type="button" onClick={() => moveServicio(i, 1)} className="rounded-lg border border-white/10 px-2 py-1 text-[10px] text-white/50 hover:border-white/30">
                        ↓
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => removeServicio(i)}
                    className="rounded-lg border border-white/10 p-2 text-white/40 hover:border-red-500/40 hover:text-red-400"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
          {servicios.length === 0 && <p className="text-xs text-white/40">Todavía no has agregado servicios.</p>}
        </div>
        {!canReorder && (
          <p className="mt-3 text-[11px] text-white/30">Reordenar servicios está disponible desde plan Pro.</p>
        )}
      </div>

      {/* Planes / Paquetes */}
      <TrainerPlanesManager initialPlanes={trainer.planes_ofrecidos} onChange={handlePlanesChange} />

      {/* Transformaciones */}
      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-white">Transformaciones</p>
            <p className="text-xs text-white/40">Fotos de antes/después de tus clientes.</p>
          </div>
          <button
            type="button"
            onClick={toggleMostrarTransformaciones}
            className={`h-6 w-11 shrink-0 rounded-full transition-colors ${mostrarTransformaciones ? "bg-hf-blue" : "bg-white/15"}`}
          >
            <span
              className={`block h-5 w-5 translate-y-0.5 rounded-full bg-white transition-transform ${mostrarTransformaciones ? "translate-x-5" : "translate-x-0.5"}`}
            />
          </button>
        </div>
        {mostrarTransformaciones && (
          <div className="flex flex-col gap-3">
            {transformaciones.map((t, i) => (
              <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="flex items-start gap-2">
                  <div className="flex-1 space-y-2">
                    <input
                      value={t.nombre ?? ""}
                      onChange={(e) => updateTransformacion(i, { nombre: e.target.value })}
                      placeholder="Nombre (opcional)"
                      className="h-9 w-full rounded-lg border border-white/15 bg-white/5 px-3 text-sm text-white focus:border-hf-blue focus:outline-none"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <TransformPhotoSlot
                        label="Antes"
                        url={t.antes}
                        onUploaded={(url) => updateTransformacion(i, { antes: url })}
                      />
                      <TransformPhotoSlot
                        label="Después"
                        url={t.despues}
                        onUploaded={(url) => updateTransformacion(i, { despues: url })}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeTransformacion(i)}
                    className="rounded-lg border border-white/10 p-2 text-white/40 hover:border-red-500/40 hover:text-red-400"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
            <button
              type="button"
              onClick={addTransformacion}
              className="flex items-center justify-center gap-1 self-start rounded-full border border-white/15 px-3 py-1.5 text-[11px] font-semibold text-white/70 hover:border-white/30"
            >
              <Plus size={12} /> Agregar par antes/después
            </button>
          </div>
        )}
      </div>

      {/* Galería */}
      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <p className="mb-1 text-sm font-semibold text-white">Galería</p>
        <p className="mb-4 text-xs text-white/40">Hasta 2 fotos adicionales de tu espacio o entrenamientos.</p>
        <div className="grid grid-cols-2 gap-3">
          <GalleryPhotoSlot label="Foto 1" url={foto3} slot="foto3_url" onUploaded={setFoto3} />
          <GalleryPhotoSlot label="Foto 2" url={foto4} slot="foto4_url" onUploaded={setFoto4} />
        </div>
      </div>

      {/* FAQ */}
      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold text-white">Preguntas frecuentes</p>
          <button
            type="button"
            onClick={addFaq}
            className="flex items-center gap-1 rounded-full border border-white/15 px-3 py-1.5 text-[11px] font-semibold text-white/70 hover:border-white/30"
          >
            <Plus size={12} /> Agregar
          </button>
        </div>
        <div className="flex flex-col gap-3">
          {faqs.map((f, i) => (
            <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="flex items-start gap-2">
                <div className="flex-1 space-y-2">
                  <input
                    value={f.pregunta}
                    onChange={(e) => updateFaq(i, { pregunta: e.target.value })}
                    placeholder="Pregunta"
                    className="h-9 w-full rounded-lg border border-white/15 bg-white/5 px-3 text-sm text-white focus:border-hf-blue focus:outline-none"
                  />
                  <textarea
                    value={f.respuesta}
                    onChange={(e) => updateFaq(i, { respuesta: e.target.value })}
                    placeholder="Respuesta"
                    rows={2}
                    className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white focus:border-hf-blue focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeFaq(i)}
                  className="rounded-lg border border-white/10 p-2 text-white/40 hover:border-red-500/40 hover:text-red-400"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          {faqs.length === 0 && <p className="text-xs text-white/40">Todavía no has agregado preguntas frecuentes.</p>}
        </div>
      </div>

      {status === "error" && <p className="mt-4 text-sm text-red-400">{error}</p>}
      {status === "draft_ok" && <p className="mt-4 text-sm text-amber-300">Borrador guardado — todavía no es público.</p>}
      {status === "published_ok" && <p className="mt-4 text-sm text-emerald-400">Cambios publicados en tu landing.</p>}

      <div className="mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={isPending}
          onClick={saveDraft}
          className="flex items-center gap-2 rounded-full border border-white/15 px-6 py-2.5 text-sm font-semibold text-white/80 hover:border-white/30 disabled:opacity-50"
        >
          <Save size={14} />
          Guardar borrador
        </button>
        <button
          type="button"
          disabled={isPending}
          onClick={publish}
          className="flex items-center gap-2 rounded-full px-6 py-2.5 text-sm font-semibold text-black disabled:opacity-50"
          style={{ background: "linear-gradient(90deg,#00C8FF,#6D2EFF)" }}
        >
          <UploadCloud size={14} />
          {isPending ? "Procesando..." : "Publicar cambios"}
        </button>
      </div>
    </div>
  );
}

function SeccionToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <div className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
      <span className="text-sm text-white/80">{label}</span>
      <button
        type="button"
        onClick={onChange}
        className={`h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? "bg-hf-blue" : "bg-white/15"}`}
      >
        <span className={`block h-5 w-5 translate-y-0.5 rounded-full bg-white transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
      </button>
    </div>
  );
}

function TransformPhotoSlot({ label, url, onUploaded }: { label: string; url: string; onUploaded: (url: string) => void }) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onPick(file: File) {
    setError(null);
    const formData = new FormData();
    formData.set("foto", file);
    startTransition(async () => {
      const res = await uploadOwnTransformacionPhoto(formData);
      if (!res.ok || !res.url) {
        setError(res.error || "No se pudo subir.");
        return;
      }
      onUploaded(res.url);
    });
  }

  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-lg bg-white/5">
        {url ? <Image src={url} alt={label} fill className="object-cover" /> : (
          <div className="flex h-full items-center justify-center text-[10px] text-white/30">{label}</div>
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
        className="mt-1.5 flex w-full items-center justify-center gap-1 rounded-lg border border-white/15 px-2 py-1.5 text-[10px] font-semibold text-white/70 hover:border-white/30 disabled:opacity-50"
      >
        <Upload size={10} /> {isPending ? "Subiendo..." : url ? "Cambiar" : label}
      </button>
      {error && <p className="mt-1 text-[10px] text-red-400">{error}</p>}
    </div>
  );
}

function GalleryPhotoSlot({
  label,
  url,
  slot,
  onUploaded,
}: {
  label: string;
  url: string | null;
  slot: "foto3_url" | "foto4_url";
  onUploaded: (url: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onPick(file: File) {
    setError(null);
    const formData = new FormData();
    formData.set("foto", file);
    startTransition(async () => {
      const res = await uploadOwnPhoto(slot, formData);
      if (!res.ok || !res.url) {
        setError(res.error || "No se pudo subir.");
        return;
      }
      onUploaded(res.url);
    });
  }

  return (
    <div>
      <div className="relative aspect-video overflow-hidden rounded-lg bg-white/5">
        {url ? <Image src={url} alt={label} fill className="object-cover" /> : (
          <div className="flex h-full items-center justify-center text-[10px] text-white/30">Sin imagen</div>
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
        className="mt-1.5 flex w-full items-center justify-center gap-1 rounded-lg border border-white/15 px-2 py-1.5 text-[10px] font-semibold text-white/70 hover:border-white/30 disabled:opacity-50"
      >
        <Upload size={10} /> {isPending ? "Subiendo..." : url ? "Cambiar" : label}
      </button>
      {error && <p className="mt-1 text-[10px] text-red-400">{error}</p>}
    </div>
  );
}
