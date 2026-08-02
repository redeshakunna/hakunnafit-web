"use client";

import { useState, useTransition } from "react";
import { Check, Save } from "lucide-react";
import { updatePlanPrices, type PlanPrices } from "@/lib/plan-settings-actions";
import { updatePlatformSettings, type PlatformSettings } from "@/lib/platform-settings-actions";
import { PLANS, type PlanKey } from "@/lib/catalog";

const CYCLES: { key: keyof PlanPrices[PlanKey]; label: string; hint: string }[] = [
  { key: "monthlyCop", label: "Mensual", hint: "" },
  { key: "semesterCop", label: "6 meses", hint: "Ahorra 10%" },
  { key: "annualCop", label: "Anual", hint: "Ahorra 15% + 1 mes gratis" },
];

function formatCop(n: number): string {
  return new Intl.NumberFormat("es-CO").format(n);
}

export function ConfiguracionView({
  initialPrices,
  initialPlatformSettings,
}: {
  initialPrices: PlanPrices;
  initialPlatformSettings: PlatformSettings;
}) {
  return (
    <div>
      <h1 className="text-xl font-bold text-white">Configuración</h1>
      <p className="mt-1 text-sm text-white/50">
        Ajustes fundamentales de la plataforma — precios, contacto de HakunnaFit y remitente de correos.
      </p>

      <div className="mt-8">
        <PreciosSection initialPrices={initialPrices} />
      </div>

      <div className="mt-10 border-t border-white/10 pt-8">
        <PlatformSettingsSection initialSettings={initialPlatformSettings} />
      </div>
    </div>
  );
}

function PreciosSection({ initialPrices }: { initialPrices: PlanPrices }) {
  const [prices, setPrices] = useState(initialPrices);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function setValue(plan: PlanKey, cycle: keyof PlanPrices[PlanKey], value: string) {
    const n = Number(value.replace(/[^\d]/g, "")) || 0;
    setPrices((p) => ({ ...p, [plan]: { ...p[plan], [cycle]: n } }));
    setSaved(false);
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await updatePlanPrices(prices);
      if (!result.ok) {
        setError(result.error ?? "No se pudo guardar.");
        return;
      }
      setSaved(true);
    });
  }

  return (
    <div>
      <p className="font-[family-name:var(--font-hf-heading)] text-sm font-bold uppercase tracking-wide text-white/80">
        Precios de planes
      </p>
      <p className="mt-1 text-xs text-white/40">
        Se usan en la landing y para generar los links de pago en Solicitudes.
      </p>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {PLANS.map((p) => (
          <div key={p.key} className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
            <p className="font-[family-name:var(--font-hf-heading)] text-sm font-bold uppercase tracking-wide text-white">
              {p.label}
            </p>
            <div className="mt-4 space-y-3">
              {CYCLES.map((c) => (
                <label key={c.key} className="block">
                  <span className="mb-1 flex items-baseline justify-between text-[11px] text-white/50">
                    <span>{c.label}</span>
                    {c.hint && <span className="text-emerald-400">{c.hint}</span>}
                  </span>
                  <div className="flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-3">
                    <span className="text-xs text-white/40">$</span>
                    <input
                      value={formatCop(prices[p.key as PlanKey][c.key])}
                      onChange={(e) => setValue(p.key as PlanKey, c.key, e.target.value)}
                      inputMode="numeric"
                      className="h-9 w-full bg-transparent text-sm text-white focus:outline-none"
                    />
                    <span className="text-xs text-white/40">COP</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          disabled={isPending}
          onClick={handleSave}
          className="flex items-center gap-1.5 rounded-full px-6 py-2.5 text-xs font-semibold text-white disabled:opacity-60"
          style={{ background: "linear-gradient(90deg,#00C8FF,#6D2EFF,#FF2DB8)" }}
        >
          <Save size={13} />
          {isPending ? "Guardando..." : "Guardar cambios"}
        </button>
        {saved && !isPending && (
          <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
            <Check size={13} /> Guardado
          </span>
        )}
      </div>
    </div>
  );
}

interface FieldSpec {
  key: keyof PlatformSettings;
  label: string;
  hint?: string;
  placeholder?: string;
}

const CONTACT_FIELDS: FieldSpec[] = [
  { key: "contactEmail", label: "Correo de contacto", hint: "Aparece en el footer de los correos de HakunnaFit", placeholder: "soporte@send.hakunnafit.com" },
  { key: "contactWhatsapp", label: "WhatsApp (solo dígitos, con indicativo)", hint: "Sin +, espacios ni guiones — ej. 573126070588", placeholder: "573126070588" },
  { key: "contactWhatsappDisplay", label: "WhatsApp (texto visible)", hint: "Cómo se muestra el número al destinatario", placeholder: "+57 312 607 0588" },
];

const SOCIAL_FIELDS: FieldSpec[] = [
  { key: "instagramUrl", label: "Instagram", placeholder: "https://instagram.com/HakunnaFit" },
  { key: "facebookUrl", label: "Facebook", placeholder: "https://facebook.com/HakunnaFit" },
  { key: "tiktokUrl", label: "TikTok", placeholder: "https://www.tiktok.com/@HakunnaFit" },
];

const EMAIL_ENGINE_FIELDS: FieldSpec[] = [
  { key: "resendFromAddress", label: "Correo remitente (Resend)", hint: "Debe ser de un dominio verificado en Resend → Domains", placeholder: "soporte@send.hakunnafit.com" },
  { key: "adminNotificationEmail", label: "Correo de notificaciones internas", hint: "A dónde llegan las alertas del equipo HakunnaFit (nuevas solicitudes, cobros, etc.)", placeholder: "redeshakunna@gmail.com" },
];

function FieldGroup({
  title,
  hint,
  fields,
  values,
  onChange,
}: {
  title: string;
  hint?: string;
  fields: FieldSpec[];
  values: PlatformSettings;
  onChange: (key: keyof PlatformSettings, value: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <p className="font-[family-name:var(--font-hf-heading)] text-xs font-bold uppercase tracking-wide text-white">
        {title}
      </p>
      {hint && <p className="mt-1 text-[11px] text-white/40">{hint}</p>}
      <div className="mt-4 space-y-3">
        {fields.map((f) => (
          <label key={f.key} className="block">
            <span className="mb-1 block text-[11px] text-white/50">{f.label}</span>
            <input
              value={values[f.key]}
              onChange={(e) => onChange(f.key, e.target.value)}
              placeholder={f.placeholder}
              className="h-9 w-full rounded-lg border border-white/15 bg-white/5 px-3 text-sm text-white placeholder:text-white/25 focus:outline-none"
            />
            {f.hint && <span className="mt-1 block text-[10.5px] text-white/30">{f.hint}</span>}
          </label>
        ))}
      </div>
    </div>
  );
}

function PlatformSettingsSection({ initialSettings }: { initialSettings: PlatformSettings }) {
  const [settings, setSettings] = useState(initialSettings);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function setValue(key: keyof PlatformSettings, value: string) {
    setSettings((s) => ({ ...s, [key]: value }));
    setSaved(false);
  }

  function handleSave() {
    setError(null);
    startTransition(async () => {
      const result = await updatePlatformSettings(settings);
      if (!result.ok) {
        setError(result.error ?? "No se pudo guardar.");
        return;
      }
      setSaved(true);
    });
  }

  return (
    <div>
      <p className="font-[family-name:var(--font-hf-heading)] text-sm font-bold uppercase tracking-wide text-white/80">
        Configuración de HakunnaFit
      </p>
      <p className="mt-1 text-xs text-white/40">
        Contacto, redes sociales y remitente de correo usados por toda la plataforma — incluyendo el motor de
        correos (lib/mail) y las notificaciones internas del equipo. Si se dejan vacíos, se usan los valores por
        defecto de siempre.
      </p>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <FieldGroup title="Contacto de HakunnaFit" fields={CONTACT_FIELDS} values={settings} onChange={setValue} />
        <FieldGroup title="Redes sociales" hint="Se muestran como íconos en el footer de los correos" fields={SOCIAL_FIELDS} values={settings} onChange={setValue} />
        <FieldGroup title="Motor de correos" hint="Ver docs/EMAIL_ARCHITECTURE.md" fields={EMAIL_ENGINE_FIELDS} values={settings} onChange={setValue} />
      </div>

      {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          disabled={isPending}
          onClick={handleSave}
          className="flex items-center gap-1.5 rounded-full px-6 py-2.5 text-xs font-semibold text-white disabled:opacity-60"
          style={{ background: "linear-gradient(90deg,#00C8FF,#6D2EFF,#FF2DB8)" }}
        >
          <Save size={13} />
          {isPending ? "Guardando..." : "Guardar cambios"}
        </button>
        {saved && !isPending && (
          <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400">
            <Check size={13} /> Guardado
          </span>
        )}
      </div>
    </div>
  );
}
