import { HakunnaFitHeader } from "@/components/hakunnafit/header";
import { HakunnaFitHero } from "@/components/hakunnafit/hero";
import { HakunnaFitToolsComparison } from "@/components/hakunnafit/tools-comparison";
import { HakunnaFitBrandShowcase } from "@/components/hakunnafit/brand-showcase";
import { HakunnaFitFeatures } from "@/components/hakunnafit/features";
import { HakunnaFitHowItWorks } from "@/components/hakunnafit/how-it-works";
import { HakunnaFitPricing } from "@/components/hakunnafit/pricing";
import { HakunnaFitCtaBanner } from "@/components/hakunnafit/cta-banner";
import { HakunnaFitFooter } from "@/components/hakunnafit/footer";
import { HakunnaFitComingSoon } from "@/components/hakunnafit/coming-soon";

// Mientras se sigue probando el panel de super admin, el home público muestra
// la página de "en construcción" — el resto del sitio (/tienda, etc.) y todo
// /panel-hakunna siguen funcionando normal. Cambia esto a false para volver a
// publicar la landing completa (el código de abajo no se toca ni se borra).
const SITE_UNDER_CONSTRUCTION = true;

export default function HakunnaFitPage() {
  if (SITE_UNDER_CONSTRUCTION) {
    return <HakunnaFitComingSoon />;
  }

  return (
    <>
      <HakunnaFitHeader />
      <main>
        <HakunnaFitHero />
        <HakunnaFitToolsComparison />
        <HakunnaFitBrandShowcase />
        <HakunnaFitFeatures />
        <HakunnaFitHowItWorks />
        <HakunnaFitPricing />
        <HakunnaFitCtaBanner />
      </main>
      <HakunnaFitFooter />
    </>
  );
}
