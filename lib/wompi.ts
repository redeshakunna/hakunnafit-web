import { createHash } from "crypto";

// Helpers de integración con Wompi (Colombia — moneda única COP).
// Requiere estas variables de entorno:
//   NEXT_PUBLIC_WOMPI_PUBLIC_KEY  -> llave pública (segura de exponer al cliente)
//   WOMPI_INTEGRITY_SECRET        -> secreto de integridad (solo servidor, para firmar el checkout)
//   WOMPI_EVENTS_SECRET           -> secreto de eventos (solo servidor, para validar el webhook)
// En sandbox empiezan con pub_test_/prv_test_, en producción con pub_prod_/prv_prod_.

export function buildWompiReference(orderId: string) {
  return `hf-${orderId}`;
}

/**
 * Firma de integridad que exige el Widget/Checkout Web de Wompi:
 * SHA-256("<reference><amountInCents><currency><integritySecret>") en hexadecimal.
 */
export function buildIntegritySignature(params: {
  reference: string;
  amountInCents: number;
  currency?: string;
}) {
  const secret = process.env.WOMPI_INTEGRITY_SECRET;
  if (!secret) {
    throw new Error("Falta configurar WOMPI_INTEGRITY_SECRET en el entorno.");
  }
  const currency = params.currency ?? "COP";
  const raw = `${params.reference}${params.amountInCents}${currency}${secret}`;
  return createHash("sha256").update(raw).digest("hex");
}

/**
 * Construye la URL de redirección al Checkout Web de Wompi para un pedido.
 * https://checkout.wompi.co/p/?public-key=...&currency=COP&amount-in-cents=...&reference=...&signature:integrity=...&redirect-url=...
 */
export function buildWompiCheckoutUrl(params: {
  reference: string;
  amountInCents: number;
  redirectUrl: string;
  buyerEmail: string;
  buyerName: string;
}) {
  const publicKey = process.env.NEXT_PUBLIC_WOMPI_PUBLIC_KEY;
  if (!publicKey) {
    throw new Error("Falta configurar NEXT_PUBLIC_WOMPI_PUBLIC_KEY en el entorno.");
  }

  const signature = buildIntegritySignature({
    reference: params.reference,
    amountInCents: params.amountInCents,
  });

  const url = new URL("https://checkout.wompi.co/p/");
  url.searchParams.set("public-key", publicKey);
  url.searchParams.set("currency", "COP");
  url.searchParams.set("amount-in-cents", String(params.amountInCents));
  url.searchParams.set("reference", params.reference);
  url.searchParams.set("signature:integrity", signature);
  url.searchParams.set("redirect-url", params.redirectUrl);
  url.searchParams.set("customer-data:email", params.buyerEmail);
  url.searchParams.set("customer-data:full-name", params.buyerName);

  return url.toString();
}

/**
 * Valida la firma del evento (webhook) que envía Wompi.
 * checksum = SHA-256(valores de las propiedades indicadas en signature.properties,
 * en orden, concatenados + timestamp + secreto de eventos).
 */
export function verifyWompiEventSignature(event: {
  signature: { properties: string[]; checksum: string };
  timestamp: number;
  data: Record<string, unknown>;
}) {
  const secret = process.env.WOMPI_EVENTS_SECRET;
  if (!secret) {
    throw new Error("Falta configurar WOMPI_EVENTS_SECRET en el entorno.");
  }

  const getByPath = (obj: unknown, path: string) =>
    path.split(".").reduce<unknown>((acc, key) => (acc as Record<string, unknown>)?.[key], obj);

  const concatenated = event.signature.properties
    .map((path) => getByPath(event.data, path))
    .join("");

  const raw = `${concatenated}${event.timestamp}${secret}`;
  const expected = createHash("sha256").update(raw).digest("hex");

  return expected === event.signature.checksum;
}
