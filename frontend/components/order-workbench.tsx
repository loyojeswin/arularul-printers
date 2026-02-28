"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { apiFetch, apiUpload } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { Order, Product } from "@/lib/types";

export function OrderWorkbench() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState(100);
  const [paperType, setPaperType] = useState("");
  const [finishType, setFinishType] = useState("");
  const [notes, setNotes] = useState("");
  const [city, setCity] = useState("Thoothukudi");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadProducts() {
      try {
        const data = await apiFetch<Product[]>("/products");
        setProducts(data);
        if (data[0]) {
          setSelectedProductId(data[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load products");
      }
    }

    void loadProducts();
  }, []);

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === selectedProductId),
    [products, selectedProductId]
  );

  const paperOptions = useMemo(
    () =>
      selectedProduct?.pricingOptions.filter((option) => option.optionType === "PAPER") ?? [],
    [selectedProduct]
  );

  const finishOptions = useMemo(
    () =>
      selectedProduct?.pricingOptions.filter((option) => option.optionType === "FINISH") ?? [],
    [selectedProduct]
  );

  useEffect(() => {
    if (paperOptions[0]) setPaperType(paperOptions[0].optionValue);
    if (finishOptions[0]) setFinishType(finishOptions[0].optionValue);
  }, [paperOptions, finishOptions]);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (!getToken()) {
      setError("Please login to place orders");
      return;
    }
    if (!selectedProductId) {
      setError("Please select a product");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append(
        "items",
        JSON.stringify([
          {
            productId: selectedProductId,
            quantity,
            paperType,
            finishType
          }
        ])
      );
      formData.append("notes", notes);
      formData.append("city", city);
      if (file) formData.append("designFile", file);

      const order = await apiUpload<Order>("/orders", formData);
      setSuccess(`Order ${order.id} placed successfully.`);
      setNotes("");
      setFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Order creation failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3 rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold">Place Order</h2>
      <p className="text-sm text-slate-600">Login required. Supports PDF/JPG/PNG upload.</p>

      <select
        className="rounded border p-2"
        value={selectedProductId}
        onChange={(event) => setSelectedProductId(event.target.value)}
      >
        {products.map((product) => (
          <option key={product.id} value={product.id}>
            {product.name}
          </option>
        ))}
      </select>

      <input
        className="rounded border p-2"
        type="number"
        min={1}
        value={quantity}
        onChange={(event) => setQuantity(Number(event.target.value || 1))}
      />

      <select className="rounded border p-2" value={paperType} onChange={(event) => setPaperType(event.target.value)}>
        {paperOptions.map((option) => (
          <option key={option.id} value={option.optionValue}>
            {option.optionValue}
          </option>
        ))}
      </select>

      <select className="rounded border p-2" value={finishType} onChange={(event) => setFinishType(event.target.value)}>
        {finishOptions.map((option) => (
          <option key={option.id} value={option.optionValue}>
            {option.optionValue}
          </option>
        ))}
      </select>

      <input className="rounded border p-2" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(event) => setFile(event.target.files?.[0] || null)} />

      <textarea
        className="rounded border p-2"
        placeholder="Notes"
        rows={3}
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
      />

      <input
        className="rounded border p-2"
        type="text"
        placeholder="City"
        value={city}
        onChange={(event) => setCity(event.target.value)}
      />

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-700">{success}</p> : null}

      <button className="rounded bg-brand px-3 py-2 text-white disabled:opacity-60" type="submit" disabled={loading}>
        {loading ? "Placing order..." : "Place Order"}
      </button>
    </form>
  );
}
