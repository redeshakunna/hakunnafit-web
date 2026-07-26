import { redirect } from "next/navigation";

// "Fotos y logo" se fusionó con "Colores" en Mi Marca (/panel/marca).
export default function TrainerFotosPage() {
  redirect("/panel/marca");
}
