"use client";

import { useRef, useState, useTransition } from "react";
import Image from "next/image";
import { Upload } from "lucide-react";
import { uploadOwnPhoto, type OwnPhotoSlot } from "@/lib/trainer-actions";
import type { TrainerRow } from "@/lib/admin-actions";

const SLOTS: { slot: OwnPhotoSlot; label: string; hint?: string }[] = [
  { slot: "logo_url", label: "Logo", hint: "Si no subes uno, tu landing muestra el nombre de tu negocio con un estilo acorde al diseño." },
  { slot: "avatar_url", label: "Foto de perfil" },
  { slot: "foto2_url", label: "Foto 2" },
  { slot: "foto3_url", label: "Foto 3" },
  { slot: "foto4_url", label: "Foto 4" },
];

export function TrainerPhotosForm({ trainer }: { trainer: TrainerRow }) {
  const initial: Record<OwnPhotoSlot, string | null> = {
    logo_url: trainer.logo_url,
    avatar_url: trainer.avatar_url,
    foto2_url: trainer.foto2_url,
    foto3_url: trainer.foto3_url,
    foto4_url: trainer.foto4_url,
  };
  const [urls, setUrls] = useState(initial);
  const [errors, setErrors] = useState<Partial<Record<OwnPhotoSlot, string>>>({});

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="text-xl font-bold text-white">Fotos y logo</h1>
      <p className="mt-1 text-sm text-white/50">JPG, PNG o WEBP — máximo 3 MB por imagen.</p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {SLOTS.map((s) => (
          <PhotoSlotCard
            key={s.slot}
            slot={s.slot}
            label={s.label}
            hint={s.hint}
            url={urls[s.slot]}
            error={errors[s.slot]}
            onUploaded={(url) => setUrls((prev) => ({ ...prev, [s.slot]: url }))}
            onError={(err) => setErrors((prev) => ({ ...prev, [s.slot]: err }))}
          />
        ))}
      </div>
    </div>
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
