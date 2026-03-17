"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { apiUpload, apiFetch } from "@/lib/api";
import { fetchProfile } from "@/lib/auth";
import { clearCart, fetchCart, removeCartItem, upsertCartItem } from "@/lib/user-data";
import { Address, Order, Product, PricingOption } from "@/lib/types";

interface CheckoutLineItem {
  productId: string;
  quantity: number;
  paperType?: string;
  finishType?: string;
}

function optionsByType(pricingOptions: PricingOption[], optionType: string) {
  return pricingOptions.filter((option) => option.optionType === optionType);
}

export default function CheckoutPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [cartItems, setCartItems] = useState<CheckoutLineItem[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [paymentMode, setPaymentMode] = useState<"CASH" | "CARD" | "UPI">("UPI");
  const [designFile, setDesignFile] = useState<File | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [newAddress, setNewAddress] = useState({
    label: "Home",
    fullAddress: "",
    city: "Thoothukudi",
    pincode: "",
    phone: ""
  });

  useEffect(() => {
    async function load() {
      setLoading(true);

      try {
        await fetchProfile();
      } catch {
        router.replace("/login");
        return;
      }

      try {
        const [data, userAddresses, cart] = await Promise.all([
          apiFetch<Product[]>("/products"),
          apiFetch<Address[]>("/addresses"),
          fetchCart()
        ]);

        const normalized = cart.map((item) => {
          const product = data.find((entry) => entry.id === item.productId);
          const paper = product ? optionsByType(product.pricingOptions, "PAPER")[0]?.optionValue : "Standard";
          const finish = product ? optionsByType(product.pricingOptions, "FINISH")[0]?.optionValue : "None";
          return {
            productId: item.productId,
            quantity: Math.max(1, item.quantity || 1),
            paperType: paper || "Standard",
            finishType: finish || "None"
          };
        });

        setCartItems(normalized);
        setProducts(data);
        setAddresses(userAddresses);
        if (userAddresses[0]) {
          const defaultAddress = userAddresses.find((address) => address.isDefault) || userAddresses[0];
          setSelectedAddressId(defaultAddress.id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load checkout data");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [router]);

  const checkoutRows = useMemo(
    () => cartItems.map((item) => ({ item, product: products.find((product) => product.id === item.productId) })).filter((row) => row.product),
    [cartItems, products]
  );

  const subtotal = useMemo(
    () =>
      checkoutRows.reduce(
        (sum, row) => sum + Number((row.product as Product).basePrice) * Math.max(1, row.item.quantity || 1),
        0
      ),
    [checkoutRows]
  );

  const selectedAddress = addresses.find((address) => address.id === selectedAddressId) || null;

  function updateDesignFile(file: File | null) {
    if (!file) {
      setDesignFile(null);
      return;
    }

    const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);
    if (!allowedTypes.has(file.type)) {
      setError("Only PDF, JPG, PNG files are allowed");
      setDesignFile(null);
      return;
    }

    const maxBytes = 15 * 1024 * 1024;
    if (file.size > maxBytes) {
      setError("Design file must be 15MB or less");
      setDesignFile(null);
      return;
    }

    setError(null);
    setDesignFile(file);
  }

  async function updateCartItem(productId: string, patch: Partial<CheckoutLineItem>) {
    const next = cartItems.map((item) => (item.productId === productId ? { ...item, ...patch } : item));
    setCartItems(next);

    if (patch.quantity !== undefined) {
      await upsertCartItem(productId, Math.max(1, patch.quantity));
    }
  }

  async function handleRemove(productId: string) {
    await removeCartItem(productId);
    const next = cartItems.filter((item) => item.productId !== productId);
    setCartItems(next);
  }

  async function saveAddress() {
    if (!newAddress.fullAddress.trim() || !newAddress.city.trim()) {
      setError("Please fill full address and city");
      return;
    }

    try {
      const created = await apiFetch<Address>("/addresses", {
        method: "POST",
        body: JSON.stringify({
          label: newAddress.label.trim() || "Address",
          fullAddress: newAddress.fullAddress.trim(),
          city: newAddress.city.trim(),
          pincode: newAddress.pincode.trim() || undefined,
          phone: newAddress.phone.trim() || undefined,
          isDefault: addresses.length === 0
        })
      });
      const refreshed = await apiFetch<Address[]>("/addresses");
      setAddresses(refreshed);
      setSelectedAddressId(created.id);
      setNewAddress({ label: "Home", fullAddress: "", city: "Thoothukudi", pincode: "", phone: "" });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save address");
    }
  }

  async function placeOrder(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    if (checkoutRows.length === 0) {
      setError("Your cart is empty");
      return;
    }
    if (!selectedAddress) {
      setError("Please select or add a delivery address");
      return;
    }

    setPlacingOrder(true);
    try {
      const items = checkoutRows.map((row) => ({
        productId: (row.product as Product).id,
        quantity: Math.max(1, row.item.quantity || 1),
        paperType: row.item.paperType || "Standard",
        finishType: row.item.finishType || "None"
      }));

      const deliveryNote = `Delivery Address (${selectedAddress.label}): ${selectedAddress.fullAddress}, ${selectedAddress.city} - ${selectedAddress.pincode}. Phone: ${selectedAddress.phone}`;

      const formData = new FormData();
      formData.append("items", JSON.stringify(items));
      formData.append("city", selectedAddress.city);
      formData.append("notes", [deliveryNote, notes].filter(Boolean).join("\n"));
      formData.append("paymentMode", paymentMode);
      if (designFile) {
        formData.append("designFile", designFile, designFile.name);
      }

      const order = await apiUpload<Order>("/orders", formData);
      await clearCart();
      setCartItems([]);
      setSuccess(`Order placed successfully: ${order.id}`);
      setTimeout(() => router.push("/dashboard"), 900);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Order placement failed");
    } finally {
      setPlacingOrder(false);
    }
  }

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">Checkout</h1>

      {loading ? <p>Loading checkout...</p> : null}
      {error ? <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p> : null}
      {success ? <p className="rounded bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p> : null}

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <form className="space-y-4" onSubmit={placeOrder}>
          <div className="rounded bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold">Delivery Address</h2>
            {addresses.length === 0 ? <p className="mt-2 text-sm text-slate-600">No saved addresses. Add one below.</p> : null}
            <div className="mt-3 space-y-2">
              {addresses.map((address) => (
                <label key={address.id} className="flex gap-2 rounded border p-2 text-sm">
                  <input
                    type="radio"
                    name="selected-address"
                    checked={selectedAddressId === address.id}
                    onChange={() => setSelectedAddressId(address.id)}
                  />
                  <span>
                    <span className="font-semibold">{address.label}</span>
                    <br />
                    {address.fullAddress}, {address.city} - {address.pincode}
                    <br />
                    {address.phone}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="rounded bg-white p-4 shadow-sm">
            <h3 className="text-base font-semibold">Add New Address</h3>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <input className="rounded border p-2 text-sm" placeholder="Label (Home/Office)" value={newAddress.label} onChange={(e) => setNewAddress((prev) => ({ ...prev, label: e.target.value }))} />
              <input className="rounded border p-2 text-sm" placeholder="Phone" value={newAddress.phone} onChange={(e) => setNewAddress((prev) => ({ ...prev, phone: e.target.value }))} />
              <input className="rounded border p-2 text-sm sm:col-span-2" placeholder="Full address" value={newAddress.fullAddress} onChange={(e) => setNewAddress((prev) => ({ ...prev, fullAddress: e.target.value }))} />
              <input className="rounded border p-2 text-sm" placeholder="City" value={newAddress.city} onChange={(e) => setNewAddress((prev) => ({ ...prev, city: e.target.value }))} />
              <input className="rounded border p-2 text-sm" placeholder="Pincode" value={newAddress.pincode} onChange={(e) => setNewAddress((prev) => ({ ...prev, pincode: e.target.value }))} />
            </div>
            <button type="button" className="mt-2 rounded border px-3 py-1 text-xs" onClick={() => void saveAddress()}>
              Save Address
            </button>
          </div>

          <div className="rounded bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold">Items & Options</h2>
            <div className="mt-3 space-y-3">
              {checkoutRows.map((row) => {
                const product = row.product as Product;
                const paperOptions = optionsByType(product.pricingOptions, "PAPER");
                const finishOptions = optionsByType(product.pricingOptions, "FINISH");

                return (
                  <article key={product.id} className="rounded border p-3">
                    <p className="font-semibold">{product.name}</p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-3">
                      <input
                        className="rounded border p-2 text-sm"
                        type="number"
                        min={1}
                        value={Math.max(1, row.item.quantity || 1)}
                        onChange={(event) => updateCartItem(product.id, { quantity: Number(event.target.value || 1) })}
                      />

                      <select
                        className="rounded border p-2 text-sm"
                        value={row.item.paperType || paperOptions[0]?.optionValue || "Standard"}
                        onChange={(event) => updateCartItem(product.id, { paperType: event.target.value })}
                      >
                        {(paperOptions.length ? paperOptions : [{ id: "default-paper", optionValue: "Standard", optionType: "PAPER", multiplier: "1", fixedAmount: "0" }]).map((option) => (
                          <option key={option.id} value={option.optionValue}>
                            Paper: {option.optionValue}
                          </option>
                        ))}
                      </select>

                      <select
                        className="rounded border p-2 text-sm"
                        value={row.item.finishType || finishOptions[0]?.optionValue || "None"}
                        onChange={(event) => updateCartItem(product.id, { finishType: event.target.value })}
                      >
                        {(finishOptions.length ? finishOptions : [{ id: "default-finish", optionValue: "None", optionType: "FINISH", multiplier: "1", fixedAmount: "0" }]).map((option) => (
                          <option key={option.id} value={option.optionValue}>
                            Finish: {option.optionValue}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="mt-2 flex gap-2">
                      <button type="button" className="rounded border px-3 py-1 text-xs" onClick={() => void handleRemove(product.id)}>
                        Remove
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>

          <div className="rounded bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold">Design File (Optional)</h2>
            <p className="mt-1 text-xs text-slate-500">Upload PDF/JPG/PNG (max 15MB).</p>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                className="w-full rounded border p-2 text-sm"
                type="file"
                accept="application/pdf,image/jpeg,image/png"
                onChange={(event) => updateDesignFile(event.target.files?.[0] ?? null)}
              />
              {designFile ? (
                <button
                  type="button"
                  className="rounded border px-3 py-2 text-xs"
                  onClick={() => updateDesignFile(null)}
                >
                  Clear
                </button>
              ) : null}
            </div>

            {designFile ? <p className="mt-2 text-xs text-slate-600">Selected: {designFile.name}</p> : null}
          </div>

          <div className="rounded bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold">Payment</h2>
            <div className="mt-2 flex flex-wrap gap-2 text-sm">
              {["UPI", "CARD", "CASH"].map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={`rounded border px-3 py-1 ${paymentMode === mode ? "border-[#2874f0] text-[#2874f0]" : "border-slate-300"}`}
                  onClick={() => setPaymentMode(mode as "CASH" | "CARD" | "UPI")}
                >
                  {mode}
                </button>
              ))}
            </div>
            <textarea
              className="mt-3 w-full rounded border p-2 text-sm"
              rows={3}
              placeholder="Order notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>

          <button
            type="submit"
            className="rounded bg-[#2874f0] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            disabled={placingOrder}
          >
            {placingOrder ? "Placing order..." : "Place Order"}
          </button>
        </form>

        <aside className="rounded bg-white p-4 shadow-sm">
          <h2 className="text-lg font-semibold">Summary</h2>
          <p className="mt-2 text-sm text-slate-600">Items: {checkoutRows.length}</p>
          <p className="mt-1 text-sm text-slate-600">Subtotal: Rs {subtotal.toFixed(2)}</p>
          <p className="mt-3 text-xs text-slate-500">GST and delivery will be calculated after review.</p>
        </aside>
      </div>
    </section>
  );
}
