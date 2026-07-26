import { redirect } from "next/navigation";
import { Smartphone } from "lucide-react";
import { getCurrentTrainer } from "@/lib/trainer-auth";
import { TrainerShell } from "@/components/trainer/trainer-shell";
import { TrainerComingSoon } from "@/components/trainer/trainer-coming-soon";

export default async function TrainerVistaClientePage() {
  const trainer = await getCurrentTrainer();
  if (!trainer) redirect("/panel/login");

  return (
    <TrainerShell active="vista-cliente" trainer={trainer}>
      <TrainerComingSoon
        trainer={trainer}
        feature="App Cliente"
        icon={Smartphone}
        title="Vista del Cliente"
        description="Simula la app de tus clientes: su rutina del día, nutrición, progreso, chat, perfil y calendario, sin iniciar sesión como ellos."
      />
    </TrainerShell>
  );
}
