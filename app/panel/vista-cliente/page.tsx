import Link from "next/link";
import { redirect } from "next/navigation";
import { Smartphone, ArrowRight } from "lucide-react";
import { getCurrentTrainer } from "@/lib/trainer-auth";
import { TrainerShell } from "@/components/trainer/trainer-shell";
import { getOwnClients } from "@/lib/trainer-clients-actions";

// Ya no es un placeholder "Próximamente": cada cliente tiene su propio
// portal en /mi-progreso/[token] (ver lib/client-portal-actions.ts) — link
// permanente y sin login para ver su hoja de vida, su rutina, aprobar su
// agenda y subir fotos de avance. Esta pantalla explica el portal y enlaza
// directo a la ficha de cada cliente, que es donde se copia/comparte su link
// (bloque "Portal de [nombre]" en trainer-client-detail.tsx).
export default async function TrainerVistaClientePage() {
  const trainer = await getCurrentTrainer();
  if (!trainer) redirect("/panel/login");

  const clients = await getOwnClients();

  return (
    <TrainerShell active="vista-cliente" trainer={trainer}>
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-hf-blue/10 text-hf-blue">
            <Smartphone size={20} />
          </span>
          <div>
            <h1 className="text-xl font-bold text-white">Portal de tus clientes</h1>
            <p className="text-sm text-white/50">
              Cada cliente tiene su propio link permanente, sin contraseña, para ver su progreso.
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-sm text-white/70">Desde su portal, cada cliente puede:</p>
          <ul className="mt-3 space-y-2 text-sm text-white/60">
            <li>• Ver su hoja de vida (datos, nivel, objetivo, perfil deportivo).</li>
            <li>• Ver la rutina que le asignaste, día por día.</li>
            <li>• Ver su próxima cita y unirse por Google Meet si es virtual.</li>
            <li>• Aprobar o rechazar (y reagendar) las sesiones que le propongas.</li>
            <li>• Ver su evolución de peso y subir sus propias fotos de avance.</li>
          </ul>
          <p className="mt-3 text-xs text-white/35">
            No necesita crear cuenta ni recordar contraseña — el link en sí es su acceso. Cópialo o mándaselo por
            WhatsApp desde la ficha de cada cliente.
          </p>
        </div>

        <div className="mt-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/40">Tus clientes</p>
          {clients.length === 0 ? (
            <p className="mt-2 text-sm text-white/40">Todavía no tienes clientes registrados.</p>
          ) : (
            <div className="mt-3 space-y-2">
              {clients.map((c) => (
                <Link
                  key={c.id}
                  href={`/panel/clientes/${c.id}`}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm hover:border-white/25"
                >
                  <span className="font-medium text-white">{c.full_name}</span>
                  <span className="flex items-center gap-1 text-xs font-semibold text-hf-blue">
                    Ver su ficha y su link <ArrowRight size={13} />
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </TrainerShell>
  );
}
