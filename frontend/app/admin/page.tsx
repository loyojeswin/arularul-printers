"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE_URL, apiFetch, apiUpload } from "@/lib/api";
import { getStoredUser, getToken } from "@/lib/auth";
import { ApiUser, Order, Product, RevenueSummary } from "@/lib/types";

const statuses = ["PENDING", "IN_REVIEW", "PRINTING", "COMPLETED", "DELIVERED"] as const;

interface ProductForm {
  name: string;
  slug: string;
  description: string;
  basePrice: string;
  isActive: boolean;
}

const initialProductForm: ProductForm = {
  name: "",
  slug: "",
  description: "",
  basePrice: "",
  isActive: true
};

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function AdminPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [summary, setSummary] = useState<RevenueSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingProduct, setSavingProduct] = useState(false);
  const [uploadingProductId, setUploadingProductId] = useState<string | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productForm, setProductForm] = useState<ProductForm>(initialProductForm);
  const [mediaFilesByProduct, setMediaFilesByProduct] = useState<Record<string, File[]>>({});

  const productSubmitText = useMemo(
    () => (editingProductId ? "Update Product" : "Create Product"),
    [editingProductId]
  );

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

  useEffect(() => {
    const token = getToken();
    const user = getStoredUser<ApiUser>();
    if (!token || !user) {
      router.push("/login");
      return;
    }
    if (user.role !== "ADMIN") {
      router.push("/dashboard");
      return;
    }

    void loadAdminData();
  }, [router]);

  async function updateStatus(orderId: string, status: (typeof statuses)[number]) {
    try {
      await apiFetch(`/admin/orders/${orderId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status })
      });
      await loadAdminData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Status update failed");
    }
  }

  function startEditProduct(product: Product) {
    setEditingProductId(product.id);
    setProductForm({
      name: product.name,
      slug: product.slug,
      description: product.description || "",
      basePrice: String(product.basePrice),
      isActive: product.isActive ?? true
    });
  }

  function resetProductForm() {
    setEditingProductId(null);
    setProductForm(initialProductForm);
  }

  async function onSaveProduct(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSavingProduct(true);

    try {
      const payload = {
        name: productForm.name,
        slug: productForm.slug,
        description: productForm.description,
        basePrice: Number(productForm.basePrice),
        isActive: productForm.isActive
      };

      if (editingProductId) {
        await apiFetch(`/admin/products/${editingProductId}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });
      } else {
        await apiFetch("/admin/products", {
          method: "POST",
          body: JSON.stringify(payload)
        });
      }

      resetProductForm();
      await loadAdminData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Product save failed");
    } finally {
      setSavingProduct(false);
    }
  }

  async function deactivateProduct(productId: string) {
    try {
      await apiFetch(`/admin/products/${productId}`, {
        method: "DELETE"
      });
      await loadAdminData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Product delete failed");
    }
  }

  async function activateProduct(productId: string) {
    try {
      await apiFetch(`/admin/products/${productId}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: true })
      });
      await loadAdminData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Product activation failed");
    }
  }

  async function uploadProductMedia(productId: string) {
    const files = mediaFilesByProduct[productId] || [];
    if (files.length === 0) {
      setError("Select one or more media files first");
      return;
    }

    setUploadingProductId(productId);
    setError(null);

    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));
      await apiUpload(`/admin/products/${productId}/media`, formData);
      setMediaFilesByProduct((prev) => ({ ...prev, [productId]: [] }));
      await loadAdminData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Media upload failed");
    } finally {
      setUploadingProductId(null);
    }
  }

  async function deleteProductMedia(productId: string, mediaId: string) {
    try {
      await apiFetch(`/admin/products/${productId}/media/${mediaId}`, {
        method: "DELETE"
      });
      await loadAdminData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Media delete failed");
    }
  }

  return (
    <section className="space-y-6">
      <h1 className="text-3xl font-bold">Admin Panel</h1>

      {summary ? (
        <div className="rounded bg-white p-4 shadow-sm">
          <p>Total paid revenue: Rs {summary.totalRevenue.toFixed(2)}</p>
          <p>Paid orders: {summary.orderCount}</p>
        </div>
      ) : null}

      {loading ? <p>Loading admin data...</p> : null}
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <form onSubmit={onSaveProduct} className="grid gap-3 rounded bg-white p-4 shadow-sm">
          <h2 className="text-xl font-semibold">Product CRUD</h2>
          <input
            className="rounded border p-2"
            placeholder="Product Name (e.g., 12x18 photo frame)"
            value={productForm.name}
            onChange={(event) =>
              setProductForm((prev) => ({
                ...prev,
                name: event.target.value,
                slug: editingProductId ? prev.slug : slugify(event.target.value)
              }))
            }
            required
          />
          <input
            className="rounded border p-2"
            placeholder="Slug (e.g., 12x18-photo-frame)"
            value={productForm.slug}
            onChange={(event) => setProductForm((prev) => ({ ...prev, slug: slugify(event.target.value) }))}
            required
          />
          <textarea
            className="rounded border p-2"
            rows={3}
            placeholder="Description"
            value={productForm.description}
            onChange={(event) => setProductForm((prev) => ({ ...prev, description: event.target.value }))}
          />
          <input
            className="rounded border p-2"
            type="number"
            min={0.01}
            step={0.01}
            placeholder="Base Price"
            value={productForm.basePrice}
            onChange={(event) => setProductForm((prev) => ({ ...prev, basePrice: event.target.value }))}
            required
          />

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={productForm.isActive}
              onChange={(event) => setProductForm((prev) => ({ ...prev, isActive: event.target.checked }))}
            />
            Active Product
          </label>

          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded bg-brand px-3 py-2 text-white disabled:opacity-60"
              disabled={savingProduct}
            >
              {savingProduct ? "Saving..." : productSubmitText}
            </button>
            {editingProductId ? (
              <button type="button" className="rounded border px-3 py-2" onClick={resetProductForm}>
                Cancel Edit
              </button>
            ) : null}
          </div>
        </form>

        <div className="rounded bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-xl font-semibold">Products</h2>
          <div className="grid gap-4">
            {products.map((product) => (
              <article key={product.id} className="rounded border p-3">
                <p className="font-semibold">{product.name}</p>
                <p className="text-xs text-slate-500">Slug: {product.slug}</p>
                <p className="text-sm text-slate-600">Base: Rs {Number(product.basePrice).toFixed(2)}</p>
                <p className="text-sm text-slate-600">Status: {product.isActive ? "Active" : "Inactive"}</p>

                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded border border-brand px-2 py-1 text-sm text-brand"
                    onClick={() => startEditProduct(product)}
                  >
                    Edit
                  </button>
                  {product.isActive ? (
                    <button
                      type="button"
                      className="rounded border px-2 py-1 text-sm"
                      onClick={() => deactivateProduct(product.id)}
                    >
                      Delete (Deactivate)
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="rounded border px-2 py-1 text-sm"
                      onClick={() => activateProduct(product.id)}
                    >
                      Activate
                    </button>
                  )}
                </div>

                <div className="mt-3 rounded bg-slate-50 p-2">
                  <p className="mb-2 text-sm font-medium">Product Media (Images/Videos)</p>
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={(event) =>
                      setMediaFilesByProduct((prev) => ({
                        ...prev,
                        [product.id]: Array.from(event.target.files || [])
                      }))
                    }
                  />
                  <button
                    type="button"
                    className="mt-2 rounded bg-brand px-2 py-1 text-sm text-white disabled:opacity-60"
                    onClick={() => uploadProductMedia(product.id)}
                    disabled={uploadingProductId === product.id}
                  >
                    {uploadingProductId === product.id ? "Uploading..." : "Upload Media"}
                  </button>

                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {(product.media || []).map((media) => (
                      <div key={media.id} className="rounded border bg-white p-2">
                        {media.fileType === "VIDEO" ? (
                          <video
                            className="h-24 w-full rounded object-cover"
                            controls
                            src={`${API_BASE_URL.replace(/\/api$/, "")}/uploads/${media.filePath}`}
                          />
                        ) : (
                          <img
                            className="h-24 w-full rounded object-cover"
                            src={`${API_BASE_URL.replace(/\/api$/, "")}/uploads/${media.filePath}`}
                            alt={product.name}
                          />
                        )}
                        <button
                          type="button"
                          className="mt-2 rounded border px-2 py-1 text-xs"
                          onClick={() => deleteProductMedia(product.id, media.id)}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        <h2 className="text-2xl font-semibold">Orders</h2>
        {orders.map((order) => (
          <article key={order.id} className="rounded bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">Order #{order.id.slice(-8)}</p>
                <p className="text-sm text-slate-600">Customer: {order.user?.name || "-"}</p>
                <p className="text-sm text-slate-600">Payment: {order.payment?.status || "N/A"}</p>
                <p className="text-sm text-slate-600">Total: Rs {Number(order.totalAmount).toFixed(2)}</p>
              </div>
              <select
                className="rounded border p-2 text-sm"
                value={order.status}
                onChange={(event) => updateStatus(order.id, event.target.value as (typeof statuses)[number])}
              >
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
