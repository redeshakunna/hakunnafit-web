"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { Send, X } from "lucide-react";
import { heroWhatsappMessage, whatsappHref } from "./types";

// Ícono de WhatsApp (trazo oficial simplificado) — lucide-react no trae uno
// propio, así que se dibuja a mano para que el widget se reconozca de
// inmediato como "esto abre WhatsApp" y no se confunda con el asistente de
// IA de HakunnaFit.
function WhatsAppIcon({ size = 26 }: { size?: number }) {
  return (
    <svg viewBox="0 0 32 32" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M16.02 2.67C8.7 2.67 2.75 8.6 2.75 15.9c0 2.45.66 4.75 1.8 6.73L2.67 29.33l6.9-1.8a13.15 13.15 0 0 0 6.45 1.7h.01c7.32 0 13.27-5.93 13.27-13.23 0-3.53-1.38-6.86-3.88-9.36a13.2 13.2 0 0 0-9.4-3.97Zm0 24.2h-.01a11 11 0 0 1-5.6-1.54l-.4-.24-4.1 1.07 1.1-3.98-.26-.41a10.9 10.9 0 0 1-1.68-5.85c0-6.05 4.93-10.97 11-10.97 2.94 0 5.7 1.14 7.78 3.22a10.9 10.9 0 0 1 3.22 7.77c0 6.05-4.93 10.93-11.05 10.93Zm6.03-8.2c-.33-.17-1.96-.96-2.26-1.07-.3-.11-.53-.17-.75.17-.22.33-.86 1.07-1.06 1.3-.2.22-.39.25-.72.08-.33-.17-1.4-.51-2.67-1.63-.99-.88-1.65-1.96-1.85-2.3-.19-.33-.02-.51.15-.68.15-.15.33-.39.5-.58.16-.2.22-.33.33-.55.11-.22.06-.42-.03-.58-.08-.17-.75-1.8-1.03-2.46-.27-.65-.55-.56-.75-.57l-.64-.01c-.22 0-.58.08-.88.42-.3.33-1.15 1.12-1.15 2.74s1.18 3.18 1.34 3.4c.17.22 2.32 3.55 5.63 4.98.79.34 1.4.54 1.88.7.79.25 1.5.21 2.07.13.63-.1 1.96-.8 2.24-1.57.28-.78.28-1.44.2-1.58-.08-.14-.3-.22-.63-.39Z" />
    </svg>
  );
}

export function WhatsappChatWidget({
  whatsapp,
  businessName,
  avatarUrl,
}: {
  whatsapp: string | null;
  businessName: string;
  avatarUrl?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [mensaje, setMensaje] = useState(() => heroWhatsappMessage(businessName));
  const href = whatsappHref(whatsapp, mensaje || heroWhatsappMessage(businessName));

  if (!whatsapp || !href) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[90] sm:bottom-6 sm:right-6">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="mb-4 flex w-[92vw] max-w-[340px] flex-col overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#0b0f1a] shadow-2xl"
          >
            <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4" style={{ background: "linear-gradient(90deg,#128C7E,#25D366)" }}>
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/30 bg-white/10">
                {avatarUrl ? (
                  <Image src={avatarUrl} alt={businessName} fill sizes="40px" className="object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm font-bold text-white">
                    {businessName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-[family-name:var(--font-hf-heading)] text-sm font-bold text-white">
                  {businessName}
                </p>
                <p className="flex items-center gap-1.5 text-[11px] text-white/85">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                  Normalmente responde por WhatsApp
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar chat"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/85 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 px-4 py-4">
              <div className="max-w-[90%] rounded-2xl rounded-bl-sm border border-white/10 bg-white/5 px-4 py-2.5 text-[13px] leading-relaxed text-white/85">
                ¡Hola! 👋 Escríbeme y te respondo directo por WhatsApp.
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                window.open(href, "_blank", "noopener,noreferrer");
              }}
              className="flex items-center gap-2 border-t border-white/10 p-3"
            >
              <input
                value={mensaje}
                onChange={(e) => setMensaje(e.target.value)}
                placeholder="Escribe tu mensaje..."
                className="h-11 flex-1 rounded-full border border-white/15 bg-white/5 px-4 text-sm text-white placeholder:text-white/30 focus:border-emerald-400 focus:outline-none"
              />
              <button
                type="submit"
                aria-label="Enviar por WhatsApp"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white transition-transform hover:scale-105"
                style={{ background: "linear-gradient(90deg,#128C7E,#25D366)" }}
              >
                <Send size={16} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Cerrar chat de WhatsApp" : "Escribir por WhatsApp"}
        whileTap={{ scale: 0.94 }}
        className="relative flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg"
        style={{ background: "linear-gradient(135deg,#128C7E,#25D366)" }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {open ? (
            <motion.span
              key="close"
              initial={{ opacity: 0, rotate: -45 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: 45 }}
              transition={{ duration: 0.15 }}
            >
              <X size={22} />
            </motion.span>
          ) : (
            <motion.span
              key="chat"
              initial={{ opacity: 0, rotate: 45 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0, rotate: -45 }}
              transition={{ duration: 0.15 }}
            >
              <WhatsAppIcon size={26} />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
