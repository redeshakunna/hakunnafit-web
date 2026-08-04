"use client";

// Mi Negocio → Cobros. Datos para que los clientes finales le transfieran la
// mensualidad de su plan de entrenamiento — cuenta bancaria y/o Nequi, más
// la llave Bre-B si la usa. Se guarda al instante (mismo criterio que
// Planes/Paquetes en trainer-planes-manager.tsx: es dato operativo, no
// contenido de la landing) y alimenta el mensaje de recordatorio de pago que
// se arma automático para mandar por WhatsApp (ver lib/client-billing.ts).

import { useState } from "react";
import { Wallet, Check, Loader2 } from "lucide-react";
import type { DatosCobro } from "@/lib/admin-actions";
import { updateOwnPaymentSettings } from "@/lib/client-billing-actions";

const EMPTY: DatosCobro = { titular: null, banco: null, tipoCuenta: null, numeroCuenta: null, llaveBreB: null, nequi: null };

export function TrainerPaymentSettingsForm({ initial }: { initial: DatosCobro | null }) {
  const [form, setForm] = useState<DatosCobro>(initial ?? EMPTY);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    setSaving(true);
    const res = await updateOwnPaymentSettings(form);
    setSaving(false);
    if (!res.ok) {
      setError(res.error ?? "No se pudieron guardar los datos de cobro.");
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="mt-8">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex items-center gap-2 text-white/50">
          <Wallet size={16} />
          <p className="text-xs font-semibold uppercase tracking-wide">Cobros a tus clientes</p>
        </div>
        <p className="mt-1 text-xs text-white/40">
          Estos datos se usan para armar el recordatorio de pago que le mandas por WhatsApp a tus clientes —
          transferencia directa, sin pasarela. Deja vacío lo que no uses.
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="text-[11px] font-semibold text-white/50">Titular de la cuenta</label>
            <input
              value={form.titular ?? ""}
              onChange={(e) => setForm({ ...form, titular: e.target.value || null })}
              placeholder="Nombre completo"
              className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 text-sm text-white outline-none focus:border-hf-blue"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-white/50">Banco</label>
            <input
              value={form.banco ?? ""}
              onChange={(e) => setForm({ ...form, banco: e.target.value || null })}
              placeholder="Ej. Bancolombia"
              className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 text-sm text-white outline-none focus:border-hf-blue"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-white/50">Tipo de cuenta</label>
            <select
              value={form.tipoCuenta ?? ""}
              onChange={(e) => setForm({ ...form, tipoCuenta: (e.target.value || null) as DatosCobro["tipoCuenta"] })}
              className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 text-sm text-white outline-none focus:border-hf-blue"
            >
              <option value="">Sin definir</option>
              <option value="ahorros">Ahorros</option>
              <option value="corriente">Corriente</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-white/50">Número de cuenta</label>
            <input
              value={form.numeroCuenta ?? ""}
              onChange={(e) => setForm({ ...form, numeroCuenta: e.target.value || null })}
              placeholder="000-000000-00"
              className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 text-sm text-white outline-none focus:border-hf-blue"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-white/50">Llave Bre-B</label>
            <input
              value={form.llaveBreB ?? ""}
              onChange={(e) => setForm({ ...form, llaveBreB: e.target.value || null })}
              placeholder="Tu llave breve"
              className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 text-sm text-white outline-none focus:border-hf-blue"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-white/50">Nequi</label>
            <input
              value={form.nequi ?? ""}
              onChange={(e) => setForm({ ...form, nequi: e.target.value || null })}
              placeholder="Número de Nequi (si aplica)"
              className="mt-1 h-10 w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 text-sm text-white outline-none focus:border-hf-blue"
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-end gap-3">
          {error && <p className="text-xs text-red-400">{error}</p>}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-full bg-hf-blue px-4 py-2 text-xs font-bold text-black disabled:opacity-60"
          >
            {saving ? <Loader2 size={13} className="animate-spin" /> : saved ? <Check size={13} /> : null}
            {saving ? "Guardando..." : saved ? "Guardado" : "Guardar datos de cobro"}
          </button>
        </div>
      </div>
    </div>
  );
}
