"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function SetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (updateError) {
      setError("No pudimos guardar tu contraseña. Pide un nuevo enlace e inténtalo de nuevo.");
      return;
    }

    router.push("/panel");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-hf-black px-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.03] p-8">
        <div className="mx-auto mb-2" style={{ width: 160 }}>
          <Image
            src="/images/LogoHorizontal-trasnparente.png"
            alt="HakunnaFit"
            width={1728}
            height={910}
            className="h-auto w-full"
            priority
          />
        </div>
        <h1 className="text-center text-lg font-bold text-white">Crea tu contraseña</h1>
        <p className="mt-1 text-center text-sm text-white/50">La usarás para entrar a tu panel la próxima vez.</p>

        <label className="mt-6 block">
          <span className="mb-1.5 block text-xs font-semibold text-white/70">Nueva contraseña</span>
          <input
            type="password"
            required
            minLength={8}
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 w-full rounded-xl border border-white/15 bg-white/5 px-4 text-sm text-white focus:border-hf-blue focus:outline-none"
          />
        </label>

        <label className="mt-4 block">
          <span className="mb-1.5 block text-xs font-semibold text-white/70">Confirma la contraseña</span>
          <input
            type="password"
            required
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="h-11 w-full rounded-xl border border-white/15 bg-white/5 px-4 text-sm text-white focus:border-hf-blue focus:outline-none"
          />
        </label>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full rounded-full px-6 py-3 text-sm font-semibold text-white transition-transform hover:scale-[1.02] disabled:opacity-60"
          style={{ background: "linear-gradient(90deg,#00C8FF,#6D2EFF,#FF2DB8)" }}
        >
          {loading ? "Guardando..." : "Guardar y entrar"}
        </button>
      </form>
    </div>
  );
}
