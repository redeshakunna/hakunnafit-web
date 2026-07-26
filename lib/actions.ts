"use server";

import { getSupabase } from "@/lib/supabase";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { buildWompiCheckoutUrl, buildWompiReference } from "@/lib/wompi";
import { firstAvailableSlug, slugify, RESERVED_SUBDOMAINS } from "@/lib/slug";
import { createNotification } from "@/lib/notifications";
import { planLabel, type PlanKey } from "@/lib/catalog";

export interface LeadResult {
  ok: boolean;
  error?: string;
}

export interface SubdomainCheckResult {
  slug: string;
  available: boolean;
  reserved: boolean;
}

/**
 * Chequeo en vivo mientras el visitante escribe el nombre que quiere para su
 * página, usado por el modal de leads. hakunnafit_leads no tiene lectura
 * pública (solo insert), así que esto corre server-side con la llave de
 * servicio. No reserva nada — es solo una vista previa de disponibilidad;
 * la unicidad definitiva se vuelve a validar al insertar el lead y otra vez
 * al aprobarlo como entrenador.
 */
export async function checkSubdominioDisponible(raw: string): Promise<SubdomainCheckResult> {
  const slug = slugify(raw);
  if (!raw.trim()) return { slug: "", available: true, reserved: false };
  if (RESERVED_SUBDOMAINS.has(slug)) return { slug, available: false, reserved: true };

  const admin = getSupabaseAdmin();
  const [{ data: trainer }, { data: lead }] = await Promise.all([
    admin.from("trainers").select("id").eq("subdominio", slug).maybeSingle(),
    admin
      .from("hakunnafit_leads")
      .select("id")
      .eq("subdominio_propuesto", slug)
      .neq("estado", "entrenador_creado")
      .maybeSingle(),
  ]);

  return { slug, available: !trainer && !lead, reserved: false };
}

export async function submitHakunnaFitLead(formData: FormData): Promise<LeadResult> {
  const nombre = (formData.get("nombre") as string)?.trim();
  const email = (formData.get("email") as string)?.trim();

  if (!nombre || !email) {
    return { ok: false, error: "Nombre y correo son obligatorios." };
  }

  const planRaw = (formData.get("plan") as string) || null;
  const plan = planRaw === "starter" || planRaw === "pro" || planRaw === "elite" ? planRaw : null;

  // Solicitud pública corta — a propósito solo pide lo mínimo para revisar
  // (nombre, correo, WhatsApp, ciudad, especialidad, plan, comentario). Todo
  // lo demás (nombre de la página, plantilla, branding, servicios...) se
  // recoge después en el wizard de onboarding, una vez Nando aprueba.
  // El subdominio se calcula solo como sugerencia inicial a partir del
  // nombre — el entrenador podrá ajustarlo en el paso de Branding del
  // wizard; no se reserva de forma definitiva todavía.
  let subdominioPropuesto: string | null = null;
  try {
    const admin = getSupabaseAdmin();
    const [{ data: existingTrainers }, { data: pendingLeads }] = await Promise.all([
      admin.from("trainers").select("subdominio"),
      admin.from("hakunnafit_leads").select("subdominio_propuesto").neq("estado", "entrenador_creado"),
    ]);
    const taken = new Set([
      ...RESERVED_SUBDOMAINS,
      ...(existingTrainers ?? []).map((t) => t.subdominio),
      ...(pendingLeads ?? []).map((l) => l.subdominio_propuesto),
    ].filter((s): s is string => !!s));
    subdominioPropuesto = firstAvailableSlug(nombre, taken);
  } catch {
    // Si falla el cálculo del subdominio, seguimos sin bloquear el envío del
    // formulario — se asigna después, al aprobar la solicitud.
    subdominioPropuesto = null;
  }

  // hakunnafit_leads solo tiene una política pública de INSERT (nunca de
  // SELECT — no hay lectura pública de solicitudes). Encadenar
  // .select().single() después del insert obliga a Postgrest a releer la
  // fila insertada, y como no hay política de SELECT para "anon", eso
  // rechaza la escritura con un error de RLS aunque el insert en sí sí
  // estaba permitido. Se usa el cliente de servicio en su lugar: esta acción
  // corre solo en el servidor (nunca en el navegador), así que es seguro, y
  // evita tener que abrir una política de lectura pública que expondría
  // correos/WhatsApp de todas las solicitudes a cualquiera con la llave anon.
  const supabase = getSupabaseAdmin();
  const { data: inserted, error } = await supabase
    .from("hakunnafit_leads")
    .insert({
      nombre,
      email,
      whatsapp: (formData.get("whatsapp") as string) || null,
      mensaje: (formData.get("mensaje") as string) || null,
      plan,
      ciudad: (formData.get("ciudad") as string) || null,
      subdominio_propuesto: subdominioPropuesto,
      especialidad: (formData.get("especialidad") as string) || null,
      estado: "solicitud_recibida",
    })
    .select("id")
    .single();

  if (error) {
    return { ok: false, error: "No pudimos enviar tu solicitud. Intenta de nuevo." };
  }

  const planTxt = plan ? planLabel(plan as PlanKey) : "sin plan definido";
  await createNotification({
    type: "lead_nuevo",
    title: `Nueva solicitud: ${nombre}`,
    message: `${nombre} quiere el plan ${planTxt}. Ciudad: ${
      (formData.get("ciudad") as string) || "no indicada"
    }.`,
    link: "/panel-hakunna/solicitudes",
    leadId: inserted?.id ?? null,
  });

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
