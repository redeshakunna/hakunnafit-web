"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Loader2, LogOut, ShieldAlert } from "lucide-react";
import { getOwnAccessStatus, type OwnAccessStatus } from "@/lib/subscription-lifecycle";
import { logoutTrainer } from "@/lib/trainer-auth";
import { formatCop } from "@/lib/currency";

/**
 * Pantalla de bloqueo total del panel — reemplaza sidebar + contenido
 * cuando isBlockedTrainer(trainer) es true (ver trainer-shell.tsx). Cubre
 * dos causas, con mensajes distintos:
 * - "bloqueado" (automático, por impago): monto atrasado + fecha de
 *   vencimiento + botón "Pagar ahora" con el link de Wompi.
 * - "suspendido" (manual, palanca de Nando): mensaje genérico para que
 *   contacten a soporte, sin monto ni link (puede no ser por dinero).
 */
export function TrainerAccessLocked() {
  const router = useRouter();
  const [status, setStatus] = useState<OwnAccessStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    getOwnAccessStatus()
      .then(setStatus)
      .finally(() => setLoading(false));
  }, []);

  const esImpago = status?.reason === "impago";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-hf-black px-6 py-10 text-white">
      <div style={{ width: 160 }} className="mb-8">
        <Image
          src="/images/LogoHorizontal-trasnparente.png"
          alt="HakunnaFit"
          width={1728}
          height={910}
          className="h-auto w-full"
          priority
        />
      </div>

      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center">
        {loading ? (
          <div className="flex flex-col items-center gap-3 py-6 text-white/50">
            <Loader2 size={28} className="animate-spin" />
            <p className="text-sm">Cargando el estado de tu cuenta…</p>
          </div>
        ) : esImpago ? (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10">
              <AlertTriangle size={26} className="text-red-400" />
            </div>
            <h1 className="text-lg font-bold text-white">Tu cuenta está atrasada</h1>
            <p className="mt-2 text-sm text-white/60">
              Tu panel quedó bloqueado por falta de pago. Paga ahora para recuperar el acceso de inmediato.
            </p>

            <div className="mt-5 rounded-2xl border border-white/10 bg-black/30 p-4 text-left">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/50">Monto pendiente</span>
                <span className="font-bold text-white">{status?.amountCop != null ? formatCop(status.amountCop) : "—"}</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-sm">
                <span className="text-white/50">Vencía el</span>
                <span className="font-semibold text-white/80">{status?.dueDate ?? "—"}</span>
              </div>
            </div>

            {status?.paymentUrl ? (
              <a
                href={status.paymentUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-6 block w-full rounded-full bg-gradient-to-r from-[#00C8FF] to-[#6D2EFF] px-4 py-3 text-sm font-bold text-white shadow-lg"
              >
                Pagar ahora
              </a>
            ) : (
              <p className="mt-6 text-xs text-white/40">
                No pudimos generar tu link de pago automáticamente. Escríbenos por WhatsApp y te ayudamos.
              </p>
            )}
          </>
        ) : (
          <>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
              <ShieldAlert size={26} className="text-white/70" />
            </div>
            <h1 className="text-lg font-bold text-white">Tu cuenta está suspendida</h1>
            <p className="mt-2 text-sm text-white/60">
              El equipo de HakunnaFit suspendió temporalmente el acceso a tu panel. Contáctanos para más información.
            </p>
          </>
        )}

        <button
          disabled={loggingOut}
          onClick={async () => {
            setLoggingOut(true);
            await logoutTrainer();
            router.push("/panel/login");
            router.refresh();
          }}
          className="mt-6 flex w-full items-center justify-center gap-1.5 rounded-full border border-white/15 px-3 py-2 text-xs font-semibold text-white/60 hover:border-white/30 hover:text-white"
        >
          <LogOut size={13} />
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
