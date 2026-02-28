"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { ProductMediaCarousel } from "@/components/product-media-carousel";
import { API_BASE_URL, apiFetch, apiUpload } from "@/lib/api";
import { Product, ProductMedia } from "@/lib/types";

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

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingProduct, setSavingProduct] = useState(false);
  const [removingMediaId, setRemovingMediaId] = useState<string | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productForm, setProductForm] = useState<ProductForm>(initialProductForm);
  const [modalMedia, setModalMedia] = useState<ProductMedia[]>([]);
  const [modalFiles, setModalFiles] = useState<File[]>([]);

  const productSubmitText = useMemo(
    () => (editingProductId ? "Update Product" : "Create Product"),
    [editingProductId]
  );

  async function loadProducts() {
    setLoading(true);
    setError(null);
    try {
      const allProducts = await apiFetch<Product[]>("/admin/products");
      setProducts(allProducts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load products");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProducts();
  }, []);

  function resetProductForm() {
    setEditingProductId(null);
    setProductForm(initialProductForm);
    setModalMedia([]);
    setModalFiles([]);
  }

  function openCreateProductModal() {
    resetProductForm();
    setIsProductModalOpen(true);
  }

  function closeProductModal() {
    setIsProductModalOpen(false);
    resetProductForm();
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
    setModalMedia([...(product.media || [])]);
    setModalFiles([]);
    setIsProductModalOpen(true);
  }

  function onSelectModalFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;
    setModalFiles((prev) => [...prev, ...files]);
    event.target.value = "";
  }

  function removeQueuedFile(index: number) {
    setModalFiles((prev) => prev.filter((_, fileIndex) => fileIndex !== index));
  }

  async function uploadFilesForProduct(productId: string) {
    if (modalFiles.length === 0) return;
    const formData = new FormData();
    modalFiles.forEach((file) => formData.append("files", file));
    await apiUpload(`/admin/products/${productId}/media`, formData);
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

      let productId = editingProductId;
      if (editingProductId) {
        const updated = await apiFetch<Product>(`/admin/products/${editingProductId}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });
        productId = updated.id;
      } else {
        const created = await apiFetch<Product>("/admin/products", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        productId = created.id;
      }

      if (productId) {
        await uploadFilesForProduct(productId);
      }

      closeProductModal();
      await loadProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Product save failed");
    } finally {
      setSavingProduct(false);
    }
  }

  async function deactivateProduct(productId: string) {
    try {
      await apiFetch(`/admin/products/${productId}`, { method: "DELETE" });
      await loadProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Product deactivation failed");
    }
  }

  async function activateProduct(productId: string) {
    try {
      await apiFetch(`/admin/products/${productId}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: true })
      });
      await loadProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Product activation failed");
    }
  }

  async function deleteProductMedia(productId: string, mediaId: string) {
    setRemovingMediaId(mediaId);
    try {
      await apiFetch(`/admin/products/${productId}/media/${mediaId}`, { method: "DELETE" });
      setModalMedia((prev) => prev.filter((media) => media.id !== mediaId));
      await loadProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Media delete failed");
    } finally {
      setRemovingMediaId(null);
    }
  }

  return (
    <section className="space-y-4">
      {loading ? (
        <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">Loading products...</p>
      ) : null}
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between rounded bg-slate-50 px-4 py-3">
          <p className="text-sm text-slate-700">{products.length} products in catalog</p>
          <button
            type="button"
            className="rounded bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
            onClick={openCreateProductModal}
          >
            Add Product
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {products.map((product) => (
            <article key={product.id} className="rounded bg-white p-3 shadow-sm transition hover:shadow-md">
              <div className="mb-3">
                <ProductMediaCarousel media={product.media || []} productName={product.name} className="h-48" />
              </div>

              <h3 className="line-clamp-1 text-base font-semibold text-slate-900">{product.name}</h3>
              <p className="mt-1 line-clamp-2 min-h-10 text-sm text-slate-600">{product.description || "No description"}</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">From Rs {Number(product.basePrice).toFixed(2)}</p>

              <div className="mt-3 flex items-center justify-between gap-2">
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${
                    product.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {product.isActive ? "Active" : "Inactive"}
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    className="rounded border px-2 py-1"
                    onClick={() => startEditProduct(product)}
                  >
                    Edit
                  </button>
                  {product.isActive ? (
                    <button
                      type="button"
                      className="rounded bg-rose-600 px-2 py-1 font-semibold text-white"
                      onClick={() => deactivateProduct(product.id)}
                    >
                      Deactivate
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="rounded bg-emerald-600 px-2 py-1 font-semibold text-white"
                      onClick={() => activateProduct(product.id)}
                    >
                      Activate
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      {isProductModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={closeProductModal}>
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">{editingProductId ? "Edit Product" : "Add Product"}</h3>
              <button
                type="button"
                className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700"
                onClick={closeProductModal}
              >
                Close
              </button>
            </div>

            <form onSubmit={onSaveProduct} className="grid gap-3">
              <input
                className="rounded-lg border border-slate-300 p-2.5 text-sm outline-none transition focus:border-slate-500"
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
                className="rounded-lg border border-slate-300 p-2.5 text-sm outline-none transition focus:border-slate-500"
                placeholder="Slug (e.g., 12x18-photo-frame)"
                value={productForm.slug}
                onChange={(event) => setProductForm((prev) => ({ ...prev, slug: slugify(event.target.value) }))}
                required
              />
              <textarea
                className="rounded-lg border border-slate-300 p-2.5 text-sm outline-none transition focus:border-slate-500"
                rows={3}
                placeholder="Description"
                value={productForm.description}
                onChange={(event) => setProductForm((prev) => ({ ...prev, description: event.target.value }))}
              />
              <input
                className="rounded-lg border border-slate-300 p-2.5 text-sm outline-none transition focus:border-slate-500"
                type="number"
                min={0.01}
                step={0.01}
                placeholder="Base Price"
                value={productForm.basePrice}
                onChange={(event) => setProductForm((prev) => ({ ...prev, basePrice: event.target.value }))}
                required
              />
              <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={productForm.isActive}
                  onChange={(event) => setProductForm((prev) => ({ ...prev, isActive: event.target.checked }))}
                />
                Active Product
              </label>

              <div className="rounded-lg border border-slate-200 p-3">
                <p className="mb-2 text-sm font-semibold text-slate-800">Add Images / Videos</p>
                <input
                  className="w-full rounded-lg border border-slate-300 p-2 text-sm"
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={onSelectModalFiles}
                />
                {modalFiles.length > 0 ? (
                  <div className="mt-2 space-y-1">
                    {modalFiles.map((file, index) => (
                      <div key={`${file.name}-${index}`} className="flex items-center justify-between rounded bg-slate-50 px-2 py-1 text-xs">
                        <span className="line-clamp-1">{file.name}</span>
                        <button
                          type="button"
                          className="rounded border border-slate-300 px-2 py-0.5"
                          onClick={() => removeQueuedFile(index)}
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-slate-500">No new files selected.</p>
                )}
              </div>

              {editingProductId ? (
                <div className="rounded-lg border border-slate-200 p-3">
                  <p className="mb-2 text-sm font-semibold text-slate-800">Existing Media</p>
                  {modalMedia.length === 0 ? (
                    <p className="text-xs text-slate-500">No media uploaded for this product.</p>
                  ) : (
                    <div className="grid gap-2 sm:grid-cols-2">
                      {modalMedia.map((media) => (
                        <div key={media.id} className="rounded border border-slate-200 bg-slate-50 p-2">
                          {media.fileType === "VIDEO" ? (
                            <video
                              controls
                              className="h-24 w-full rounded object-cover"
                              src={`${API_BASE_URL.replace(/\/api$/, "")}/uploads/${media.filePath}`}
                            />
                          ) : (
                            <img
                              className="h-24 w-full rounded object-cover"
                              src={`${API_BASE_URL.replace(/\/api$/, "")}/uploads/${media.filePath}`}
                              alt={productForm.name || "Product media"}
                            />
                          )}
                          <button
                            type="button"
                            className="mt-2 w-full rounded border border-rose-300 bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 disabled:opacity-60"
                            onClick={() => deleteProductMedia(editingProductId, media.id)}
                            disabled={removingMediaId === media.id}
                          >
                            {removingMediaId === media.id ? "Removing..." : "Remove"}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-500">Media will be uploaded right after product creation.</p>
              )}

              <div className="mt-1 flex flex-wrap gap-2">
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
                  disabled={savingProduct}
                >
                  {savingProduct ? "Saving..." : productSubmitText}
                </button>
                <button
                  type="button"
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700"
                  onClick={closeProductModal}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </section>
  );
}
