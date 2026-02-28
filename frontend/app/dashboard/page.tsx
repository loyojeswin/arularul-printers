"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiDownload, apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { Order } from "@/lib/types";

export default function DashboardPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadOrders() {
    setLoading(true);
    setError(null);

    try {
      const data = await apiFetch<Order[]>("/orders/my");
      setOrders(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (!getToken()) {
      router.push("/login");
      return;
    }
    void loadOrders();
  }, [router]);

  async function handleReorder(orderId: string) {
    try {
      await apiFetch(`/orders/${orderId}/reorder`, { method: "POST" });
      await loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reorder failed");
    }
  }

  async function handleInvoiceDownload(orderId: string) {
    try {
      await apiDownload(`/orders/${orderId}/invoice`, `invoice-${orderId}.pdf`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invoice download failed");
    }
  }

  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-bold">User Dashboard</h1>
      {loading ? <p>Loading orders...</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {!loading && orders.length === 0 ? <p>No orders yet. Place one from Get Quote.</p> : null}

      <div className="grid gap-4">
        {orders.map((order) => (
          <article key={order.id} className="rounded bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">Order #{order.id.slice(-8)}</p>
                <p className="text-sm text-slate-600">Status: {order.status}</p>
                <p className="text-sm text-slate-600">Payment: {order.payment?.status || "N/A"}</p>
                <p className="text-sm text-slate-600">Total: Rs {Number(order.totalAmount).toFixed(2)}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleReorder(order.id)}
                  className="rounded border border-brand px-3 py-1 text-sm text-brand"
                >
                  Reorder
                </button>
                <button
                  onClick={() => handleInvoiceDownload(order.id)}
                  className="rounded bg-brand px-3 py-1 text-sm text-white"
                >
                  Download Invoice
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
