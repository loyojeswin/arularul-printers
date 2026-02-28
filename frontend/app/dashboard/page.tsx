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
      <h1 className="text-3xl font-bold">My Orders</h1>
      {loading ? (
        <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">Loading orders...</p>
      ) : null}
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      {!loading && orders.length === 0 ? <p className="text-sm text-slate-600">No orders yet.</p> : null}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-[980px] w-full border-collapse text-sm">
          <thead className="bg-slate-50 text-left text-slate-700">
            <tr>
              <th className="px-4 py-3 font-semibold">Order ID</th>
              <th className="px-4 py-3 font-semibold">Date</th>
              <th className="px-4 py-3 font-semibold">Details</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Payment</th>
              <th className="px-4 py-3 font-semibold">Total</th>
              <th className="px-4 py-3 font-semibold">Paid</th>
              <th className="px-4 py-3 font-semibold">Pending</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const total = Number(order.totalAmount);
              const paid = order.payment?.status === "PAID" ? total : 0;
              const pending = Math.max(0, total - paid);
              const itemCount = order.items.length;
              const firstItemName = order.items[0]?.product?.name || "Custom item";

              return (
                <tr key={order.id} className="border-t border-slate-200">
                  <td className="px-4 py-3 font-medium text-slate-900">#{order.id.slice(-8)}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {new Date(order.createdAt).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric"
                    })}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {firstItemName}
                    {itemCount > 1 ? ` +${itemCount - 1} more` : ""}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{order.status.replace("_", " ")}</td>
                  <td className="px-4 py-3 text-slate-700">{order.payment?.status || "N/A"}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">Rs {total.toFixed(2)}</td>
                  <td className="px-4 py-3 text-emerald-700">Rs {paid.toFixed(2)}</td>
                  <td className="px-4 py-3 text-amber-700">Rs {pending.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleReorder(order.id)}
                        className="rounded border border-brand px-3 py-1 text-xs font-semibold text-brand"
                      >
                        Reorder
                      </button>
                      <button
                        onClick={() => handleInvoiceDownload(order.id)}
                        className="rounded bg-brand px-3 py-1 text-xs font-semibold text-white"
                      >
                        Invoice
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
