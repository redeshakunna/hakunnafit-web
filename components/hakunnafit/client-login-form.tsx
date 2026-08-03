"use client";

// Login del cliente final — vive en /landing/[subdominio]/ingresar (dentro
// del subdominio del propio entrenador, no en una URL neutra de la app).
// Reemplaza por completo el viejo portal por token (/mi-progreso/[token]).
//
// Pasos:
// 1. El cliente escribe su documento. checkClientDocument dice si existe
//    dentro de ESE entrenador y si ya tiene cuenta activada (user_id).
// 2. Si ya tiene cuenta -> pide su contraseña (loginClientWithPassword).
// 3. Si es primera vez, o si eligió "olvidé mi contraseña", se le manda un
//    código de un solo uso a su correo ya registrado (sendClientAccessCode)
//    y en el mismo paso define su contraseña (setClientPassword recibe
//    código + contraseña nueva juntos — no hace falta una pantalla más).

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  checkClientDocument,
  loginClientWithPassword,
  sendClientAccessCode,
  setClientPassword,
} from "@/lib/client-auth";

type View = "documento" | "password" | "codigo";

const inputClass =
  "h-11 w-full rounded-xl border border-white/15 bg-white/5 px-4 text-sm text-white focus:border-hf-blue focus:outline-none";
const labelClass = "mb-1.5 block text-xs font-semibold text-white/70";
const submitClass =
  "mt-6 w-full rounded-full px-6 py-3 text-sm font-semibold text-white transition-transform hover:scale-[1.02] disabled:opacity-60";

export function ClientLoginForm({ subdominio, accentColor }: { subdominio: string; accentColor: string }) {
  const router = useRouter();
  const [view, setView] = useState<View>("documento");
  const [documento, setDocumento] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submitStyle = { background: `linear-gradient(90deg, ${accentColor}, #6D2EFF)` };

  async function goSendCode() {
    setLoading(true);
    setError(null);
    const result = await sendClientAccessCode(subdominio, documento);
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "No pudimos enviarte el código.");
      return;
    }
    setNotice("Te enviamos un código a tu correo registrado. Vence en 15 minutos.");
    setView("codigo");
  }

  async function onSubmitDocumento(e: React.FormEvent) {
    e.preventDefault();
    if (!documento.trim()) return;
    setLoading(true);
    setError(null);
    const result = await checkClientDocument(subdominio, documento);
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "No encontramos tu documento.");
      return;
    }
    if (result.hasAccount) {
      setView("password");
    } else {
      await goSendCode();
    }
  }

  async function onSubmitPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await loginClientWithPassword(subdominio, documento, password);
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "No pudimos iniciar tu sesión.");
      return;
    }
    router.push("/mi-cuenta");
    router.refresh();
  }

  async function onSubmitCodigo(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    setLoading(true);
    setError(null);
    const result = await setClientPassword(subdominio, documento, code, newPassword);
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "No pudimos validar tu código.");
      return;
    }
    router.push("/mi-cuenta");
    router.refresh();
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.03] p-8">
      {view === "documento" && (
        <form onSubmit={onSubmitDocumento}>
          <label className="block">
            <span className={labelClass}>Número de documento</span>
            <input
              value={documento}
              onChange={(e) => setDocumento(e.target.value)}
              required
              autoFocus
              className={inputClass}
              placeholder="Tu cédula, la misma que le diste a tu entrenador"
            />
          </label>
          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
          <button type="submit" disabled={loading} className={submitClass} style={submitStyle}>
            {loading ? "Buscando..." : "Continuar"}
          </button>
        </form>
      )}

      {view === "password" && (
        <form onSubmit={onSubmitPassword}>
          <p className="mb-4 text-sm text-white/60">Escribe tu contraseña para entrar.</p>
          <label className="block">
            <span className={labelClass}>Contraseña</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoFocus
              className={inputClass}
            />
          </label>
          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
          <button type="submit" disabled={loading} className={submitClass} style={submitStyle}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
          <button
            type="button"
            onClick={goSendCode}
            disabled={loading}
            className="mt-4 block w-full text-center text-[11px] font-semibold text-white/40 hover:text-white/70"
          >
            ¿Olvidaste tu contraseña?
          </button>
          <button
            type="button"
            onClick={() => {
              setView("documento");
              setError(null);
            }}
            className="mt-2 block w-full text-center text-[11px] font-semibold text-white/40 hover:text-white/70"
          >
            Usar otro documento
          </button>
        </form>
      )}

      {view === "codigo" && (
        <form onSubmit={onSubmitCodigo}>
          {notice && <p className="mb-4 text-sm text-white/60">{notice}</p>}
          <label className="block">
            <span className={labelClass}>Código de 6 dígitos</span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              autoFocus
              inputMode="numeric"
              className={inputClass}
              placeholder="123456"
            />
          </label>
          <label className="mt-4 block">
            <span className={labelClass}>Crea tu contraseña</span>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={6}
              className={inputClass}
              placeholder="Mínimo 6 caracteres"
            />
          </label>
          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
          <button type="submit" disabled={loading} className={submitClass} style={submitStyle}>
            {loading ? "Guardando..." : "Crear contraseña y entrar"}
          </button>
          <button
            type="button"
            onClick={goSendCode}
            disabled={loading}
            className="mt-4 block w-full text-center text-[11px] font-semibold text-white/40 hover:text-white/70"
          >
            Reenviar código
          </button>
        </form>
      )}
    </div>
  );
}
