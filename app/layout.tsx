import type { Metadata } from "next";
import { Space_Grotesk, Inter } from "next/font/google";
import { HakunnaFitSiteBackground } from "@/components/hakunnafit/site-background";
import { LeadModalProvider } from "@/components/hakunnafit/lead-modal-provider";
import "./globals.css";

// Identidad tipográfica unificada de HakunnaFit (landing, dashboards, HakAI
// Studio, formularios, tablas, modales, etc.): Space Grotesk para títulos y
// encabezados, Inter para todo el resto. Cargadas vía next/font/google y
// expuestas como variables CSS para que toda la app las use de forma
// consistente (ver tailwind.config.ts y globals.css).
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-hf-heading",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-hf-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "HakunnaFit — La plataforma para entrenadores personales",
  description:
    "Web con tu marca, panel de administración, app para tus clientes y planes generados con IA. Profesionaliza tu negocio de entrenamiento con HakunnaFit.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={`${spaceGrotesk.variable} ${inter.variable}`}>
      {/* Las variables de fuente van en <html>, no en <body>: la regla de
          Tailwind que fija la fuente base (html { font-family: var(--font-hf-body) })
          vive en <html>, y las variables CSS solo se heredan de padres a
          hijos — si quedaban solo en <body> (hijo de html), esa regla no
          podía verlas y el navegador caía a su fuente por defecto (serif)
          para todo lo que no fuera un encabezado h1-h6. */}
      <body className="bg-hf-black text-white antialiased">
        <HakunnaFitSiteBackground />
        <LeadModalProvider>{children}</LeadModalProvider>
      </body>
    </html>
  );
}
