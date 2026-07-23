"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Minus, Plus, ShoppingBag, X } from "lucide-react";
import { createShopOrder } from "@/lib/actions";

interface Product {
  id: string;
  name: string;
  category: "ropa" | "suplementos";
  description: string | null;
  price_cop: number;
  image_url: string | null;
  stock: number;
}

const cop = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

const categoryLabels: Record<"todos" | Product["category"], string> = {
  todos: "Todos",
  ropa: "Ropa",
  suplementos: "Suplementos",
};

export function HakunnaFitShopCatalog({ products }: { products: Product[] }) {
  const [filter, setFilter] = useState<"todos" | Product["category"]>("todos");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutState, setCheckoutState] = useState<{
    submitting: boolean;
    error: string | null;
  }>({ submitting: false, error: null });
  const [buyer, setBuyer] = useState({ name: "", email: "", phone: "" });

  const visibleProducts = useMemo(
    () => (filter === "todos" ? products : products.filter((p) => p.category === filter)),
    [products, filter]
  );

  const cartLines = useMemo(
    () =>
      Object.entries(cart)
        .filter(([, qty]) => qty > 0)
        .map(([productId, quantity]) => {
          const product = products.find((p) => p.id === productId)!;
          return { product, quantity };
        }),
    [cart, products]
  );

  const total = cartLines.reduce((sum, line) => sum + line.product.price_cop * line.quantity, 0);
  const itemCount = cartLines.reduce((sum, line) => sum + line.quantity, 0);

  function updateQty(productId: string, delta: number, stock: number) {
    setCart((prev) => {
      const next = Math.min(Math.max((prev[productId] ?? 0) + delta, 0), stock);
      return { ...prev, [productId]: next };
    });
  }

  async function handleCheckout() {
    if (!buyer.name.trim() || !buyer.email.trim()) {
      setCheckoutState({ submitting: false, error: "Nombre y correo son obligatorios." });
      return;
    }
    setCheckoutState({ submitting: true, error: null });

    const result = await createShopOrder({
      buyerName: buyer.name,
      buyerEmail: buyer.email,
      buyerPhone: buyer.phone || undefined,
      cart: cartLines.map((l) => ({ productId: l.product.id, quantity: l.quantity })),
      origin: window.location.origin,
    });

    if (!result.ok || !result.redirectUrl) {
      setCheckoutState({ submitting: false, error: result.error ?? "No pudimos iniciar el pago." });
      return;
    }

    window.location.href = result.redirectUrl;
  }

  return (
    <div className="mx-auto max-w-7xl px-6">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <span className="inline-block rounded-full border border-hf-fuchsia/30 bg-hf-fuchsia/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-widest text-hf-fuchsia">
            Tienda HakunnaFit
          </span>
          <h1 className="mt-4 font-[family-name:var(--font-hf-heading)] text-3xl font-black uppercase leading-tight text-white sm:text-5xl">
            Ropa y suplementos
          </h1>
          <p className="mt-3 max-w-md text-sm text-white/60">
            Equípate para entrenar. Pagos seguros procesados por Wompi.
          </p>
        </div>

        <button
          onClick={() => setCartOpen(true)}
          className="relative flex items-center gap-2 rounded-full border border-white/15 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:border-white/30"
        >
          <ShoppingBag size={18} />
          Carrito
          {itemCount > 0 && (
            <span
              className="flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-bold text-white"
              style={{ background: "linear-gradient(90deg,#00C8FF,#6D2EFF,#FF2DB8)" }}
            >
              {itemCount}
            </span>
          )}
        </button>
      </div>

      <div className="mt-8 flex gap-3">
        {(Object.keys(categoryLabels) as Array<"todos" | Product["category"]>).map((key) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              filter === key ? "text-white" : "text-white/50 hover:text-white"
            }`}
            style={
              filter === key
                ? { background: "linear-gradient(90deg,#00C8FF,#6D2EFF,#FF2DB8)" }
                : { border: "1px solid rgba(255,255,255,0.12)" }
            }
          >
            {categoryLabels[key]}
          </button>
        ))}
      </div>

      {visibleProducts.length === 0 ? (
        <p className="mt-16 text-center text-white/50">Todavía no hay productos en esta categoría.</p>
      ) : (
        <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visibleProducts.map((product) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-5"
            >
              <div className="flex h-40 items-center justify-center rounded-xl bg-white/5 text-xs uppercase tracking-widest text-white/30">
                {product.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="h-full w-full rounded-xl object-cover"
                  />
                ) : (
                  "Sin imagen"
                )}
              </div>
              <span className="mt-4 text-[11px] font-semibold uppercase tracking-widest text-hf-blue">
                {product.category}
              </span>
              <h3 className="mt-1 font-[family-name:var(--font-hf-heading)] text-lg font-bold text-white">
                {product.name}
              </h3>
              {product.description && (
                <p className="mt-1 text-sm text-white/50">{product.description}</p>
              )}
              <div className="mt-4 flex items-center justify-between">
                <span className="text-lg font-bold text-white">{cop.format(product.price_cop)}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => updateQty(product.id, -1, product.stock)}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 text-white/70 hover:border-white/30"
                    aria-label="Quitar"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-5 text-center text-sm text-white">{cart[product.id] ?? 0}</span>
                  <button
                    onClick={() => updateQty(product.id, 1, product.stock)}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 text-white/70 hover:border-white/30"
                    aria-label="Agregar"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
              {product.stock <= 5 && (
                <span className="mt-2 text-[11px] text-white/40">Quedan {product.stock} unidades</span>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {cartOpen && (
        <div className="fixed inset-0 z-[60] flex justify-end bg-black/60" onClick={() => setCartOpen(false)}>
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            transition={{ type: "tween", duration: 0.3 }}
            onClick={(e) => e.stopPropagation()}
            className="flex h-full w-full max-w-md flex-col bg-hf-black p-6"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-[family-name:var(--font-hf-heading)] text-xl font-bold text-white">
                Tu carrito
              </h2>
              <button onClick={() => setCartOpen(false)} aria-label="Cerrar" className="text-white/60 hover:text-white">
                <X size={22} />
              </button>
            </div>

            <div className="mt-6 flex-1 space-y-4 overflow-y-auto">
              {cartLines.length === 0 && <p className="text-white/50">Aún no has agregado productos.</p>}
              {cartLines.map((line) => (
                <div key={line.product.id} className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
                  <div>
                    <p className="text-sm font-medium text-white">{line.product.name}</p>
                    <p className="text-xs text-white/50">
                      {line.quantity} × {cop.format(line.product.price_cop)}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-white">
                    {cop.format(line.product.price_cop * line.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {cartLines.length > 0 && (
              <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
                <div className="flex items-center justify-between text-white">
                  <span className="font-medium">Total</span>
                  <span className="text-xl font-bold">{cop.format(total)}</span>
                </div>

                <input
                  placeholder="Nombre completo"
                  value={buyer.name}
                  onChange={(e) => setBuyer((b) => ({ ...b, name: e.target.value }))}
                  className="w-full rounded-lg border border-white/15 bg-transparent px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-hf-blue focus:outline-none"
                />
                <input
                  placeholder="Correo electrónico"
                  type="email"
                  value={buyer.email}
                  onChange={(e) => setBuyer((b) => ({ ...b, email: e.target.value }))}
                  className="w-full rounded-lg border border-white/15 bg-transparent px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-hf-blue focus:outline-none"
                />
                <input
                  placeholder="WhatsApp (opcional)"
                  value={buyer.phone}
                  onChange={(e) => setBuyer((b) => ({ ...b, phone: e.target.value }))}
                  className="w-full rounded-lg border border-white/15 bg-transparent px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-hf-blue focus:outline-none"
                />

                {checkoutState.error && (
                  <p className="text-sm text-hf-fuchsia">{checkoutState.error}</p>
                )}

                <button
                  onClick={handleCheckout}
                  disabled={checkoutState.submitting}
                  className="w-full rounded-full px-6 py-3.5 text-sm font-semibold text-white transition-transform hover:scale-105 disabled:opacity-60"
                  style={{ background: "linear-gradient(90deg,#00C8FF,#6D2EFF,#FF2DB8)" }}
                >
                  {checkoutState.submitting ? "Redirigiendo a Wompi..." : "Pagar con Wompi →"}
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}
