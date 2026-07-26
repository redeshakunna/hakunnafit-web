import Link from "next/link";
import { Palette, Image as ImageIcon, Dumbbell, Clock, CheckCircle2 } from "lucide-react";
import type { TrainerRow } from "@/lib/admin-actions";
import { canEditLanding } from "@/lib/admin-helpers";
import { planLabel, landingStatusLabel, type LandingStatusKey } from "@/lib/catalog";

export function TrainerDashboardHome({ trainer }: { trainer: TrainerRow }) {
  const unlocked = canEditLanding(trainer);
  const isStarter = trainer.plan === "starter";

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-xl font-bold text-white">Hola, {trainer.business_name}</h1>
      <p className="mt-1 text-sm text-white/50">
        Plan {planLabel(trainer.plan)} · Landing {landingStatusLabel(trainer.landing_status as LandingStatusKey)}
      </p>

      {!unlocked && (
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
          <Clock size={18} className="mt-0.5 shrink-0 text-amber-400" />
          <div>
            <p className="text-sm font-semibold text-amber-400">Tu landing está en diseño</p>
            <p className="mt-1 text-xs text-white/60">
              Nuestro equipo está diseñando tu landing a la medida. En cuanto quede publicada vas a poder editar
              textos, fotos, logo y colores desde aquí.
            </p>
          </div>
        </div>
      )}

      {unlocked && (
        <div className="mt-6 flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2.5 text-xs font-semibold text-emerald-400">
          <CheckCircle2 size={14} /> Tu landing está publicada
          {trainer.subdominio ? ` en ${trainer.subdominio}.hakunnafit.com` : ""}
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <PanelCard
          href="/panel/contenido"
          icon={Dumbbell}
          title="Textos y servicios"
          description="Tu biografía, frase principal y los servicios que ofreces."
          disabled={!unlocked}
        />
        <PanelCard
          href="/panel/fotos"
          icon={ImageIcon}
          title="Fotos y logo"
          description="Tu foto de perfil, fotos de la landing y tu logo."
          disabled={!unlocked}
        />
        <PanelCard
          href="/panel/colores"
          icon={Palette}
          title="Colores"
          description="Elige la paleta de 3 colores de tu landing."
          disabled={!unlocked}
        />
      </div>

      {!isStarter && (
        <p className="mt-8 text-xs text-white/40">
          ¿Tienes dudas sobre el diseño de tu landing? Escríbenos directamente — el diseño estructural lo maneja
          siempre el equipo de Hakunna Fit.
        </p>
      )}
    </div>
  );
}

function PanelCard({
  href,
  icon: Icon,
  title,
  description,
  disabled,
}: {
  href: string;
  icon: React.ElementType;
  title: string;
  description: string;
  disabled?: boolean;
}) {
  const content = (
    <div
      className={`h-full rounded-2xl border p-5 transition-colors ${
        disabled
          ? "border-white/5 bg-white/[0.02] opacity-50"
          : "border-white/10 bg-white/[0.03] hover:border-white/20"
      }`}
    >
      <Icon size={20} className="text-white/70" />
      <p className="mt-3 text-sm font-semibold text-white">{title}</p>
      <p className="mt-1 text-xs text-white/50">{description}</p>
    </div>
  );

  if (disabled) return content;
  return <Link href={href}>{content}</Link>;
}
