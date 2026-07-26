"use client";

import { useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { whatsappHref } from "./types";
import { submitPublicClientIntake } from "@/lib/public-client-actions";

// Formulario de contacto compartido por las 3 plantillas Starter. Guarda un
// registro ligero en clients (vía submitPublicClientIntake — el mismo
// server action que usa el formulario completo de /registro, solo que aquí
// se manda un subconjunto de campos) y ADEMÁS sigue abriendo WhatsApp con un
// mensaje prellenado, igual que antes. Así el entrenador no pierde el
// contacto humano inmediato por WhatsApp, pero tampoco tiene que dar de alta
// al cliente a mano después — ya queda la fila en su lista de Clientes
// esperando evaluación. Cada plantilla le pasa sus propias clases para que
// se vea distinta (oscura, clara o degradada).
export function WhatsappContactForm({
  whatsapp,
  subdominio,
  theme = "dark",
}: {
  whatsapp: string | null;
  subdominio: string;
  theme?: "dark" | "light" | "glass";
}) {
  const [nombre, setNombre] = useState("");
  const [tuWhatsapp, setTuWhatsapp] = useState("");
  const [objetivo, setObjetivo] = useState("");
  const [sending, setSending] = useState(false);

  const themes = {
    dark: {
      input: "border-white/15 bg-white/5 text-white placeholder:text-white/30 focus:border-hf-blue",
      button: "text-white",
      buttonStyle: { background: "linear-gradient(90deg,#00C8FF,#6D2EFF,#FF2DB8)" },
    },
    light: {
      input: "border-gray-200 bg-white text-gray-900 placeholder:text-gray-400 focus:border-gray-900",
      button: "bg-gray-900 text-white",
      buttonStyle: undefined,
    },
    glass: {
      input: "border-white/30 bg-white/10 text-white placeholder:text-white/50 focus:border-white",
      button: "bg-white text-gray-900",
      buttonStyle: undefined,
    },
  } as const;
  const t = themes[theme];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Abre WhatsApp de inmediato (no lo bloquea la escritura a la base de
    // datos) — los navegadores solo dejan abrir una pestaña nueva como
    // respuesta directa al click, así que si se espera al await esto se
    // trata como popup y se bloquea.
    const message = `Hola, soy ${nombre || "un posible cliente"}.${
      objetivo ? ` Mi objetivo es: ${objetivo}.` : ""
    } Vi tu página y quiero más información.`;
    const href = whatsappHref(whatsapp, message);
    if (href) window.open(href, "_blank", "noopener,noreferrer");

    if (nombre.trim() && tuWhatsapp.trim()) {
      setSending(true);
      await submitPublicClientIntake({
        subdominio,
        fullName: nombre,
        whatsapp: tuWhatsapp,
        objetivo: objetivo || null,
      }).catch(() => {});
      setSending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Tu nombre"
          className={`h-11 flex-1 rounded-xl border px-4 text-sm focus:outline-none ${t.input}`}
        />
        <input
          value={tuWhatsapp}
          onChange={(e) => setTuWhatsapp(e.target.value)}
          placeholder="Tu WhatsApp"
          className={`h-11 flex-1 rounded-xl border px-4 text-sm focus:outline-none ${t.input}`}
        />
      </div>
      <input
        value={objetivo}
        onChange={(e) => setObjetivo(e.target.value)}
        placeholder="¿Cuál es tu objetivo?"
        className={`h-11 w-full rounded-xl border px-4 text-sm focus:outline-none ${t.input}`}
      />
      <button
        type="submit"
        disabled={sending}
        className={`flex h-12 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-transform hover:scale-[1.01] disabled:opacity-70 ${t.button}`}
        style={t.buttonStyle}
      >
        {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
        Quiero comenzar
      </button>
    </form>
  );
}
