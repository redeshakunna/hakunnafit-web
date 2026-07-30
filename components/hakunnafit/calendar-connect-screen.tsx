"use client";

// Pantalla pública (sin login) donde un cliente final conecta su Google
// Calendar — llega aquí desde un link de un solo uso que el entrenador le
// manda por WhatsApp (ver generateClientCalendarConnectLink). Una vez
// conectado, sus citas agendadas por el entrenador se crean directamente en
// SU propio calendario de Google.

import { useState } from "react";
import Image from "next/image";
import { CalendarCheck2, CheckCircle2 } from "lucide-react";
import {
  beginClientGoogleConnect,
  disconnectClientGoogleCalendar,
  type ClientCalendarConnectSession,
} from "@/lib/calendar-connections-actions";

export function CalendarConnectScreen({
  token,
  session,
}: {
  token: string;
  session: ClientCalendarConnectSession;
}) {
  const [connected, setConnected] = useState(session.connected);
  const [googleEmail, setGoogleEmail] = useState(session.googleEmail);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function connect() {
    setLoading(true);
    setError(null);
    const res = await beginClientGoogleConnect(token);
    if (!res.ok || !res.url) {
      setLoading(false);
      setError(res.error ?? "No se pudo iniciar la conexión.");
      return;
    }
    window.location.href = res.url;
  }

  async function disconnect() {
    setLoading(true);
    setError(null);
    const res = await disconnectClientGoogleCalendar(token);
    setLoading(false);
    if (!res.ok) {
      setError(res.error ?? "No se pudo desconectar.");
      return;
    }
    setConnected(false);
    setGoogleEmail(null);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-hf-black px-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
        <div className="relative mx-auto h-10 w-40">
          <Image src="/images/LogoHorizontal-trasnparente.png" alt="HakunnaFit" fill className="object-contain" />
        </div>

        <div className="mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-hf-blue/10 mx-auto">
          <CalendarCheck2 size={24} className="text-hf-blue" />
        </div>

        <p className="mt-4 text-lg font-bold text-white">Hola, {session.clientName}</p>
        <p className="mt-1 text-sm text-white/50">
          Conecta tu Google Calendar para que tus citas con {session.trainerBusinessName} aparezcan directo en tu
          calendario.
        </p>

        {connected ? (
          <div className="mt-6">
            <div className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
              <CheckCircle2 size={16} className="text-emerald-400" />
              <span className="text-xs font-semibold text-emerald-400">
                Conectado {googleEmail ? `· ${googleEmail}` : ""}
              </span>
            </div>
            <button
              onClick={disconnect}
              disabled={loading}
              className="mt-4 text-xs font-semibold text-white/40 hover:text-white disabled:opacity-50"
            >
              Desconectar
            </button>
          </div>
        ) : (
          <button
            onClick={connect}
            disabled={loading}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold text-white transition-transform hover:scale-[1.01] disabled:opacity-60"
            style={{ background: "linear-gradient(90deg,#00C8FF,#6D2EFF,#FF2DB8)" }}
          >
            {loading ? "Conectando..." : "Conectar con Google"}
          </button>
        )}

        {error && <p className="mt-3 text-xs text-red-400">{error}</p>}

        <p className="mt-6 text-[11px] text-white/30">
          Solo usamos esto para crear tus citas en tu calendario — nunca leemos ni modificamos el resto de tu Google
          Calendar.
        </p>
      </div>
    </div>
  );
}
