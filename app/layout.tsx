import type { Metadata } from "next";
import { Orbitron, Poppins } from "next/font/google";
import { HakunnaFitSiteBackground } from "@/components/hakunnafit/site-background";
import { LeadModalProvider } from "@/components/hakunnafit/lead-modal-provider";
import "./globals.css";

const orbitron = Orbitron({
  subsets: ["latin"],
  weight: ["600", "800", "900"],
  variable: "--font-hf-heading",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
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
    <html lang="es">
      <body className={`${orbitron.variable} ${poppins.variable} bg-hf-black text-white antialiased`}>
        <HakunnaFitSiteBackground />
        <LeadModalProvider>{children}</LeadModalProvider>
      </body>
    </html>
  );
}
