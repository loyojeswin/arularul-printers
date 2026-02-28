"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Product } from "@/lib/types";

const CART_KEY = "arul_cart_products";

function readIds(): string[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(CART_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeIds(values: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(CART_KEY, JSON.stringify(values));
}

export default function CartPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cartIds, setCartIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const ids = readIds();
      setCartIds(ids);
      try {
        const data = await apiFetch<Product[]>("/products");
        setProducts(data);
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  const cartProducts = useMemo(
    () => products.filter((product) => cartIds.includes(product.id)),
    [products, cartIds]
  );

  const total = useMemo(
    () => cartProducts.reduce((sum, product) => sum + Number(product.basePrice), 0),
    [cartProducts]
  );

  function removeFromCart(productId: string) {
    const next = cartIds.filter((id) => id !== productId);
    setCartIds(next);
    writeIds(next);
  }

  return (
    <section className="space-y-4 pb-16 md:pb-0">
      <h1 className="text-2xl font-bold">Cart</h1>

      {loading ? <p>Loading cart...</p> : null}

      {!loading && cartProducts.length === 0 ? (
        <div className="rounded bg-white p-4 shadow-sm">
          <p>Your cart is empty.</p>
          <Link href="/products" className="mt-2 inline-block text-sm font-semibold text-[#2874f0]">
            Browse products
          </Link>
        </div>
      ) : null}

      <div className="grid gap-3">
        {cartProducts.map((product) => (
          <article key={product.id} className="rounded bg-white p-4 shadow-sm">
            <p className="font-semibold">{product.name}</p>
            <p className="text-sm text-slate-600">Rs {Number(product.basePrice).toFixed(2)}</p>
            <div className="mt-2 flex gap-2">
              <Link href="/get-quote" className="rounded bg-[#fb641b] px-3 py-1 text-xs font-semibold text-white">
                Proceed
              </Link>
              <button
                type="button"
                className="rounded border px-3 py-1 text-xs"
                onClick={() => removeFromCart(product.id)}
              >
                Remove
              </button>
            </div>
          </article>
        ))}
      </div>

      {cartProducts.length > 0 ? (
        <div className="rounded bg-white p-4 shadow-sm">
          <p className="font-semibold">Estimated total: Rs {total.toFixed(2)}</p>
        </div>
      ) : null}
    </section>
  );
}
