import { redirect } from "next/navigation";

// "Colores" se fusionó con "Fotos y logo" en Mi Marca (/panel/marca).
export default function TrainerColoresPage() {
  redirect("/panel/marca");
}
