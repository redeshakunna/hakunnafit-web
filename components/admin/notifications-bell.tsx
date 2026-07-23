"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, Inbox, UserCheck, RefreshCcw, Clock3 } from "lucide-react";
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type NotificationRow,
} from "@/lib/notifications";

const POLL_MS = 45_000;

const typeIcon: Record<NotificationRow["type"], React.ElementType> = {
  lead_nuevo: Inbox,
  entrenador_aprobado: UserCheck,
  estado_cambio: RefreshCcw,
  cobro_por_vencer: Clock3,
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

export function NotificationsBell() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const refresh = () => {
    listNotifications().then((res) => {
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

  const handleItemClick = (n: NotificationRow) => {
    startTransition(async () => {
      if (!n.read) await markNotificationRead(n.id);
      refresh();
    });
    setOpen(false);
    if (n.link) router.push(n.link);
  };

  const handleMarkAll = () => {
    startTransition(async () => {
      await markAllNotificationsRead();
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
              const Icon = typeIcon[n.type] ?? Bell;
              return (
                <button
                  key={n.id}
                  onClick={() => handleItemClick(n)}
                  className={`flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2.5 text-left transition-colors hover:bg-white/5 ${
                    n.read ? "" : "bg-white/[0.03]"
                  }`}
                >
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/5 text-white/60">
                    <Icon size={14} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-xs font-semibold text-white">{n.title}</span>
                      {!n.read && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-hf-fuchsia" />}
                    </span>
                    <span className="mt-0.5 block text-[11px] leading-snug text-white/50 line-clamp-2">
                      {n.message}
                    </span>
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
