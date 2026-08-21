"use client";

// Selector de cliente compartido — reemplaza el <select> plano de HTML que
// vivía duplicado en Nutrición y Entrenamientos (mismo bloque exacto en los
// dos archivos). Pedido explícito de Nando con captura de pantalla: algo
// "más dinámico" que un dropdown nativo. Estilo elegido: buscador + tarjetas
// (avatar/iniciales + nombre + estado), reusando initials()/avatarColor()/
// STATUS_META que ya existen en lib/client-ui.ts y ya se usan igual en las
// tarjetas de la lista principal de Clientes — nada nuevo que mantener.
//
// Aplica también a la lista principal de Clientes y a Agenda por alcance
// explícito de Nando, pero ahí el patrón de selección es distinto (no es un
// <select> de un cliente a la vez) — este componente es específicamente
// para "elegir UN cliente de una lista", el caso de Nutrición/Entrenamientos.

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import type { ClientRow } from "@/lib/trainer-clients-actions";
import { STATUS_META, initials, avatarColor } from "@/lib/client-ui";

export function ClientPicker({
  clients,
  selectedClientId,
  onSelect,
}: {
  clients: ClientRow[];
  selectedClientId: string;
  onSelect: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = clients.find((c) => c.id === selectedClientId) ?? null;
  const filtered = clients.filter((c) => c.full_name.toLowerCase().includes(query.trim().toLowerCase()));

  useEffect(() => {
    function onClickAway(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickAway);
    document.addEventListener("keydown", onEscape);
    return () => {
      document.removeEventListener("mousedown", onClickAway);
      document.removeEventListener("keydown", onEscape);
    };
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 hover:border-white/20"
      >
        <span className="text-xs text-white/40">Cliente</span>
        {selected ? (
          <span className="flex items-center gap-1.5">
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold ${avatarColor(selected.id)}`}
            >
              {initials(selected.full_name)}
            </span>
            <span className="text-sm font-medium text-white">{selected.full_name}</span>
          </span>
        ) : (
          <span className="text-sm font-medium text-white/40">Selecciona un cliente</span>
        )}
        <ChevronDown size={14} className={`text-white/40 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-30 mt-2 w-72 rounded-2xl border border-white/10 bg-[#0a0d16] p-2 shadow-2xl shadow-black/50">
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
            <Search size={13} className="shrink-0 text-white/30" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar cliente..."
              className="w-full bg-transparent text-xs text-white outline-none placeholder:text-white/30"
            />
          </div>

          <div className="mt-2 max-h-72 space-y-1 overflow-y-auto">
            {filtered.length === 0 && <p className="px-2 py-3 text-center text-xs text-white/30">Sin resultados.</p>}
            {filtered.map((c) => {
              const meta = STATUS_META[c.status];
              const isSelected = c.id === selectedClientId;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    onSelect(c.id);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors ${
                    isSelected ? "bg-white/10" : "hover:bg-white/5"
                  }`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${avatarColor(c.id)}`}
                  >
                    {initials(c.full_name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold text-white">{c.full_name}</span>
                  </span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-semibold ${meta.className}`}>
                    {meta.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
