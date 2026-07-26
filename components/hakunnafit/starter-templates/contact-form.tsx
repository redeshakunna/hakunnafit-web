"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { whatsappHref } from "./types";

// Formulario de contacto compartido por las 3 plantillas Starter. No guarda
// nada en base de datos (evita construir todo un backend de leads por
// entrenador) — simplemente arma un mensaje de WhatsApp prellenado con lo que
// la persona escribió y abre wa.me, igual que el patrón que ya usa el panel
// admin para compartir el link del formulario. Cada plantilla le pasa sus
// propias clases para que se vea distinta (oscura, clara o degradada).
export function WhatsappContactForm({
  whatsapp,
  theme = "dark",
}: {
  whatsapp: string | null;
  theme?: "dark" | "light" | "glass";
}) {
  const [nombre, setNombre] = useState("");
  const [objetivo, setObjetivo] = useState("");

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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const message = `Hola, soy ${nombre || "un posible cliente"}.${
      objetivo ? ` Mi objetivo es: ${objetivo}.` : ""
    } Vi tu página y quiero más información.`;
    const href = whatsappHref(whatsapp, message);
    if (href) window.open(href, "_blank", "noopener,noreferrer");
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
          value={objetivo}
          onChange={(e) => setObjetivo(e.target.value)}
          placeholder="¿Cuál es tu objetivo?"
          className={`h-11 flex-1 rounded-xl border px-4 text-sm focus:outline-none ${t.input}`}
        />
      </div>
      <button
        type="submit"
        className={`flex h-12 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-transform hover:scale-[1.01] ${t.button}`}
        style={t.buttonStyle}
      >
        <Send size={15} />
        Quiero comenzar
      </button>
    </form>
  );
}
