"use server";

import { getSupabase } from "@/lib/supabase";
import { buildWompiCheckoutUrl, buildWompiReference } from "@/lib/wompi";

export interface LeadResult {
  ok: boolean;
  error?: string;
}

export async function submitHakunnaFitLead(formData: FormData): Promise<LeadResult> {
  const nombre = (formData.get("nombre") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();

  if (!nombre || !email) {
    return { ok: false, error: "Nombre y correo son obligatorios." };
  }

  const necesidades = formData.getAll("necesidades") as string[];

  const supabase = getSupabase();
  const { error } = await supabase.from("hakunnafit_leads").insert({
    nombre,
    negocio: (formData.get("negocio") as string) || null,
    email,
    whatsapp: (formData.get("whatsapp") as string) || null,
    num_clientes: (formData.get("num_clientes") as string) || null,
    necesidades: necesidades.length ? necesidades : null,
    mensaje: (formData.get("mensaje") as string) || null,
  });

  if (error) {
    return { ok: false, error: "No pudimos enviar tu solicitud. Intenta de nuevo." };
  }

  return { ok: true };
}

export interface CartLine {
  productId: string;
  quantity: number;
}

export interface CheckoutResult {
  ok: boolean;
  error?: string;
  redirectUrl?: string;
}

/**
 * Crea el pedido (orders + order_items) con los precios reales tomados de la
 * base de datos (nunca confiamos en el precio que venga del cliente) y arma
 * la URL de redirección al Checkout Web de Wompi.
 */
export async function createShopOrder(input: {
  buyerName: string;
  buyerEmail: string;
  buyerPhone?: string;
  cart: CartLine[];
  origin: string;
}): Promise<CheckoutResult> {
  const buyerName = input.buyerName?.trim();
  const buyerEmail = input.buyerEmail?.trim();

  if (!buyerName || !buyerEmail) {
    return { ok: false, error: "Nombre y correo son obligatorios." };
  }
  if (!input.cart?.length) {
    return { ok: false, error: "El carrito está vacío." };
  }

  const supabase = getSupabase();

  const productIds = input.cart.map((line) => line.productId);
  const { data: products, error: productsError } = await supabase
    .from("products")
    .select("id, price_cop, stock, active")
    .in("id", productIds);

  if (productsError || !products || products.length !== productIds.length) {
    return { ok: false, error: "Uno o más productos ya no están disponibles." };
  }

  const priceById = new Map(products.map((p) => [p.id, p]));
  let totalCop = 0;
  for (const line of input.cart) {
    const product = priceById.get(line.productId);
    if (!product || !product.active || product.stock < line.quantity) {
      return { ok: false, error: "Uno o más productos no tienen suficiente stock." };
    }
    totalCop += product.price_cop * line.quantity;
  }

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      buyer_name: buyerName,
      buyer_email: buyerEmail,
      buyer_phone: input.buyerPhone || null,
      total_cop: totalCop,
      wompi_reference: "",
    })
    .select("id")
    .single();

  if (orderError || !order) {
    return { ok: false, error: "No pudimos crear el pedido. Intenta de nuevo." };
  }

  const reference = buildWompiReference(order.id);
  await supabase.from("orders").update({ wompi_reference: reference }).eq("id", order.id);

  const orderItems = input.cart.map((line) => ({
    order_id: order.id,
    product_id: line.productId,
    quantity: line.quantity,
    unit_price_cop: priceById.get(line.productId)!.price_cop,
  }));
  const { error: itemsError } = await supabase.from("order_items").insert(orderItems);

  if (itemsError) {
    return { ok: false, error: "No pudimos registrar los productos del pedido." };
  }

  try {
    const redirectUrl = buildWompiCheckoutUrl({
      reference,
      amountInCents: totalCop * 100,
      redirectUrl: `${input.origin}/tienda/gracias?ref=${reference}`,
      buyerEmail,
      buyerName,
    });
    return { ok: true, redirectUrl };
  } catch {
    return {
      ok: false,
      error: "La tienda aún no tiene configuradas las llaves de Wompi (contacta al administrador).",
    };
  }
}
