import { redirect } from "next/navigation";

// "Textos y servicios" se dividió en Mi Marca (identidad) y Mi Sitio Web
// (secciones/servicios/FAQ/transformaciones/galería + borrador y publicación).
export default function TrainerContenidoPage() {
  redirect("/panel/sitio-web");
}
