"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginAdmin } from "@/lib/admin-auth";

export default function AdminLoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await loginAdmin(formData);
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "No se pudo iniciar sesión.");
      return;
    }
    router.push("/panel-hakunna");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-hf-black px-6">
      <form
        action={onSubmit}
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.03] p-8"
      >
        <h1 className="text-lg font-bold text-white">Panel HakunnaFit</h1>
        <p className="mt-1 text-sm text-white/50">Acceso interno. Solo para el equipo HakunnaFit.</p>

        <label className="mt-6 block">
          <span className="mb-1.5 block text-xs font-semibold text-white/70">Contraseña</span>
          <input
            type="password"
            name="password"
            required
            autoFocus
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
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
