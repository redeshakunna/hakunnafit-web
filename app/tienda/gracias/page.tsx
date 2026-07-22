import Link from "next/link";
import { HakunnaFitHeader } from "@/components/hakunnafit/header";
import { HakunnaFitFooter } from "@/components/hakunnafit/footer";
import { getSupabase } from "@/lib/supabase";

export const revalidate = 0;

// Wompi redirige aquí con ?id=<transacción>&env=... — el estado real y
// definitivo del pedido lo actualiza el webhook (server-to-server), esta
// página solo muestra lo que ya tengamos guardado por referencia.
export default async function TiendaGraciasPage({
  searchParams,
}: {
  searchParams: { ref?: string };
}) {
  const reference = searchParams.ref;
  let status: string | null = null;

  if (reference) {
    const supabase = getSupabase();
    const { data } = await supabase
      .from("orders")
      .select("status")
      .eq("wompi_reference", reference)
      .maybeSingle();
    status = data?.status ?? null;
  }

  const messages: Record<string, { title: string; body: string }> = {
    aprobado: {
      title: "¡Pago confirmado!",
      body: "Tu pedido fue aprobado. Te contactaremos por correo para coordinar la entrega.",
    },
    declinado: {
      title: "El pago no fue aprobado",
      body: "Wompi rechazó la transacción. Puedes intentar de nuevo con otro medio de pago.",
    },
    pendiente: {
      title: "Estamos confirmando tu pago",
      body: "Wompi todavía está procesando la transacción. Actualiza esta página en unos segundos.",
    },
  };

  const info = (status && messages[status]) || {
    title: "Gracias por tu compra",
    body: "Estamos verificando el estado de tu pago con Wompi.",
  };

  return (
    <>
      <HakunnaFitHeader />
      <main className="flex min-h-[70vh] flex-col items-center justify-center bg-hf-black px-6 text-center">
        <h1 className="font-[family-name:var(--font-hf-heading)] text-3xl font-black uppercase text-white sm:text-4xl">
          {info.title}
        </h1>
        <p className="mt-4 max-w-md text-white/60">{info.body}</p>
        <Link
          href="/tienda"
          className="mt-8 rounded-full px-6 py-3 text-sm font-semibold text-white transition-transform hover:scale-105"
          style={{ background: "linear-gradient(90deg,#00C8FF,#6D2EFF,#FF2DB8)" }}
        >
          Volver a la tienda
        </Link>
      </main>
      <HakunnaFitFooter />
    </>
  );
}
