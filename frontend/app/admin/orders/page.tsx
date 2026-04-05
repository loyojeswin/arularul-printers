"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Order } from "@/lib/types";

const statuses = ["PENDING", "IN_REVIEW", "PRINTING", "COMPLETED", "DELIVERED"] as const;

type SortMode = "latest" | "oldest" | "amount-high" | "amount-low" | "customer-a-z" | "customer-z-a";

const orderStatusClasses: Record<(typeof statuses)[number], string> = {
  PENDING: "bg-amber-100 text-amber-800",
  IN_REVIEW: "bg-sky-100 text-sky-800",
  PRINTING: "bg-indigo-100 text-indigo-800",
  COMPLETED: "bg-emerald-100 text-emerald-800",
  DELIVERED: "bg-green-100 text-green-800"
};

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | (typeof statuses)[number]>("ALL");
  const [sortMode, setSortMode] = useState<SortMode>("latest");

  async function loadOrders() {
    setLoading(true);
    setError(null);
    try {
      const allOrders = await apiFetch<Order[]>("/admin/orders");
      setOrders(allOrders);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load orders");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadOrders();
  }, []);

  async function updateStatus(orderId: string, status: (typeof statuses)[number]) {
    try {
      await apiFetch(`/admin/orders/${orderId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      });
      await loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Status update failed");
    }
  }

  async function markCashPaid(orderId: string) {
    try {
      await apiFetch(`/admin/orders/${orderId}/payment`, {
        method: "PATCH",
        body: JSON.stringify({ status: "PAID" })
      });
      await loadOrders();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment update failed");
    }
  }

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();

    let data = [...orders];

    if (query) {
      data = data.filter((order) => {
        const orderCode = order.id.slice(-8).toLowerCase();
        const customer = (order.user?.name || "").toLowerCase();
        const status = order.status.toLowerCase();
        const payment = (order.payment?.status || "").toLowerCase();
        return (
          order.id.toLowerCase().includes(query) ||
          orderCode.includes(query) ||
          customer.includes(query) ||
          status.includes(query) ||
          payment.includes(query)
        );
      });
    }

    if (statusFilter !== "ALL") {
      data = data.filter((order) => order.status === statusFilter);
    }

    data.sort((a, b) => {
      if (sortMode === "latest") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      if (sortMode === "oldest") {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      if (sortMode === "amount-high") {
        return Number(b.totalAmount) - Number(a.totalAmount);
      }
      if (sortMode === "amount-low") {
        return Number(a.totalAmount) - Number(b.totalAmount);
      }
      const customerA = (a.user?.name || "").toLowerCase();
      const customerB = (b.user?.name || "").toLowerCase();
      if (sortMode === "customer-a-z") {
        return customerA.localeCompare(customerB);
      }
      return customerB.localeCompare(customerA);
    });

    return data;
  }, [orders, search, statusFilter, sortMode]);

  return (
    <section className="space-y-4">
      {loading ? (
        <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">Loading orders...</p>
      ) : null}
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <h2 className="mr-auto text-2xl font-semibold text-slate-900">Orders</h2>
          <input
            type="text"
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
            placeholder="Search by order, customer, status"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as "ALL" | (typeof statuses)[number])}
          >
            <option value="ALL">All Status</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <select
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            value={sortMode}
            onChange={(event) => setSortMode(event.target.value as SortMode)}
          >
            <option value="latest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="amount-high">Amount: High to Low</option>
            <option value="amount-low">Amount: Low to High</option>
            <option value="customer-a-z">Customer: A to Z</option>
            <option value="customer-z-a">Customer: Z to A</option>
          </select>
        </div>

        <p className="mb-3 text-sm text-slate-600">Showing {filteredOrders.length} order(s)</p>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-[900px] w-full border-collapse text-sm">
            <thead className="bg-slate-50 text-left text-slate-700">
              <tr>
                <th className="px-4 py-3 font-semibold">Order</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Payment</th>
                <th className="px-4 py-3 font-semibold">Total</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Update</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => (
                <tr key={order.id} className="border-t border-slate-200">
                  <td className="px-4 py-3 font-medium text-slate-900">#{order.id.slice(-8)}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {new Date(order.createdAt).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric"
                    })}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{order.user?.name || "-"}</td>
                  <td className="px-4 py-3 text-slate-700">
                    <div className="flex flex-wrap items-center gap-2">
                      <span>{order.payment?.status || "N/A"}</span>
                      {order.payment?.provider === "CASH" && order.payment.status === "PENDING" ? (
                        <button
                          type="button"
                          className="rounded border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700"
                          onClick={() => void markCashPaid(order.id)}
                        >
                          Mark Paid
                        </button>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">Rs {Number(order.totalAmount).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${orderStatusClasses[order.status]}`}>
                      {order.status.replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      className="rounded-lg border border-slate-300 bg-white p-2 text-sm"
                      value={order.status}
                      onChange={(event) => updateStatus(order.id, event.target.value as (typeof statuses)[number])}
                    >
                      {statuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">
                    No orders found for current search/filter.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
