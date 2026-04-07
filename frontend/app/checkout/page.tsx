"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { API_BASE_URL, apiUpload, apiFetch } from "@/lib/api";
import { fetchProfile } from "@/lib/auth";
import { clearCart, fetchCart, removeCartItem, upsertCartItem } from "@/lib/user-data";
import { Address, Order, Product, PricingOption } from "@/lib/types";

interface CheckoutLineItem {
  productId: string;
  quantity: number;
  paperType?: string;
  finishType?: string;
  notes?: string;
  designFiles?: File[];
}

interface RazorpayCreateOrderResponse {
  orderId: string;
  amount: number;
  currency: string;
  razorpayKeyId: string;
  razorpayOrderId: string;
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
  const [loading, setLoading] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [designPreviewUrls, setDesignPreviewUrls] = useState<Record<string, string[]>>({});

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
            finishType: finish || "None",
            notes: "",
            designFiles: []
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

  function validateDesignFile(file: File | null): string | null {
    if (!file) return null;
    const allowedTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);
    if (!allowedTypes.has(file.type)) {
      return "Only PDF, JPG, PNG files are allowed";
    }

    const maxBytes = 15 * 1024 * 1024;
    if (file.size > maxBytes) {
      return "Design file must be 15MB or less";
    }
    return null;
  }

  useEffect(() => {
    return () => {
      Object.values(designPreviewUrls).flat().forEach((url) => {
        URL.revokeObjectURL(url);
      });
    };
  }, [designPreviewUrls]);

  async function updateCartItem(productId: string, patch: Partial<CheckoutLineItem>) {
    const next = cartItems.map((item) => (item.productId === productId ? { ...item, ...patch } : item));
    setCartItems(next);

    if (patch.quantity !== undefined) {
      await upsertCartItem(productId, Math.max(1, patch.quantity));
    }
  }

  async function handleRemove(productId: string) {
    await removeCartItem(productId);
    setDesignPreviewUrls((prev) => {
      (prev[productId] || []).forEach((url) => URL.revokeObjectURL(url));
      const { [productId]: _removed, ...rest } = prev;
      return rest;
    });
    const next = cartItems.filter((item) => item.productId !== productId);
    setCartItems(next);
  }

  async function setItemDesignFiles(productId: string, files: File[]) {
    for (const file of files) {
      const message = validateDesignFile(file);
      if (message) {
        setError(message);
        return;
      }
    }

    setError(null);
    await updateCartItem(productId, { designFiles: files });

    setDesignPreviewUrls((prev) => {
      (prev[productId] || []).forEach((url) => URL.revokeObjectURL(url));
      const nextUrls = files.map((file) => URL.createObjectURL(file));
      return { ...prev, [productId]: nextUrls };
    });
  }

  async function appendItemDesignFiles(productId: string, files: File[]) {
    if (files.length === 0) return;

    for (const file of files) {
      const message = validateDesignFile(file);
      if (message) {
        setError(message);
        return;
      }
    }

    setError(null);

    const existing = cartItems.find((item) => item.productId === productId)?.designFiles || [];
    const nextFiles = [...existing, ...files];
    await updateCartItem(productId, { designFiles: nextFiles });

    setDesignPreviewUrls((prev) => {
      const existingUrls = prev[productId] || [];
      const nextUrls = [...existingUrls, ...files.map((file) => URL.createObjectURL(file))];
      return { ...prev, [productId]: nextUrls };
    });
  }

  async function removeItemDesignFile(productId: string, index: number) {
    const existing = cartItems.find((item) => item.productId === productId)?.designFiles || [];
    if (!existing[index]) return;

    const nextFiles = existing.filter((_, idx) => idx !== index);
    await updateCartItem(productId, { designFiles: nextFiles });

    setDesignPreviewUrls((prev) => {
      const urls = prev[productId] || [];
      const urlToRemove = urls[index];
      if (urlToRemove) URL.revokeObjectURL(urlToRemove);
      return { ...prev, [productId]: urls.filter((_, idx) => idx !== index) };
    });
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
      const files: File[] = [];
      const items = checkoutRows.map((row) => ({
        productId: (row.product as Product).id,
        quantity: Math.max(1, row.item.quantity || 1),
        paperType: row.item.paperType || "Standard",
        finishType: row.item.finishType || "None",
        notes: row.item.notes?.trim() || undefined,
        designFileIndices: (row.item.designFiles || []).length
          ? row.item.designFiles?.map((file) => files.push(file) - 1)
          : undefined
      }));

      const deliveryNote = `Delivery Address (${selectedAddress.label}): ${selectedAddress.fullAddress}, ${selectedAddress.city} - ${selectedAddress.pincode}. Phone: ${selectedAddress.phone}`;

      const formData = new FormData();
      formData.append("items", JSON.stringify(items));
      formData.append("city", selectedAddress.city);
      formData.append("notes", deliveryNote);
      formData.append("paymentMode", paymentMode);
      files.forEach((file) => formData.append("designFiles", file, file.name));

      const order = await apiUpload<Order>("/orders", formData);

      if (paymentMode === "CASH") {
        await clearCart();
        setCartItems([]);
        setSuccess(`Order placed successfully: ${order.id}`);
        setTimeout(() => router.push("/dashboard"), 900);
        return;
      }

      setSuccess("Order created. Complete payment to confirm.");

      const razorpayOrder = await apiFetch<RazorpayCreateOrderResponse>("/payments/razorpay/create-order", {
        method: "POST",
        body: JSON.stringify({ orderId: order.id })
      });

      if (!window.Razorpay) {
        throw new Error("Payment gateway not loaded. Please refresh and try again.");
      }

      const instance = new window.Razorpay({
        key: razorpayOrder.razorpayKeyId,
        amount: Math.round(razorpayOrder.amount * 100),
        currency: razorpayOrder.currency,
        name: "arul printers",
        description: `Order #${order.id.slice(-8)}`,
        order_id: razorpayOrder.razorpayOrderId,
        handler: async (response: any) => {
          try {
            await apiFetch("/payments/razorpay/verify", {
              method: "POST",
              body: JSON.stringify({
                orderId: order.id,
                razorpayOrderId: String(response?.razorpay_order_id || ""),
                razorpayPaymentId: String(response?.razorpay_payment_id || ""),
                razorpaySignature: String(response?.razorpay_signature || "")
              })
            });

            await clearCart();
            setCartItems([]);
            setSuccess(`Payment successful. Order confirmed: ${order.id}`);
            setTimeout(() => router.push("/dashboard"), 900);
          } catch (err) {
            setError(err instanceof Error ? err.message : "Payment verification failed");
          }
        },
        modal: {
          ondismiss: () => {
            setError("Payment cancelled. Your order is saved and still pending payment.");
          }
        }
      });

      instance.open();
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

      <div className="grid gap-4">
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
                const firstImage =
                  (product.media || []).find((media) => media.fileType === "IMAGE") ||
                  (product.media || [])[0] ||
                  null;
                const unitPrice = Number(product.basePrice);
                const quantity = Math.max(1, row.item.quantity || 1);
                const lineTotal = unitPrice * quantity;
                const designPreviews = designPreviewUrls[product.id] || [];

                return (
                  <article key={product.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
                      <div className="flex gap-3">
                        <div className="h-24 w-28 overflow-hidden rounded-lg bg-slate-100">
                          {firstImage ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={`${API_BASE_URL.replace(/\/api$/, "")}/uploads/${firstImage.filePath}`}
                              alt={product.name}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : null}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-900 sm:text-base">{product.name}</p>
                          {product.description ? (
                            <p className="mt-1 line-clamp-2 text-xs text-slate-600">{product.description}</p>
                          ) : null}
                          <div className="mt-2 rounded-lg bg-slate-50 px-3 py-2">
                            <div className="flex items-center justify-between text-xs text-slate-600">
                              <span>Unit</span>
                              <span>Rs {Number.isFinite(unitPrice) ? unitPrice.toFixed(2) : "0.00"}</span>
                            </div>
                            <div className="mt-1 flex items-center justify-between gap-2 text-xs text-slate-600">
                              <span>Qty</span>
                              <input
                                className="w-24 rounded border border-slate-300 bg-white p-1 text-right text-sm text-slate-900"
                                type="number"
                                min={1}
                                value={quantity}
                                onChange={(event) =>
                                  updateCartItem(product.id, { quantity: Number(event.target.value || 1) })
                                }
                              />
                            </div>
                            <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2 text-sm font-bold text-slate-900">
                              <span>Total</span>
                              <span>Rs {Number.isFinite(lineTotal) ? lineTotal.toFixed(2) : "0.00"}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-semibold text-slate-700">Design files (optional)</p>
                          <input
                            className="mt-1 w-full rounded border p-2 text-sm"
                            type="file"
                            accept="application/pdf,image/jpeg,image/png"
                            multiple
                            onChange={(event) => {
                              void appendItemDesignFiles(product.id, Array.from(event.target.files || []));
                              event.currentTarget.value = "";
                            }}
                          />
                          {(row.item.designFiles || []).length ? (
                            <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2">
                              <div className="grid grid-cols-3 gap-2">
                                {designPreviews.map((url, index) => {
                                  const file = (row.item.designFiles || [])[index];
                                  if (!file) return null;
                                  return file.type.startsWith("image/") ? (
                                    <div key={url} className="relative">
                                      <button
                                        type="button"
                                        aria-label="Remove design file"
                                        className="absolute right-1 top-1 rounded-full bg-black/70 px-2 py-1 text-[10px] font-bold text-white"
                                        onClick={() => void removeItemDesignFile(product.id, index)}
                                      >
                                        X
                                      </button>
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={url}
                                        alt="Design preview"
                                        className="h-20 w-full rounded object-cover"
                                        loading="lazy"
                                      />
                                    </div>
                                  ) : (
                                    <div key={url} className="relative">
                                      <button
                                        type="button"
                                        aria-label="Remove design file"
                                        className="absolute right-1 top-1 rounded-full bg-black/70 px-2 py-1 text-[10px] font-bold text-white"
                                        onClick={() => void removeItemDesignFile(product.id, index)}
                                      >
                                        X
                                      </button>
                                      <a
                                        className="flex h-20 items-center justify-center rounded border border-slate-200 bg-white text-[11px] font-semibold text-[#2874f0]"
                                        href={url}
                                        target="_blank"
                                        rel="noreferrer"
                                      >
                                        View PDF
                                      </a>
                                    </div>
                                  );
                                })}
                              </div>
                              <p className="mt-2 text-xs text-slate-600">
                                Selected: {(row.item.designFiles || []).map((f) => f.name).join(", ")}
                              </p>
                            </div>
                          ) : null}
                        </div>

                        <div>
                          <p className="text-xs font-semibold text-slate-700">Notes (optional)</p>
                          <textarea
                            className="mt-1 w-full rounded border p-2 text-sm"
                            rows={3}
                            value={row.item.notes || ""}
                            placeholder="Notes for this item"
                            onChange={(event) => void updateCartItem(product.id, { notes: event.target.value })}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex justify-end gap-2">
                      <button type="button" className="rounded border px-3 py-1 text-xs" onClick={() => void handleRemove(product.id)}>
                        Remove
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="mt-4 rounded border border-slate-200 bg-slate-50 p-3 text-sm">
              {(() => {
                const deliveryCharge = 0;
                const total = subtotal + deliveryCharge;
                return (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Items total</span>
                      <span className="font-semibold text-slate-900">Rs {subtotal.toFixed(2)}</span>
                    </div>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="text-slate-600">Delivery charge</span>
                      <span className="font-semibold text-slate-900">Rs {deliveryCharge.toFixed(2)}</span>
                    </div>
                    <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-2">
                      <span className="font-semibold text-slate-900">Total</span>
                      <span className="font-bold text-slate-900">Rs {total.toFixed(2)}</span>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">Final GST and pricing multipliers are calculated after review.</p>
                  </>
                );
              })()}
            </div>
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
          </div>

          <button
            type="submit"
            className="rounded bg-[#2874f0] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            disabled={placingOrder}
          >
            {placingOrder ? "Placing order..." : "Place Order"}
          </button>
        </form>
      </div>
    </section>
  );
}
