"use client";

import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL, apiFetch } from "@/lib/api";
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
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

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

  function toggleExpanded(orderId: string) {
    setExpanded((prev) => ({ ...prev, [orderId]: !prev[orderId] }));
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
              {filteredOrders.map((order) => {
                const isOpen = !!expanded[order.id];
                const uploadsBase = `${API_BASE_URL.replace(/\/api$/, "")}/uploads`;

                return (
                  <>
                    <tr key={order.id} className="border-t border-slate-200 align-top">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        <button
                          type="button"
                          className="text-left hover:underline"
                          onClick={() => toggleExpanded(order.id)}
                        >
                          #{order.id.slice(-8)}
                        </button>
                        <p className="mt-1 text-xs text-slate-500">{order.items?.length || 0} item(s)</p>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {new Date(order.createdAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric"
                        })}
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        <p className="font-medium text-slate-900">{order.user?.name || "-"}</p>
                        <p className="text-xs text-slate-500">{order.user?.email || ""}</p>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        <div className="flex flex-wrap items-center gap-2">
                          <span>{order.payment?.status || "N/A"}</span>
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                            {order.payment?.provider || "—"}
                          </span>
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
                        <div className="flex flex-wrap items-center gap-2">
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
                          <button type="button" className="rounded border px-2 py-1 text-xs" onClick={() => toggleExpanded(order.id)}>
                            {isOpen ? "Hide" : "View"}
                          </button>
                        </div>
                      </td>
                    </tr>

                    {isOpen ? (
                      <tr key={`${order.id}-details`} className="border-t border-slate-200 bg-white">
                        <td colSpan={7} className="px-4 py-4">
                          <div className="space-y-4">
                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Order notes</p>
                              <p className="mt-2 text-sm text-slate-800 whitespace-pre-line">
                                {order.notes || "—"}
                              </p>
                            </div>

                            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Items</p>
                              <div className="mt-3 space-y-3">
                                {order.items.map((item) => {
                                  const product = item.product;
                                  const media = product?.media || [];
                                  const firstImage = media.find((m) => m.fileType === "IMAGE") || media[0] || null;
                                  const lineTotal = Number(item.lineTotal);
                                  const designFiles = item.designFiles || [];

                                  return (
                                    <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-3">
                                      <div className="grid gap-3 sm:grid-cols-[88px_1fr]">
                                        <div className="h-20 w-22 overflow-hidden rounded bg-slate-100">
                                          {firstImage ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                              src={`${uploadsBase}/${firstImage.filePath}`}
                                              alt={product?.name || "Product"}
                                              className="h-full w-full object-cover"
                                              loading="lazy"
                                            />
                                          ) : null}
                                        </div>
                                        <div>
                                          <div className="flex flex-wrap items-start justify-between gap-2">
                                            <div className="min-w-0">
                                              <p className="text-sm font-semibold text-slate-900">
                                                {product?.name || item.productId}
                                              </p>
                                              {product?.slug ? (
                                                <p className="text-xs text-slate-500">/{product.slug}</p>
                                              ) : null}
                                            </div>
                                            <div className="text-right">
                                              <p className="text-xs text-slate-500">Qty</p>
                                              <p className="text-sm font-semibold text-slate-900">{item.quantity}</p>
                                            </div>
                                            <div className="text-right">
                                              <p className="text-xs text-slate-500">Line total</p>
                                              <p className="text-sm font-semibold text-slate-900">
                                                Rs {Number.isFinite(lineTotal) ? lineTotal.toFixed(2) : "0.00"}
                                              </p>
                                            </div>
                                          </div>

                                          {item.notes ? (
                                            <div className="mt-2 rounded border border-slate-200 bg-slate-50 p-2">
                                              <p className="text-xs font-semibold text-slate-600">Item notes</p>
                                              <p className="mt-1 text-xs text-slate-700 whitespace-pre-line">{item.notes}</p>
                                            </div>
                                          ) : null}

                                          {designFiles.length ? (
                                            <div className="mt-3">
                                              <p className="text-xs font-semibold text-slate-600">Design files</p>
                                              <div className="mt-2 grid grid-cols-3 gap-2">
                                                {designFiles.map((file) => {
                                                  const url = `${uploadsBase}/${file.filePath}`;
                                                  const isImage = file.mimeType.startsWith("image/");
                                                  return isImage ? (
                                                    <a key={file.id} href={url} target="_blank" rel="noreferrer">
                                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                                      <img
                                                        src={url}
                                                        alt="Design"
                                                        className="h-20 w-full rounded object-cover"
                                                        loading="lazy"
                                                      />
                                                    </a>
                                                  ) : (
                                                    <a
                                                      key={file.id}
                                                      href={url}
                                                      target="_blank"
                                                      rel="noreferrer"
                                                      className="flex h-20 items-center justify-center rounded border border-slate-200 bg-white text-[11px] font-semibold text-[#2874f0]"
                                                    >
                                                      View file
                                                    </a>
                                                  );
                                                })}
                                              </div>
                                            </div>
                                          ) : item.designFilePath ? (
                                            <div className="mt-3">
                                              <p className="text-xs font-semibold text-slate-600">Design file</p>
                                              <a
                                                className="mt-1 inline-block text-xs font-semibold text-[#2874f0]"
                                                href={`${uploadsBase}/${item.designFilePath}`}
                                                target="_blank"
                                                rel="noreferrer"
                                              >
                                                View file
                                              </a>
                                            </div>
                                          ) : null}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                  </>
                );
              })}
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
