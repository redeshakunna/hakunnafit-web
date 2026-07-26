import { redirect } from "next/navigation";
import { Settings } from "lucide-react";
import { getCurrentTrainer } from "@/lib/trainer-auth";
import { TrainerShell } from "@/components/trainer/trainer-shell";
import { TrainerComingSoon } from "@/components/trainer/trainer-coming-soon";

export default async function TrainerConfiguracionPage() {
  const trainer = await getCurrentTrainer();
  if (!trainer) redirect("/panel/login");

  return (
    <TrainerShell active="configuracion" trainer={trainer}>
      <TrainerComingSoon
        trainer={trainer}
        feature={null}
        icon={Settings}
        title="Configuración"
        description="Tu perfil, seguridad, notificaciones, idioma, zona horaria e integraciones. Disponible para todos los planes."
      />
    </TrainerShell>
  );
}
