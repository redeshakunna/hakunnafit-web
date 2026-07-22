"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";

interface ImageSliderProps {
  images: string[];
  alt: string;
  intervalMs?: number;
}

/**
 * Carrusel de fondo reutilizable. Con una sola imagen se muestra estática;
 * con dos o más, rota automáticamente con crossfade y muestra puntos de
 * navegación. Pensado para ir sumando más imágenes reales sin tocar código.
 */
export function HakunnaFitImageSlider({ images, alt, intervalMs = 5000 }: ImageSliderProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (images.length < 2) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % images.length);
    }, intervalMs);
    return () => clearInterval(id);
  }, [images.length, intervalMs]);

  if (images.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, delay: 0.2 }}
      className="relative mx-auto w-full max-w-3xl"
    >
      <motion.div
        className="pointer-events-none absolute -right-10 -top-10 h-72 w-72 rounded-full opacity-40 blur-3xl"
        style={{ background: "linear-gradient(135deg,#00C8FF,#6D2EFF,#FF2DB8)" }}
        animate={{ x: [0, 20, 0], y: [0, -15, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="pointer-events-none absolute -bottom-16 -left-10 h-56 w-56 rounded-full opacity-30 blur-3xl"
        style={{ background: "linear-gradient(135deg,#FF2DB8,#6D2EFF,#00C8FF)" }}
        animate={{ x: [0, -15, 0], y: [0, 15, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />

      {/* Insignia del logo principal — flotante, con tilt 3D continuo */}
      <motion.div
        initial={{ opacity: 0, scale: 0.7, rotate: -8 }}
        animate={{ opacity: 1, scale: 1, rotate: [-6, 4, -6], y: [0, -10, 0] }}
        transition={{
          opacity: { duration: 0.6, delay: 0.4 },
          scale: { duration: 0.6, delay: 0.4 },
          rotate: { duration: 7, repeat: Infinity, ease: "easeInOut" },
          y: { duration: 5, repeat: Infinity, ease: "easeInOut" },
        }}
        className="absolute -left-6 -top-10 z-10 h-32 w-32 drop-shadow-[0_18px_30px_rgba(109,46,255,0.45)] sm:h-40 sm:w-40"
      >
        <Image src="/images/SoloMascota-Transparente.png" alt="HakunnaFit" fill className="object-contain" />
      </motion.div>

      <div className="relative aspect-[1536/1024] w-full">
        <AnimatePresence mode="sync">
          <motion.div
            key={index}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            className="absolute inset-0"
          >
            <Image
              src={images[index]}
              alt={alt}
              fill
              priority={index === 0}
              className="object-contain"
              sizes="(min-width: 1024px) 860px, 94vw"
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {images.length > 1 && (
        <div className="mt-4 flex items-center justify-center gap-2">
          {images.map((_, i) => (
            <button
              key={i}
              aria-label={`Ver imagen ${i + 1}`}
              onClick={() => setIndex(i)}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: i === index ? 20 : 6,
                background: i === index ? "linear-gradient(90deg,#00C8FF,#FF2DB8)" : "rgba(0,0,0,0.15)",
              }}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}
