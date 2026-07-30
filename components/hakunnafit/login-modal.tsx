"use client";

// Modal de "Iniciar sesión" del header de HakunnaFit — antes el botón era un
// href="#" muerto. Un solo modal con 2 pestañas porque hay 2 tipos de acceso
// completamente distintos en este mismo proyecto Next.js:
// - Entrenador: sesión real de Supabase Auth (correo + contraseña), ver
//   loginTrainer en lib/trainer-auth.ts. Termina en /panel.
// - Equipo HakunnaFit: una sola contraseña compartida (sin usuarios
//   individuales), ver loginAdmin en lib/admin-auth.ts. Termina en
//   /panel-hakunna.
// No hay "detectar automáticamente quién eres": la persona elige la pestaña
// porque son dos mecanismos de autenticación distintos, no la misma tabla.

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { loginTrainer } from "@/lib/trainer-auth";
import { loginAdmin } from "@/lib/admin-auth";

type Tab = "trainer" | "admin";

export function HakunnaFitLoginModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("trainer");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // El header (donde se monta este modal) tiene backdrop-blur-xl — un
  // backdrop-filter crea un "containing block" para los descendientes
  // position:fixed, así que sin el portal el modal quedaba encajonado
  // dentro del alto del header (~160px) en vez de cubrir toda la pantalla.
  // Con createPortal se monta directo en <body>, fuera de ese contexto.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!open || !mounted) return null;

  function switchTab(next: Tab) {
    setTab(next);
    setError(null);
  }

  async function onSubmitTrainer(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await loginTrainer(formData);
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "No se pudo iniciar sesión.");
      return;
    }
    onClose();
    router.push("/panel");
    router.refresh();
  }

  async function onSubmitAdmin(formData: FormData) {
    setLoading(true);
    setError(null);
    const result = await loginAdmin(formData);
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "No se pudo iniciar sesión.");
      return;
    }
    onClose();
    router.push("/panel-hakunna");
    router.refresh();
  }

  const inputClass =
    "h-11 w-full rounded-xl border border-white/15 bg-white/5 px-4 text-sm text-white placeholder:text-white/30 focus:border-hf-blue focus:outline-none";
  const labelClass = "mb-1.5 block text-xs font-semibold text-white/70";

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-hf-black p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Iniciar sesión</h2>
          <button aria-label="Cerrar" onClick={onClose} className="text-white/40 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 flex gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1">
          <button
            type="button"
            onClick={() => switchTab("trainer")}
            className={`flex-1 rounded-full py-2 text-xs font-semibold transition-colors ${
              tab === "trainer" ? "bg-hf-blue text-black" : "text-white/60 hover:text-white"
            }`}
          >
            Soy entrenador
          </button>
          <button
            type="button"
            onClick={() => switchTab("admin")}
            className={`flex-1 rounded-full py-2 text-xs font-semibold transition-colors ${
              tab === "admin" ? "bg-hf-blue text-black" : "text-white/60 hover:text-white"
            }`}
          >
            Equipo HakunnaFit
          </button>
        </div>

        {tab === "trainer" ? (
          <form key="trainer" action={onSubmitTrainer} className="mt-5 flex flex-col gap-3">
            <div>
              <label className={labelClass}>Correo</label>
              <input type="email" name="email" required autoFocus placeholder="tu@correo.com" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Contraseña</label>
              <input type="password" name="password" required className={inputClass} />
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="mt-1 h-11 rounded-full text-sm font-semibold text-white transition-transform hover:scale-[1.01] disabled:opacity-60"
              style={{ background: "linear-gradient(90deg,#00C8FF,#6D2EFF,#FF2DB8)" }}
            >
              {loading ? "Entrando..." : "Entrar a mi panel"}
            </button>
            <p className="text-center text-[11px] text-white/40">
              ¿Primera vez? Revisa el correo de bienvenida para crear tu contraseña.
            </p>
          </form>
        ) : (
          <form key="admin" action={onSubmitAdmin} className="mt-5 flex flex-col gap-3">
            <div>
              <label className={labelClass}>Usuario</label>
              <input type="text" name="username" required autoFocus autoCapitalize="none" autoCorrect="off" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Contraseña del equipo</label>
              <input type="password" name="password" required className={inputClass} />
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="mt-1 h-11 rounded-full text-sm font-semibold text-white transition-transform hover:scale-[1.01] disabled:opacity-60"
              style={{ background: "linear-gradient(90deg,#00C8FF,#6D2EFF,#FF2DB8)" }}
            >
              {loading ? "Entrando..." : "Entrar al panel HakunnaFit"}
            </button>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}
