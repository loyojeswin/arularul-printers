"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Order, Product, RevenueSummary } from "@/lib/types";

const statuses = ["PENDING", "IN_REVIEW", "PRINTING", "COMPLETED", "DELIVERED"] as const;
const ReactECharts = dynamic(() => import("echarts-for-react"), { ssr: false });

export default function AdminDashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [summary, setSummary] = useState<RevenueSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const activeProducts = useMemo(() => products.filter((item) => item.isActive).length, [products]);
  const inactiveProducts = useMemo(() => products.length - activeProducts, [products.length, activeProducts]);
  const inProgressOrders = useMemo(
    () => orders.filter((item) => item.status === "PENDING" || item.status === "IN_REVIEW").length,
    [orders]
  );

  const monthlyRevenueOption = useMemo(() => {
    const monthMap = new Map<string, number>();
    orders.forEach((order) => {
      const key = new Date(order.createdAt).toLocaleDateString("en-IN", {
        month: "short",
        year: "2-digit"
      });
      monthMap.set(key, (monthMap.get(key) || 0) + Number(order.totalAmount));
    });

    return {
      tooltip: { trigger: "axis" },
      grid: { left: 40, right: 20, top: 30, bottom: 30 },
      xAxis: { type: "category", data: Array.from(monthMap.keys()), axisTick: { show: false } },
      yAxis: { type: "value" },
      series: [
        {
          type: "line",
          smooth: true,
          data: Array.from(monthMap.values()).map((value) => Number(value.toFixed(2))),
          areaStyle: { opacity: 0.15 },
          lineStyle: { width: 3, color: "#2563eb" },
          itemStyle: { color: "#2563eb" }
        }
      ]
    };
  }, [orders]);

  const orderStatusOption = useMemo(() => {
    const data = statuses.map((status) => ({
      name: status.replace("_", " "),
      value: orders.filter((order) => order.status === status).length
    }));

    return {
      tooltip: { trigger: "item" },
      legend: { bottom: 0 },
      series: [
        {
          type: "pie",
          radius: ["45%", "70%"],
          avoidLabelOverlap: false,
          label: { show: false },
          data
        }
      ]
    };
  }, [orders]);

  const productStatusOption = useMemo(
    () => ({
      tooltip: { trigger: "axis" },
      grid: { left: 30, right: 10, top: 20, bottom: 30 },
      xAxis: { type: "category", data: ["Active", "Inactive"] },
      yAxis: { type: "value" },
      series: [
        {
          type: "bar",
          data: [
            { value: activeProducts, itemStyle: { color: "#16a34a" } },
            { value: inactiveProducts, itemStyle: { color: "#64748b" } }
          ],
          barWidth: "44%"
        }
      ]
    }),
    [activeProducts, inactiveProducts]
  );

  useEffect(() => {
    async function loadAdminData() {
      setLoading(true);
      setError(null);

      try {
        const [allOrders, revenue, allProducts] = await Promise.all([
          apiFetch<Order[]>("/admin/orders"),
          apiFetch<RevenueSummary>("/admin/analytics/revenue"),
          apiFetch<Product[]>("/admin/products")
        ]);
        setOrders(allOrders);
        setSummary(revenue);
        setProducts(allProducts);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load admin data");
      } finally {
        setLoading(false);
      }
    }

    void loadAdminData();
  }, []);

  return (
    <section className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total Revenue</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">Rs {summary ? summary.totalRevenue.toFixed(2) : "0.00"}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Paid Orders</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{summary?.orderCount || 0}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Active Products</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{activeProducts}</p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Pending / Review</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{inProgressOrders}</p>
        </article>
      </div>

      {loading ? (
        <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">Loading dashboard...</p>
      ) : null}
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-5">
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-3">
          <h2 className="mb-2 text-base font-semibold text-slate-900">Monthly Revenue Trend</h2>
          <ReactECharts option={monthlyRevenueOption} style={{ height: 300 }} />
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-base font-semibold text-slate-900">Order Status</h2>
          <ReactECharts option={orderStatusOption} style={{ height: 300 }} />
        </article>
        <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-base font-semibold text-slate-900">Product Status</h2>
          <ReactECharts option={productStatusOption} style={{ height: 300 }} />
        </article>
      </div>
    </section>
  );
}
