"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, Send, X } from "lucide-react";
import { useLeadModal } from "./lead-modal-context";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const GREETING: ChatMessage = {
  role: "assistant",
  content:
    "¡Hola! 👋 Soy el asistente de HakunnaFit. Puedo contarte sobre nuestros planes, funciones o cómo empezar. ¿En qué te ayudo?",
};

export function HakunnaFitChatWidget() {
  const pathname = usePathname();
  const { openModal } = useLeadModal();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Este es el asistente de IA del sitio de marketing de HakunnaFit — no
  // tiene sentido en la página propia de un entrenador (<subdominio>.hakunnafit.com),
  // ahí en su lugar se muestra el WhatsappChatWidget con el WhatsApp del
  // propio entrenador (ver app/landing/[subdominio]/page.tsx).
  const isTrainerLanding = pathname?.startsWith("/landing/");

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, open]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const next = [...messages, { role: "user" as const, content: trimmed }];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: next }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessages((m) => [
          ...m,
          {
            role: "assistant",
            content: data.error ?? "Algo salió mal. Intenta de nuevo en un momento.",
          },
        ]);
        return;
      }

      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: "No pude conectarme. Revisa tu internet e intenta de nuevo." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  if (isTrainerLanding) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[90] sm:bottom-6 sm:right-6">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="mb-4 flex h-[70vh] max-h-[560px] w-[92vw] max-w-[380px] flex-col overflow-hidden rounded-[1.75rem] border border-white/10 bg-[#0b0f1a] shadow-2xl"
          >
            <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
              <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-white/5">
                <Image
                  src="/images/SoloMascota-Transparente.png"
                  alt=""
                  fill
                  className="object-contain"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-[family-name:var(--font-hf-heading)] text-sm font-bold text-white">
                  Asistente HakunnaFit
                </p>
                <p className="flex items-center gap-1.5 text-[11px] text-white/50">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  En línea
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar chat"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/50 transition-colors hover:bg-white/5 hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-[13px] leading-relaxed ${
                      m.role === "user"
                        ? "rounded-br-sm text-white"
                        : "rounded-bl-sm border border-white/10 bg-white/5 text-white/85"
                    }`}
                    style={
                      m.role === "user"
                        ? { background: "linear-gradient(90deg,#00C8FF,#6D2EFF,#FF2DB8)" }
                        : undefined
                    }
                  >
                    {m.content}
                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-sm border border-white/10 bg-white/5 px-4 py-3">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="h-1.5 w-1.5 rounded-full bg-white/50"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {!loading && messages.length <= 2 && (
                <button
                  type="button"
                  onClick={() => openModal()}
                  className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold text-white/80 transition-colors hover:border-hf-blue/40 hover:text-white"
                >
                  Quiero mi demo →
                </button>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage(input);
              }}
              className="flex items-center gap-2 border-t border-white/10 p-3"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Escribe tu pregunta..."
                disabled={loading}
                className="h-11 flex-1 rounded-full border border-white/15 bg-white/5 px-4 text-sm text-white placeholder:text-white/30 focus:border-hf-blue focus:outline-none disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                aria-label="Enviar"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white transition-transform hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
                style={{ background: "linear-gradient(90deg,#00C8FF,#6D2EFF,#FF2DB8)" }}
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
        aria-label={open ? "Cerrar chat" : "Abrir chat de ayuda"}
        whileTap={{ scale: 0.94 }}
        className="relative flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg"
        style={{ background: "linear-gradient(135deg,#00C8FF,#6D2EFF,#FF2DB8)" }}
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
              <MessageCircle size={22} />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>
    </div>
  );
}
