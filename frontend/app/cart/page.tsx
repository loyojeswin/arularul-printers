"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CartItem } from "@/lib/types";
import { fetchCart, removeCartItem, upsertCartItem } from "@/lib/user-data";
import { fetchProfile } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { Route } from "next";

export default function CartPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      try {
        await fetchProfile();
      } catch {
        router.push("/login");
        return;
      }

      try {
        const data = await fetchCart();
        setItems(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load cart");
      } finally {
        setLoading(false);
      }
    }

    void init();
  }, [router]);

  const total = useMemo(
    () => items.reduce((sum, item) => sum + Number(item.product.basePrice) * item.quantity, 0),
    [items]
  );

  async function handleQuantity(item: CartItem, quantity: number) {
    try {
      const updated = await upsertCartItem(item.productId, quantity);
      setItems((prev) =>
        prev.map((existing) => (existing.id === item.id ? { ...existing, quantity: updated.quantity } : existing))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update cart");
    }
  }

  async function handleRemove(item: CartItem) {
    try {
      await removeCartItem(item.productId);
      setItems((prev) => prev.filter((existing) => existing.id !== item.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove item");
    }
  }

  return (
    <section className="space-y-4 pb-16 md:pb-0">
      <h1 className="text-2xl font-bold">Cart</h1>

      {loading ? <p>Loading cart...</p> : null}
      {error ? <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p> : null}

      {!loading && items.length === 0 ? (
        <div className="rounded bg-white p-4 shadow-sm">
          <p>Your cart is empty.</p>
          <Link href="/products" className="mt-2 inline-block text-sm font-semibold text-[#2874f0]">
            Browse products
          </Link>
        </div>
      ) : null}

      <div className="grid gap-3">
        {items.map((item) => (
          <article key={item.id} className="rounded bg-white p-4 shadow-sm">
            <p className="font-semibold">{item.product.name}</p>
            <p className="text-sm text-slate-600">Rs {Number(item.product.basePrice).toFixed(2)}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <label className="text-xs text-slate-600">Qty</label>
              <input
                className="w-16 rounded border p-1 text-sm"
                type="number"
                min={1}
                value={item.quantity}
                onChange={(event) => handleQuantity(item, Number(event.target.value || 1))}
              />
              <Link
                href={"/get-quote" as Route}
                className="rounded bg-[#fb641b] px-3 py-1 text-xs font-semibold text-white"
              >
                Proceed
              </Link>
              <button
                type="button"
                className="rounded border px-3 py-1 text-xs"
                onClick={() => handleRemove(item)}
              >
                Remove
              </button>
            </div>
          </article>
        ))}
      </div>

      {items.length > 0 ? (
        <div className="rounded bg-white p-4 shadow-sm">
          <p className="font-semibold">Estimated total: Rs {total.toFixed(2)}</p>
        </div>
      ) : null}
    </section>
  );
}
