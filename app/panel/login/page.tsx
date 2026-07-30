"use client";

// Pantalla única de login — sirve tanto a entrenadores como al super-admin
// del equipo HakunnaFit con el mismo formulario (usuario/correo +
// contraseña). loginUnified() prueba primero las credenciales del
// super-admin y, si no coinciden, intenta como entrenador; el redirectTo
// que devuelve decide a dónde va cada quien. Vive en /panel/login (ruta ya
// pública en middleware.ts) — /panel-hakunna/login solo redirige aquí por
// compatibilidad con links viejos.
//
// Además del login normal, tiene 2 sub-vistas de recuperación:
// - "¿Olvidaste tu contraseña?": solo aplica a entrenadores (el super-admin
//   es una sola cuenta compartida, sin recuperación por correo) — pide el
//   correo y dispara requestTrainerPasswordReset (Supabase Auth). El mensaje
//   es siempre el mismo exista o no la cuenta, para no filtrar información.
// - "¿Olvidaste tu usuario?": no hay nada que "recuperar" de verdad (el
//   usuario del entrenador es su propio correo, y el del super-admin es
//   fijo) — solo explica eso y da un contacto de soporte por WhatsApp.

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { ArrowLeft } from "lucide-react";
import { loginUnified } from "@/lib/unified-login-actions";
import { requestTrainerPasswordReset } from "@/lib/trainer-auth";

// Mismo número de soporte de HakunnaFit usado en components/hakunnafit/coming-soon.tsx.
const SUPPORT_WHATSAPP_URL =
  "https://wa.me/573126070588?text=" + encodeURIComponent("Hola! No recuerdo mi usuario para entrar a mi panel de HakunnaFit.");

type View = "login" | "forgot-password" | "forgot-username";

const inputClass =
  "h-11 w-full rounded-xl border border-white/15 bg-white/5 px-4 text-sm text-white focus:border-hf-blue focus:outline-none";
const labelClass = "mb-1.5 block text-xs font-semibold text-white/70";
const cardClass = "w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.03] p-8";
const submitClass =
  "mt-6 w-full rounded-full px-6 py-3 text-sm font-semibold text-white transition-transform hover:scale-[1.02] disabled:opacity-60";
const submitStyle = { background: "linear-gradient(90deg,#00C8FF,#6D2EFF,#FF2DB8)" };

function Logo() {
  return (
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
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-4 flex items-center gap-1.5 text-xs font-semibold text-white/50 hover:text-white"
    >
      <ArrowLeft size={13} /> Volver
    </button>
  );
}

export default function UnifiedLoginPage() {
  const router = useRouter();
  const [view, setView] = useState<View>("login");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmitLogin(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await loginUnified(formData);
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "No se pudo iniciar sesión.");
      return;
    }
    router.push(result.redirectTo ?? "/panel");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-hf-black px-6">
      {view === "login" && (
        <form action={onSubmitLogin} className={cardClass}>
          <Logo />
          <h1 className="text-center text-lg font-bold text-white">Iniciar sesión</h1>
          <p className="mt-1 text-center text-sm text-white/50">Entra con tu usuario o correo y tu contraseña.</p>

          <label className="mt-6 block">
            <span className={labelClass}>Usuario o correo</span>
            <input
              type="text"
              name="identifier"
              required
              autoFocus
              autoCapitalize="none"
              autoCorrect="off"
              className={inputClass}
            />
          </label>

          <label className="mt-4 block">
            <span className={labelClass}>Contraseña</span>
            <input type="password" name="password" required className={inputClass} />
          </label>

          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

          <button type="submit" disabled={loading} className={submitClass} style={submitStyle}>
            {loading ? "Entrando..." : "Entrar"}
          </button>

          <div className="mt-4 flex items-center justify-between text-[11px] text-white/40">
            <button
              type="button"
              onClick={() => setView("forgot-username")}
              className="font-semibold hover:text-white/70"
            >
              ¿Olvidaste tu usuario?
            </button>
            <button
              type="button"
              onClick={() => setView("forgot-password")}
              className="font-semibold hover:text-white/70"
            >
              ¿Olvidaste tu contraseña?
            </button>
          </div>
        </form>
      )}

      {view === "forgot-password" && <ForgotPasswordPanel onBack={() => setView("login")} />}

      {view === "forgot-username" && <ForgotUsernamePanel onBack={() => setView("login")} />}
    </div>
  );
}

function ForgotPasswordPanel({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    await requestTrainerPasswordReset(email);
    setLoading(false);
    setSent(true);
  }

  return (
    <div className={cardClass}>
      <Logo />
      <BackButton onClick={onBack} />
      <h1 className="text-center text-lg font-bold text-white">Recuperar contraseña</h1>

      {sent ? (
        <p className="mt-4 text-center text-sm text-white/60">
          Si <span className="text-white">{email}</span> tiene una cuenta de entrenador con nosotros, te enviamos un correo con un
          enlace para crear una nueva contraseña.
        </p>
      ) : (
        <>
          <p className="mt-1 text-center text-sm text-white/50">
            Solo aplica a entrenadores. Escribe tu correo y te mandamos un enlace para crear una nueva.
          </p>
          <form onSubmit={onSubmit}>
            <label className="mt-6 block">
              <span className={labelClass}>Correo</span>
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
            </label>
            <button type="submit" disabled={loading} className={submitClass} style={submitStyle}>
              {loading ? "Enviando..." : "Enviar enlace"}
            </button>
          </form>
        </>
      )}

      <p className="mt-4 text-center text-[11px] text-white/40">
        ¿Eres del equipo HakunnaFit?{" "}
        <a href={SUPPORT_WHATSAPP_URL} target="_blank" rel="noreferrer" className="font-semibold text-hf-blue hover:underline">
          Escríbenos por WhatsApp
        </a>
        .
      </p>
    </div>
  );
}

function ForgotUsernamePanel({ onBack }: { onBack: () => void }) {
  return (
    <div className={cardClass}>
      <Logo />
      <BackButton onClick={onBack} />
      <h1 className="text-center text-lg font-bold text-white">¿Olvidaste tu usuario?</h1>

      <div className="mt-4 space-y-3 text-sm text-white/60">
        <p>
          Si eres <span className="font-semibold text-white">entrenador</span>, tu usuario es el correo con el que te registraste
          — revisa el correo de bienvenida que te enviamos al activar tu cuenta.
        </p>
        <p>
          Si eres del <span className="font-semibold text-white">equipo HakunnaFit</span>, escríbenos y te confirmamos tu acceso.
        </p>
      </div>

      <a
        href={SUPPORT_WHATSAPP_URL}
        target="_blank"
        rel="noreferrer"
        className={`${submitClass} block text-center`}
        style={submitStyle}
      >
        Escríbenos por WhatsApp
      </a>
    </div>
  );
}
