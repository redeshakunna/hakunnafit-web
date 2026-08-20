"use client";

// Campanita del panel del entrenador — mismo trainer_activity que ya
// alimentaba el feed "Actividad reciente" del Dashboard, ahora con el
// estado leída/no leída (columna `leida`, Fase 1 del roadmap). Antes esta
// campanita solo existía en /panel-hakunna (el panel de Nando); esta es la
// versión que ve cada entrenador sobre su propia cuenta.

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, UserPlus, RefreshCcw, AlertTriangle, CheckCircle2, Info, Wallet } from "lucide-react";
import {
  getOwnActivityInbox,
  markOwnActivityRead,
  markAllOwnActivityRead,
  type OwnActivityRow,
} from "@/lib/trainer-actions";

const POLL_MS = 45_000;

const TYPE_ICON: Record<string, React.ElementType> = {
  cliente_creado: UserPlus,
  estado_cambiado: RefreshCcw,
  suspendido: AlertTriangle,
  reactivado: CheckCircle2,
  informacion_actualizada: Info,
  cobro_cliente_proximo: Wallet,
  comprobante_pago_cliente: Wallet,
};

const TYPE_LINK: Record<string, string> = {
  cliente_creado: "/panel/clientes",
};

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "ahora mismo";
  if (min < 60) return `hace ${min} min`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `hace ${hrs} h`;
  const days = Math.floor(hrs / 24);
  return `hace ${days} d`;
}

export function TrainerNotificationsBell() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<OwnActivityRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const refresh = () => {
    getOwnActivityInbox().then((res) => {
      setItems(res.items);
      setUnreadCount(res.unreadCount);
    });
  };

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, POLL_MS);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  const handleItemClick = (n: OwnActivityRow) => {
    startTransition(async () => {
      if (!n.leida) await markOwnActivityRead(n.id);
      refresh();
    });
    setOpen(false);
    const link = n.link ?? TYPE_LINK[n.type];
    if (!link) return;
    // Los recordatorios de cobro a clientes traen un link externo de
    // WhatsApp (wa.me) listo para mandar — no es una ruta interna, así que
    // no puede ir por router.push (eso es solo para navegación dentro de la
    // app). Todo lo demás sigue siendo un link interno normal.
    if (/^https?:\/\//.test(link)) {
      window.open(link, "_blank", "noopener,noreferrer");
    } else {
      router.push(link);
    }
  };

  const handleMarkAll = () => {
    startTransition(async () => {
      await markAllOwnActivityRead();
      refresh();
    });
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative text-white/50 hover:text-white"
        aria-label="Notificaciones"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-hf-fuchsia px-1 text-[9px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-2xl border border-white/10 bg-[#0b0f1a] p-2 shadow-xl">
          <div className="flex items-center justify-between px-2 py-1.5">
            <p className="text-xs font-semibold text-white/70">Notificaciones</p>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAll}
                disabled={isPending}
                className="text-[11px] font-semibold text-hf-blue hover:text-white disabled:opacity-50"
              >
                Marcar todas como leídas
              </button>
            )}
          </div>

          <div className="mt-1 max-h-80 space-y-1 overflow-y-auto">
            {items.length === 0 && (
              <p className="px-2 py-6 text-center text-xs text-white/40">Sin notificaciones por ahora.</p>
            )}
            {items.map((n) => {
              const Icon = TYPE_ICON[n.type] ?? Bell;
              return (
                <button
                  key={n.id}
                  onClick={() => handleItemClick(n)}
                  className={`flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2.5 text-left transition-colors hover:bg-white/5 ${
                    n.leida ? "" : "bg-white/[0.03]"
                  }`}
                >
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/5 text-white/60">
                    <Icon size={14} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-xs font-semibold text-white">{n.title}</span>
                      {!n.leida && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-hf-fuchsia" />}
                    </span>
                    {n.description && (
                      <span className="mt-0.5 block text-[11px] leading-snug text-white/50 line-clamp-2">
                        {n.description}
                      </span>
                    )}
                    <span className="mt-0.5 block text-[10px] text-white/30">{timeAgo(n.created_at)}</span>
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
