"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { loginTrainer } from "@/lib/trainer-auth";

export default function TrainerLoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await loginTrainer(formData);
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "No se pudo iniciar sesión.");
      return;
    }
    router.push("/panel");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-hf-black px-6">
      <form action={onSubmit} className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.03] p-8">
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
        <h1 className="text-center text-lg font-bold text-white">Tu panel</h1>
        <p className="mt-1 text-center text-sm text-white/50">Entra con tu correo y contraseña.</p>

        <label className="mt-6 block">
          <span className="mb-1.5 block text-xs font-semibold text-white/70">Correo</span>
          <input
            type="email"
            name="email"
            required
            autoFocus
            className="h-11 w-full rounded-xl border border-white/15 bg-white/5 px-4 text-sm text-white focus:border-hf-blue focus:outline-none"
          />
        </label>

        <label className="mt-4 block">
          <span className="mb-1.5 block text-xs font-semibold text-white/70">Contraseña</span>
          <input
            type="password"
            name="password"
            required
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

        <p className="mt-4 text-center text-[11px] text-white/40">
          ¿Primera vez? Revisa el correo de bienvenida para crear tu contraseña.
        </p>
      </form>
    </div>
  );
}
