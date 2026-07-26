"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

// Ancho de referencia tipo escritorio — las plantillas Starter están
// diseñadas para verse bien a este ancho o más. Se renderiza el DOM real a
// este tamaño y se reduce visualmente con CSS transform, en vez de intentar
// que el componente sea "responsive" dentro de un panel angosto — así la
// vista previa es fiel a como se ve la landing publicada de verdad.
const CANVAS_WIDTH = 1280;

/**
 * Reduce visualmente su contenido (pensado para el ancho de escritorio) para
 * que quepa en el ancho real del panel, sin cambiar el layout del
 * componente hijo. Usa ResizeObserver para recalcular la escala y el alto
 * cada vez que cambia el ancho disponible o el contenido (por ejemplo, al
 * cargar una imagen o crecer un texto), así que no necesita que quien lo usa
 * le avise manualmente de cada cambio.
 */
export function ScaledPreviewFrame({ children }: { children: ReactNode }) {
  const outerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [contentHeight, setContentHeight] = useState(0);

  useEffect(() => {
    function recalc() {
      const outer = outerRef.current;
      const inner = innerRef.current;
      if (!outer || !inner) return;
      const outerWidth = outer.clientWidth;
      if (outerWidth > 0) setScale(outerWidth / CANVAS_WIDTH);
      setContentHeight(inner.scrollHeight);
    }

    recalc();

    const ro = new ResizeObserver(recalc);
    if (outerRef.current) ro.observe(outerRef.current);
    if (innerRef.current) ro.observe(innerRef.current);
    window.addEventListener("resize", recalc);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", recalc);
    };
  }, []);

  return (
    <div ref={outerRef} className="relative w-full overflow-hidden" style={{ height: contentHeight * scale || undefined }}>
      <div
        ref={innerRef}
        style={{ width: CANVAS_WIDTH, transform: `scale(${scale})`, transformOrigin: "top left" }}
      >
        {children}
      </div>
    </div>
  );
}
