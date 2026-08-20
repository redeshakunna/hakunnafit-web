"use client";

// Menú "..." de la Agenda — agrupa lo que no es uso diario (conectar/
// desconectar Google del entrenador) para que la vista principal quede tan
// limpia como el diseño de referencia, en vez de mostrar siempre el banner
// de Google.
//
// Antes también ofrecía generar un link para que cada CLIENTE conectara su
// propio Google Calendar (/agenda/conectar/[token]). Se quitó de este menú
// (2026-08-20): cuando el entrenador agenda una cita, Google ya le manda al
// cliente una invitación real por correo (attendeeEmail + sendUpdates=all
// en lib/google-calendar.ts) que acepta con un clic sin pasar por ningún
// OAuth — y /mi-cuenta ya tiene "Agregar a mi calendario" (link/ICS, sin
// login) como respaldo manual. La conexión OAuth del cliente no aportaba
// nada que esas dos vías no cubrieran, y sí le sumaba la pantalla de
// advertencia "Google no verificó esta app" — fricción sin beneficio real
// para alguien que no es el dueño de la cuenta de desarrollador. La página
// /agenda/conectar/[token] y su server action siguen existiendo (no se
// borraron), solo dejaron de promoverse en el flujo principal.

import { useEffect, useRef, useState } from "react";
import { MoreHorizontal, CalendarCheck2 } from "lucide-react";
import { beginTrainerGoogleConnect, disconnectOwnGoogleCalendar } from "@/lib/calendar-connections-actions";

export function TrainerAgendaSettingsMenu({
  googleConfigured,
  googleConnected,
  googleEmail,
}: {
  googleConfigured: boolean;
  googleConnected: boolean;
  googleEmail: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [connected, setConnected] = useState(googleConnected);
  const [email, setEmail] = useState(googleEmail);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function connectGoogle() {
    const res = await beginTrainerGoogleConnect();
    if (res.ok && res.url) window.location.href = res.url;
  }

  async function disconnectGoogle() {
    await disconnectOwnGoogleCalendar();
    setConnected(false);
    setEmail(null);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-full border border-white/15 text-white/60 hover:border-white/30 hover:text-white"
      >
        <MoreHorizontal size={16} />
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-80 rounded-2xl border border-white/10 bg-[#0a0d16] p-4 shadow-xl">
          {!googleConfigured ? (
            <p className="text-xs text-white/40">
              La sincronización con Google Calendar todavía no está configurada por HakunnaFit.
            </p>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <CalendarCheck2 size={15} className={connected ? "text-emerald-400" : "text-white/40"} />
                <span className="text-xs font-semibold text-white/80">
                  {connected ? `Google conectado${email ? ` · ${email}` : ""}` : "Google no conectado"}
                </span>
              </div>
              {connected ? (
                <button onClick={disconnectGoogle} className="text-[11px] font-semibold text-white/40 hover:text-white">
                  Desconectar
                </button>
              ) : (
                <button onClick={connectGoogle} className="text-[11px] font-semibold text-hf-blue hover:underline">
                  Conectar
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
