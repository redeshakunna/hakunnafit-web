import { HakunnaFitHeader } from "./header";
import { HakunnaFitFooter } from "./footer";

// Layout compartido de las páginas legales (/privacidad, /terminos,
// /cookies) — antes de esto cada página iba a duplicar el mismo header +
// contenedor + título + fecha (DRY: se centraliza una vez, no 3 copias que
// habría que mantener sincronizadas a mano).

export function LegalPageShell({
  title,
  lastUpdated,
  children,
}: {
  title: string;
  lastUpdated: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <HakunnaFitHeader />
      <main className="relative">
        <div className="mx-auto max-w-3xl px-6 py-20 sm:py-24">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-hf-blue">Legal</p>
          <h1 className="mt-3 font-[family-name:var(--font-hf-heading)] text-3xl font-bold text-white sm:text-4xl">
            {title}
          </h1>
          <p className="mt-3 text-sm text-white/50">Última actualización: {lastUpdated}</p>
          {children}
        </div>
      </main>
      <HakunnaFitFooter />
    </>
  );
}

export function LegalIntro({ children }: { children: React.ReactNode }) {
  return <p className="mt-8 text-sm leading-relaxed text-white/70 sm:text-[15px]">{children}</p>;
}

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="font-[family-name:var(--font-hf-heading)] text-xl font-bold text-white sm:text-2xl">
        {title}
      </h2>
      <div className="mt-3 space-y-4 text-sm leading-relaxed text-white/70 sm:text-[15px]">{children}</div>
    </section>
  );
}

export function LegalContactLink() {
  return (
    <a href="mailto:contacto@hakunnafit.com" className="text-hf-blue hover:underline">
      contacto@hakunnafit.com
    </a>
  );
}
