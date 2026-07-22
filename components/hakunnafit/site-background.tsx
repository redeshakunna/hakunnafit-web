"use client";

import { motion } from "framer-motion";

// Fondo único, fijo (position: fixed), para toda la página — así todas las
// secciones comparten el mismo negro + resplandores + destellos, y el
// contenido se desplaza por encima (efecto "parallax" real, sin repintar el
// mismo set de blobs en cada sección).
const sparklePoints = [
  { top: "4%", left: "8%", size: 4, delay: 0 },
  { top: "11%", left: "82%", size: 3, delay: 0.6 },
  { top: "21%", left: "45%", size: 4, delay: 1.2 },
  { top: "33%", left: "18%", size: 3, delay: 0.3 },
  { top: "40%", left: "70%", size: 5, delay: 0.9 },
  { top: "51%", left: "6%", size: 3, delay: 1.6 },
  { top: "59%", left: "92%", size: 4, delay: 0.5 },
  { top: "67%", left: "35%", size: 3, delay: 1.1 },
  { top: "75%", left: "60%", size: 4, delay: 0.2 },
  { top: "84%", left: "15%", size: 3, delay: 1.4 },
  { top: "90%", left: "78%", size: 4, delay: 0.8 },
  { top: "97%", left: "48%", size: 3, delay: 1.9 },
];

export function HakunnaFitSiteBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-hf-black">
      <motion.div
        animate={{ opacity: [0.25, 0.4, 0.25], x: [0, 24, 0], y: [0, -18, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -right-24 top-[2%] h-[420px] w-[420px] rounded-full blur-[120px]"
        style={{ background: "#6D2EFF" }}
      />
      <motion.div
        animate={{ opacity: [0.18, 0.3, 0.18], x: [0, -20, 0], y: [0, 16, 0] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -left-24 top-[26%] h-[380px] w-[380px] rounded-full blur-[110px]"
        style={{ background: "#00C8FF" }}
      />
      <motion.div
        animate={{ opacity: [0.2, 0.32, 0.2], x: [0, 18, 0], y: [0, -14, 0] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -right-20 top-[54%] h-[400px] w-[400px] rounded-full blur-[110px]"
        style={{ background: "#FF2DB8" }}
      />
      <motion.div
        animate={{ opacity: [0.16, 0.26, 0.16], x: [0, -16, 0], y: [0, 12, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -left-20 top-[80%] h-[360px] w-[360px] rounded-full blur-[100px]"
        style={{ background: "#6D2EFF" }}
      />

      {sparklePoints.map((p, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full"
          style={{
            top: p.top,
            left: p.left,
            width: p.size,
            height: p.size,
            background: i % 3 === 0 ? "#00C8FF" : i % 3 === 1 ? "#6D2EFF" : "#FF2DB8",
            boxShadow: `0 0 8px 2px ${i % 3 === 0 ? "#00C8FF" : i % 3 === 1 ? "#6D2EFF" : "#FF2DB8"}`,
          }}
          animate={{ opacity: [0.15, 0.9, 0.15], scale: [1, 1.5, 1] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: p.delay }}
        />
      ))}
    </div>
  );
}
