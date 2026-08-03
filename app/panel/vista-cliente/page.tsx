import Link from "next/link";
import { redirect } from "next/navigation";
import { Smartphone, ArrowRight } from "lucide-react";
import { getCurrentTrainer } from "@/lib/trainer-auth";
import { TrainerShell } from "@/components/trainer/trainer-shell";
import { getOwnClients } from "@/lib/trainer-clients-actions";

// Ya no es un placeholder "Próximamente": cada cliente entra con su propia
// cuenta real (documento + contraseña, ver lib/client-auth.ts) desde
// /landing/[subdominio]/ingresar — el botón "Ingresar" de tu página. Esta
// pantalla explica el flujo y enlaza directo a la ficha de cada cliente,
// donde se ve si ya activó su cuenta (bloque de estado en
// trainer-client-detail.tsx).
export default async function TrainerVistaClientePage() {
  const trainer = await getCurrentTrainer();
  if (!trainer) redirect("/panel/login");

  const clients = await getOwnClients();
  const activados = clients.filter((c) => c.user_id).length;

  return (
    <TrainerShell active="vista-cliente" trainer={trainer}>
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-hf-blue/10 text-hf-blue">
            <Smartphone size={20} />
          </span>
          <div>
            <h1 className="text-xl font-bold text-white">Cuenta de tus clientes</h1>
            <p className="text-sm text-white/50">
              Cada cliente tiene su propia cuenta, con documento y contraseña, para ver su progreso.
            </p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <p className="text-sm text-white/70">Desde su cuenta, cada cliente puede:</p>
          <ul className="mt-3 space-y-2 text-sm text-white/60">
            <li>• Ver y editar su perfil (nombre, WhatsApp, foto) y su hoja de vida (nivel, objetivo, peso, etc.).</li>
            <li>• Ver la rutina que le asignaste, día por día — no la puede cambiar, solo verla.</li>
            <li>• Ver su próxima cita y unirse por Google Meet si es virtual.</li>
            <li>• Aprobar o rechazar (y reagendar) las sesiones que le propongas.</li>
            <li>• Ver su evolución de peso y subir sus propias fotos de avance.</li>
          </ul>
          <p className="mt-3 text-xs text-white/35">
            Entra desde tu propia página con el botón "Ingresar", escribiendo su número de documento. La primera vez
            recibe un código a su correo para crear su contraseña — necesita tener documento y correo en su ficha.
          </p>
        </div>

        <div className="mt-6">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/40">Tus clientes</p>
            {clients.length > 0 && (
              <p className="text-xs text-white/40">
                {activados} de {clients.length} ya activaron su cuenta
              </p>
            )}
          </div>
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
                    {c.user_id ? "Cuenta activa" : !c.documento ? "Falta documento" : "Falta activar"}
                    <ArrowRight size={13} />
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
