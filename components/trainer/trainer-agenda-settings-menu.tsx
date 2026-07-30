"use client";

// Menú "..." de la Agenda — agrupa lo que no es uso diario (conectar/
// desconectar Google del entrenador, generar/enviar el link para que cada
// cliente conecte el suyo) para que la vista principal quede tan limpia como
// el diseño de referencia, en vez de mostrar siempre el banner de Google.

import { useEffect, useRef, useState } from "react";
import { MoreHorizontal, CalendarCheck2, Link2, Copy, MessageCircle } from "lucide-react";
import type { ClientRow } from "@/lib/trainer-clients-actions";
import { beginTrainerGoogleConnect, disconnectOwnGoogleCalendar, generateClientCalendarConnectLink } from "@/lib/calendar-connections-actions";

export function TrainerAgendaSettingsMenu({
  clients,
  googleConfigured,
  googleConnected,
  googleEmail,
}: {
  clients: ClientRow[];
  googleConfigured: boolean;
  googleConnected: boolean;
  googleEmail: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"menu" | "clientLinks">("menu");
  const [connected, setConnected] = useState(googleConnected);
  const [email, setEmail] = useState(googleEmail);
  const [links, setLinks] = useState<Record<string, string>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setView("menu");
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

  async function generateLink(clientId: string) {
    setLoadingId(clientId);
    const res = await generateClientCalendarConnectLink(clientId);
    setLoadingId(null);
    if (res.ok && res.url) setLinks((prev) => ({ ...prev, [clientId]: res.url! }));
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
          {view === "menu" ? (
            <>
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

              {googleConfigured && (
                <button
                  onClick={() => setView("clientLinks")}
                  className="mt-3 flex w-full items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-semibold text-white/70 hover:border-white/30 hover:text-white"
                >
                  <Link2 size={13} /> Conectar el Google de un cliente
                </button>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-white">Conectar Google de un cliente</p>
                <button onClick={() => setView("menu")} className="text-[11px] text-white/40 hover:text-white">
                  Volver
                </button>
              </div>
              <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
                {clients.map((c) => (
                  <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/[0.03] px-3 py-2">
                    <span className="text-xs font-medium text-white/80">{c.full_name}</span>
                    {links[c.id] ? (
                      <div className="flex items-center gap-1.5">
                        {c.whatsapp && (
                          <a
                            href={`https://wa.me/${c.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(
                              `Hola ${c.full_name}! Conecta tu Google Calendar aquí para recibir tus citas: ${links[c.id]}`
                            )}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-emerald-400 hover:text-emerald-300"
                            title="Enviar por WhatsApp"
                          >
                            <MessageCircle size={14} />
                          </a>
                        )}
                        <button
                          onClick={() => navigator.clipboard.writeText(links[c.id])}
                          className="text-white/50 hover:text-white"
                          title="Copiar link"
                        >
                          <Copy size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => generateLink(c.id)}
                        disabled={loadingId === c.id}
                        className="text-[11px] font-semibold text-hf-blue hover:underline disabled:opacity-50"
                      >
                        {loadingId === c.id ? "..." : "Generar link"}
                      </button>
                    )}
                  </div>
                ))}
                {clients.length === 0 && <p className="text-xs text-white/40">Aún no tienes clientes.</p>}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
