import { redirect } from "next/navigation";

// El login del super-admin se unificó con el del entrenador en una sola
// pantalla (/panel/login) — esta ruta se deja solo como red de seguridad
// para links o marcadores viejos que aún apunten aquí.
export default function AdminLoginRedirect() {
  redirect("/panel/login");
}
