"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE_URL, apiDownload, apiFetch } from "@/lib/api";
import { fetchProfile } from "@/lib/auth";
import { Order } from "@/lib/types";
import { clearCart, upsertCartItem } from "@/lib/user-data";

const currentStatuses = new Set<Order["status"]>(["PENDING", "IN_REVIEW", "PRINTING"]);

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return value;
  }
}

function statusBadge(status: Order["status"]) {
  if (status === "PENDING") return "bg-amber-100 text-amber-800";
  if (status === "IN_REVIEW") return "bg-sky-100 text-sky-800";
  if (status === "PRINTING") return "bg-indigo-100 text-indigo-800";
  if (status === "COMPLETED") return "bg-emerald-100 text-emerald-800";
  return "bg-green-100 text-green-800";
}

function paymentBadge(status?: string | null) {
  const value = (status || "N/A").toUpperCase();
  if (value === "PAID") return "bg-emerald-100 text-emerald-800";
  if (value === "FAILED") return "bg-rose-100 text-rose-800";
  if (value === "REFUNDED") return "bg-slate-200 text-slate-700";
  return "bg-amber-100 text-amber-800";
}

export default function DashboardPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"current" | "past">("current");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

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
    async function init() {
      try {
        await fetchProfile();
      } catch {
        router.push("/login");
        return;
      }
      await loadOrders();
    }

    void init();
  }, [router]);

  useEffect(() => {
    if (!orders.length) return;
    const hasCurrent = orders.some((order) => currentStatuses.has(order.status));
    setActiveTab(hasCurrent ? "current" : "past");
  }, [orders]);

  async function handleReorder(order: Order) {
    try {
      await clearCart();
      await Promise.all(order.items.map((item) => upsertCartItem(item.productId, Math.max(1, item.quantity || 1))));
      router.push("/checkout");
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

  const currentOrders = useMemo(() => orders.filter((order) => currentStatuses.has(order.status)), [orders]);
  const pastOrders = useMemo(() => orders.filter((order) => !currentStatuses.has(order.status)), [orders]);
  const totalCurrent = currentOrders.length;
  const totalPast = pastOrders.length;

  const uploadsBase = `${API_BASE_URL.replace(/\/api$/, "")}/uploads`;

  function toggleExpanded(orderId: string) {
    setExpanded((prev) => ({ ...prev, [orderId]: !prev[orderId] }));
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Orders</h1>
          <p className="mt-1 text-sm text-slate-600">Current orders first. Tap an order to see full details.</p>
        </div>
        <Link href="/products" className="rounded-lg bg-[#2874f0] px-4 py-2 text-sm font-semibold text-white">
          Continue shopping
        </Link>
      </div>
      {loading ? <p>Loading orders...</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {!loading && orders.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="text-slate-700">No orders yet.</p>
          <Link href="/products" className="mt-2 inline-block text-sm font-semibold text-[#2874f0]">
            Browse products
          </Link>
        </div>
      ) : null}

      {orders.length ? (
        <>
          <div className="flex gap-2 rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
            <button
              type="button"
              onClick={() => setActiveTab("current")}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold ${
                activeTab === "current" ? "bg-[#2874f0] text-white" : "bg-transparent text-slate-700"
              }`}
            >
              Current ({totalCurrent})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("past")}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold ${
                activeTab === "past" ? "bg-[#2874f0] text-white" : "bg-transparent text-slate-700"
              }`}
            >
              Past ({totalPast})
            </button>
          </div>

          <div className="grid gap-3">
            {(activeTab === "current" ? currentOrders : pastOrders).map((order) => {
              const isOpen = !!expanded[order.id];
              const total = Number(order.totalAmount);
              const paymentStatus = order.payment?.status || "N/A";
              const itemCount = order.items.length;

              return (
                <article
                  key={order.id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() => toggleExpanded(order.id)}
                    className="w-full text-left"
                  >
                    <div className="flex items-stretch">
                      <div className={`w-2 ${statusBadge(order.status).split(" ")[0]}`} />
                      <div className="flex flex-1 flex-wrap items-center justify-between gap-3 p-4">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">Order #{order.id.slice(-8)}</p>
                          <p className="mt-1 text-xs text-slate-500">{formatDate(order.createdAt)} · {itemCount} item(s)</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusBadge(order.status)}`}>
                              {order.status.replace("_", " ")}
                            </span>
                            <span className={`rounded-full px-2 py-1 text-xs font-semibold ${paymentBadge(paymentStatus)}`}>
                              {paymentStatus}
                            </span>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-xs text-slate-500">Total</p>
                          <p className="text-lg font-extrabold text-slate-900">
                            Rs {Number.isFinite(total) ? total.toFixed(2) : "0.00"}
                          </p>
                          <p className="mt-1 text-xs font-semibold text-[#2874f0]">{isOpen ? "Hide details" : "View details"}</p>
                        </div>
                      </div>
                    </div>
                  </button>

                  <div className="px-4 pb-4">
                    <div className="grid gap-2">
                      {order.items.slice(0, 3).map((item) => {
                        const product = item.product;
                        const media = product?.media || [];
                        const firstImage = media.find((m) => m.fileType === "IMAGE") || media[0] || null;
                        const lineTotal = Number(item.lineTotal);

                        return (
                          <div key={item.id} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <div className="h-14 w-14 overflow-hidden rounded-lg bg-white">
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
                            <div className="min-w-0 flex-1">
                              <p className="line-clamp-1 text-sm font-semibold text-slate-900">{product?.name || item.productId}</p>
                              {product?.description ? (
                                <p className="mt-0.5 line-clamp-1 text-xs text-slate-600">{product.description}</p>
                              ) : null}
                              <p className="mt-1 text-xs text-slate-500">
                                Qty: {item.quantity} · Amount: Rs {Number.isFinite(lineTotal) ? lineTotal.toFixed(2) : "0.00"}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                      {order.items.length > 3 ? (
                        <p className="text-xs font-semibold text-slate-600">+{order.items.length - 3} more item(s)</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="border-t border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleReorder(order)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800"
                      >
                        Reorder
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInvoiceDownload(order.id)}
                        className="rounded-lg bg-[#2874f0] px-3 py-2 text-sm font-semibold text-white"
                      >
                        Invoice
                      </button>
                    </div>
                  </div>

                  {isOpen ? (
                    <div className="p-4">
                      {order.notes ? (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Delivery / Notes</p>
                          <p className="mt-2 whitespace-pre-line text-sm text-slate-800">{order.notes}</p>
                        </div>
                      ) : null}

                      <div className="mt-4 space-y-3">
                        {order.items.map((item) => {
                          const designFiles = item.designFiles || [];
                          const lineTotal = Number(item.lineTotal);

                          return (
                            <div key={item.id} className="rounded-xl border border-slate-200 bg-white p-3">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-slate-900">Item {item.productId.slice(-6)}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs text-slate-500">Qty</p>
                                  <p className="text-sm font-semibold text-slate-900">{item.quantity}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs text-slate-500">Amount</p>
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
                                    {designFiles.slice(0, 6).map((file) => {
                                      const url = `${uploadsBase}/${file.filePath}`;
                                      const isImage = file.mimeType.startsWith("image/");
                                      return isImage ? (
                                        <a key={file.id} href={url} target="_blank" rel="noreferrer">
                                          {/* eslint-disable-next-line @next/next/no-img-element */}
                                          <img src={url} alt="Design" className="h-20 w-full rounded object-cover" loading="lazy" />
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
                                  {designFiles.length > 6 ? (
                                    <p className="mt-2 text-xs text-slate-500">+{designFiles.length - 6} more file(s)</p>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}
                </article>
              );
            })}

            {activeTab === "current" && totalCurrent === 0 ? (
              <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">No current orders.</p>
            ) : null}
            {activeTab === "past" && totalPast === 0 ? (
              <p className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">No past orders.</p>
            ) : null}
          </div>
        </>
      ) : null}
    </section>
  );
}
