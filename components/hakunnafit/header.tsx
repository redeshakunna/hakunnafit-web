"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useLeadModal } from "./lead-modal-context";

// Navegación reducida a lo que existe de verdad en la página (nada de
// secciones placeholder sin contenido, para que el menú no se vea apilonado).
// Sigue el mismo orden en que aparecen las secciones en app/page.tsx.
const nav = [
  { label: "Producto", href: "#producto" },
  { label: "Cómo funciona", href: "#como-funciona" },
  { label: "Ejemplos", href: "#ejemplos" },
  { label: "Funciones", href: "#pilares" },
  { label: "Precios", href: "#precios" },
  { label: "Tienda", href: "/tienda" },
];

export function HakunnaFitHeader() {
  const [open, setOpen] = useState(false);
  const { openModal } = useLeadModal();

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-hf-black/90 backdrop-blur-xl">
      <div className="mx-auto flex h-40 max-w-7xl items-center justify-between px-6">
        <Link href="/" className="flex items-center">
          <div className="relative h-[132px] w-[250px] shrink-0">
            <Image
              src="/images/LogoHorizontal-trasnparente.png"
              alt="HakunnaFit"
              fill
              className="object-contain object-left"
              priority
            />
          </div>
        </Link>

        <nav className="hidden items-center gap-6 xl:flex">
          {nav.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="group relative py-2 font-[family-name:var(--font-hf-body)] text-[13px] font-medium uppercase tracking-[0.12em] text-white/70 transition-colors duration-300 hover:text-hf-blue"
            >
              {item.label}
              <span
                className="pointer-events-none absolute -bottom-0.5 left-0 h-[2px] w-0 rounded-full transition-all duration-300 ease-out group-hover:w-full"
                style={{ background: "linear-gradient(90deg,#00C8FF,#6D2EFF,#FF2DB8)" }}
              />
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 xl:flex">
          <Link
            href="/panel/login"
            className="rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold text-white/80 transition-colors hover:border-white/30 hover:text-white"
          >
            Iniciar sesión
          </Link>
          <button
            type="button"
            onClick={() => openModal()}
            className="relative rounded-full px-5 py-2.5 text-sm font-semibold text-white transition-transform hover:scale-105"
            style={{ background: "linear-gradient(90deg,#00C8FF,#6D2EFF,#FF2DB8)" }}
          >
            <span
              aria-hidden
              className="absolute inset-0 -z-10 rounded-full opacity-70 blur-lg"
              style={{ background: "linear-gradient(90deg,#00C8FF,#6D2EFF,#FF2DB8)" }}
            />
            Quiero mi demo →
          </button>
        </div>

        <button
          aria-label="Abrir menú"
          className="flex h-11 w-11 items-center justify-center text-white xl:hidden"
          onClick={() => setOpen(true)}
        >
          <Menu size={24} />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col bg-hf-black text-white xl:hidden"
          >
            <div className="flex h-20 items-center justify-between px-6">
              <div className="relative h-8 w-28">
                <Image
                  src="/images/LogoHorizontal-trasnparente.png"
                  alt="HakunnaFit"
                  fill
                  className="object-contain object-left"
                />
              </div>
              <button
                aria-label="Cerrar menú"
                className="flex h-11 w-11 items-center justify-center"
                onClick={() => setOpen(false)}
              >
                <X size={24} />
              </button>
            </div>
            <nav className="flex flex-1 flex-col justify-center gap-8 px-6 pb-24">
              {nav.map((item, i) => (
                <motion.a
                  key={item.label}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="text-3xl font-medium tracking-tight"
                >
                  {item.label}
                </motion.a>
              ))}
              <Link
                href="/panel/login"
                onClick={() => setOpen(false)}
                className="text-left text-sm font-semibold text-white/50"
              >
                Iniciar sesión
              </Link>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  openModal();
                }}
                className="mt-4 rounded-full px-6 py-4 text-center text-sm font-semibold text-white"
                style={{ background: "linear-gradient(90deg,#00C8FF,#6D2EFF,#FF2DB8)" }}
              >
                Quiero mi demo
              </button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
