import { HakunnaFitHeader } from "@/components/hakunnafit/header";
import { HakunnaFitHero } from "@/components/hakunnafit/hero";
import { HakunnaFitToolsComparison } from "@/components/hakunnafit/tools-comparison";
import { HakunnaFitBrandShowcase } from "@/components/hakunnafit/brand-showcase";
import { HakunnaFitFeatures } from "@/components/hakunnafit/features";
import { HakunnaFitHowItWorks } from "@/components/hakunnafit/how-it-works";
import { HakunnaFitPricing } from "@/components/hakunnafit/pricing";
import { HakunnaFitCtaBanner } from "@/components/hakunnafit/cta-banner";
import { HakunnaFitFooter } from "@/components/hakunnafit/footer";

export default function HakunnaFitPage() {
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
