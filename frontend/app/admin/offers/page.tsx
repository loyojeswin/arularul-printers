"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { API_BASE_URL, apiFetch, apiUpload } from "@/lib/api";
import { AdminOffer, Product } from "@/lib/types";

interface OfferForm {
  title: string;
  slug: string;
  description: string;
  isActive: boolean;
  productIds: string[];
}

const initialOfferForm: OfferForm = {
  title: "",
  slug: "",
  description: "",
  isActive: true,
  productIds: []
};

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export default function AdminOffersPage() {
  const [offers, setOffers] = useState<AdminOffer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);
  const [savingOffer, setSavingOffer] = useState(false);
  const [offerForm, setOfferForm] = useState<OfferForm>(initialOfferForm);
  const [offerImage, setOfferImage] = useState<File | null>(null);
  const [existingImagePath, setExistingImagePath] = useState<string | null>(null);

  const submitText = useMemo(() => (editingOfferId ? "Update Offer" : "Create Offer"), [editingOfferId]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [allOffers, allProducts] = await Promise.all([
        apiFetch<AdminOffer[]>("/admin/offers"),
        apiFetch<Product[]>("/admin/products")
      ]);
      setOffers(allOffers);
      setProducts(allProducts);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load offers");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, []);

  function resetForm() {
    setEditingOfferId(null);
    setOfferForm(initialOfferForm);
    setOfferImage(null);
    setExistingImagePath(null);
  }

  function openCreateModal() {
    resetForm();
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    resetForm();
  }

  function openEditModal(offer: AdminOffer) {
    setEditingOfferId(offer.id);
    setOfferForm({
      title: offer.title,
      slug: offer.slug,
      description: offer.description || "",
      isActive: offer.isActive,
      productIds: offer.products.map((row) => row.productId)
    });
    setOfferImage(null);
    setExistingImagePath(offer.imagePath || null);
    setIsModalOpen(true);
  }

  function toggleProduct(productId: string) {
    setOfferForm((prev) => ({
      ...prev,
      productIds: prev.productIds.includes(productId)
        ? prev.productIds.filter((id) => id !== productId)
        : [...prev.productIds, productId]
    }));
  }

  async function saveOffer(event: FormEvent) {
    event.preventDefault();
    setSavingOffer(true);
    setError(null);

    try {
      const payload = {
        title: offerForm.title,
        slug: offerForm.slug,
        description: offerForm.description,
        isActive: offerForm.isActive,
        productIds: offerForm.productIds
      };

      if (editingOfferId) {
        await apiFetch<AdminOffer>(`/admin/offers/${editingOfferId}`, {
          method: "PATCH",
          body: JSON.stringify(payload)
        });
        if (offerImage) {
          const formData = new FormData();
          formData.append("file", offerImage, offerImage.name);
          await apiUpload(`/admin/offers/${editingOfferId}/image`, formData);
        }
      } else {
        const created = await apiFetch<AdminOffer>("/admin/offers", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        if (offerImage) {
          const formData = new FormData();
          formData.append("file", offerImage, offerImage.name);
          await apiUpload(`/admin/offers/${created.id}/image`, formData);
        }
      }

      closeModal();
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save offer");
    } finally {
      setSavingOffer(false);
    }
  }

  async function deactivateOffer(offerId: string) {
    try {
      await apiFetch(`/admin/offers/${offerId}`, { method: "DELETE" });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to deactivate offer");
    }
  }

  async function activateOffer(offerId: string) {
    try {
      await apiFetch(`/admin/offers/${offerId}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive: true })
      });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to activate offer");
    }
  }

  return (
    <section className="space-y-4">
      {loading ? (
        <p className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600">Loading offers...</p>
      ) : null}
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between rounded bg-slate-50 px-4 py-3">
          <p className="text-sm text-slate-700">{offers.length} offers</p>
          <button type="button" className="rounded bg-slate-900 px-3 py-2 text-sm font-semibold text-white" onClick={openCreateModal}>
            Add Offer
          </button>
        </div>

        <div className="space-y-3">
          {offers.map((offer) => (
            <article key={offer.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  {offer.imagePath ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`${API_BASE_URL.replace(/\/api$/, "")}/uploads/${offer.imagePath}`}
                      alt={offer.title}
                      className="mb-2 h-20 w-32 rounded object-cover"
                      loading="lazy"
                    />
                  ) : null}
                  <p className="font-semibold text-slate-900">{offer.title}</p>
                  <p className="text-xs text-slate-500">Slug: {offer.slug}</p>
                  <p className="mt-1 text-sm text-slate-600">{offer.description || "No description"}</p>
                  <p className="mt-1 text-xs text-slate-500">Products: {offer.products.length}</p>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${
                    offer.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {offer.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="mt-3 flex gap-2 text-xs">
                <button type="button" className="rounded border px-2 py-1" onClick={() => openEditModal(offer)}>
                  Edit
                </button>
                {offer.isActive ? (
                  <button
                    type="button"
                    className="rounded bg-rose-600 px-2 py-1 font-semibold text-white"
                    onClick={() => deactivateOffer(offer.id)}
                  >
                    Deactivate
                  </button>
                ) : (
                  <button
                    type="button"
                    className="rounded bg-emerald-600 px-2 py-1 font-semibold text-white"
                    onClick={() => activateOffer(offer.id)}
                  >
                    Activate
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={closeModal}>
          <div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">{editingOfferId ? "Edit Offer" : "Add Offer"}</h3>
              <button type="button" className="rounded border border-slate-300 px-2 py-1 text-xs" onClick={closeModal}>
                Close
              </button>
            </div>

            <form onSubmit={saveOffer} className="grid gap-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Offer image</p>
                {existingImagePath ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`${API_BASE_URL.replace(/\/api$/, "")}/uploads/${existingImagePath}`}
                    alt="Offer image"
                    className="mt-2 h-28 w-full rounded object-cover"
                  />
                ) : null}
                <input
                  className="mt-2 w-full rounded border border-slate-300 bg-white p-2 text-sm"
                  type="file"
                  accept="image/*"
                  onChange={(event) => setOfferImage(event.target.files?.[0] ?? null)}
                />
                {offerImage ? <p className="mt-1 text-xs text-slate-600">Selected: {offerImage.name}</p> : null}
              </div>
              <input
                className="rounded-lg border border-slate-300 p-2.5 text-sm"
                placeholder="Offer title"
                value={offerForm.title}
                onChange={(event) =>
                  setOfferForm((prev) => ({
                    ...prev,
                    title: event.target.value,
                    slug: editingOfferId ? prev.slug : slugify(event.target.value)
                  }))
                }
                required
              />
              <input
                className="rounded-lg border border-slate-300 p-2.5 text-sm"
                placeholder="offer-slug"
                value={offerForm.slug}
                onChange={(event) => setOfferForm((prev) => ({ ...prev, slug: slugify(event.target.value) }))}
                required
              />
              <textarea
                className="rounded-lg border border-slate-300 p-2.5 text-sm"
                rows={3}
                placeholder="Offer description"
                value={offerForm.description}
                onChange={(event) => setOfferForm((prev) => ({ ...prev, description: event.target.value }))}
              />
              <label className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={offerForm.isActive}
                  onChange={(event) => setOfferForm((prev) => ({ ...prev, isActive: event.target.checked }))}
                />
                Active Offer
              </label>

              <div className="rounded-lg border border-slate-200 p-3">
                <p className="mb-2 text-sm font-semibold text-slate-800">Select Products for Offer</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {products.map((product) => (
                    <label key={product.id} className="flex items-center gap-2 rounded border border-slate-200 px-2 py-1.5 text-sm">
                      <input
                        type="checkbox"
                        checked={offerForm.productIds.includes(product.id)}
                        onChange={() => toggleProduct(product.id)}
                      />
                      <span className="line-clamp-1">{product.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="mt-1 flex gap-2">
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  disabled={savingOffer}
                >
                  {savingOffer ? "Saving..." : submitText}
                </button>
                <button type="button" className="rounded-lg border border-slate-300 px-4 py-2 text-sm" onClick={closeModal}>
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
