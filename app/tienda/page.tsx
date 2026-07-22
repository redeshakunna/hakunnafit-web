import { HakunnaFitHeader } from "@/components/hakunnafit/header";
import { HakunnaFitFooter } from "@/components/hakunnafit/footer";
import { HakunnaFitShopCatalog } from "@/components/hakunnafit/shop-catalog";
import { getSupabase } from "@/lib/supabase";

export const revalidate = 0;

export default async function TiendaPage() {
  const supabase = getSupabase();
  const { data: products } = await supabase
    .from("products")
    .select("id, name, category, description, price_cop, image_url, stock")
    .eq("active", true)
    .order("created_at", { ascending: true });

  return (
    <>
      <HakunnaFitHeader />
      <main className="min-h-screen bg-hf-black pb-24 pt-16">
        <HakunnaFitShopCatalog products={products ?? []} />
      </main>
      <HakunnaFitFooter />
    </>
  );
}
