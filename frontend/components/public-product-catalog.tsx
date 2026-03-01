"use client";

import { TouchEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { Offer, Product } from "@/lib/types";
import { ProductMediaCarousel } from "@/components/product-media-carousel";

const LIKED_KEY = "arul_liked_products";
const SAVED_KEY = "arul_saved_products";
const CART_KEY = "arul_cart_products";

const categoryMatchers: Record<string, RegExp> = {
  "Business Prints": /(card|brochure|flyer|corporate|letterhead|sticker)/i,
  "Photo Gifts": /(frame|photo|mug|gift|album)/i,
  "Signage & Display": /(banner|standee|poster|board|display)/i,
  Others: /.*/
};

function detectCategory(product: Product) {
  const text = `${product.name} ${product.description || ""}`;
  const match = Object.entries(categoryMatchers).find(([category, regex]) => category !== "Others" && regex.test(text));
  return match?.[0] || "Others";
}

function readIds(key: string): string[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(key);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeIds(key: string, values: string[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(values));
}

export function PublicProductCatalog() {
  const router = useRouter();
  const params = useSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  const [activeOffer, setActiveOffer] = useState<Offer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [likedIds, setLikedIds] = useState<string[]>([]);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [cartIds, setCartIds] = useState<string[]>([]);

  const [activeCategory, setActiveCategory] = useState("All");
  const [sortMode, setSortMode] = useState("featured");
  const [showFilters, setShowFilters] = useState(false);
  const [sheetOffset, setSheetOffset] = useState(0);
  const [minPriceInput, setMinPriceInput] = useState(0);
  const [maxPriceInput, setMaxPriceInput] = useState(0);
  const dragStartY = useRef<number | null>(null);

  const offerSlug = params.get("offer");

  useEffect(() => {
    setLikedIds(readIds(LIKED_KEY));
    setSavedIds(readIds(SAVED_KEY));
    setCartIds(readIds(CART_KEY));

    async function loadProducts() {
      setLoading(true);
      setError(null);
      try {
        if (offerSlug) {
          const data = await apiFetch<{ offer: Offer; products: Product[] }>(`/offers/${offerSlug}/products`);
          setProducts(data.products);
          setActiveOffer(data.offer);
        } else {
          const data = await apiFetch<Product[]>("/products");
          setProducts(data);
          setActiveOffer(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load products");
        setProducts([]);
        setActiveOffer(null);
      } finally {
        setLoading(false);
      }
    }

    void loadProducts();
  }, [offerSlug]);

  const searchTerm = (params.get("search") || "").toLowerCase().trim();

  const categories = useMemo(() => {
    const set = new Set<string>(["All"]);
    products.forEach((product) => set.add(detectCategory(product)));
    return Array.from(set);
  }, [products]);

  const priceBounds = useMemo(() => {
    if (products.length === 0) return { min: 0, max: 0 };
    const prices = products.map((product) => Number(product.basePrice));
    return {
      min: Math.floor(Math.min(...prices)),
      max: Math.ceil(Math.max(...prices))
    };
  }, [products]);

  useEffect(() => {
    setMinPriceInput(priceBounds.min);
    setMaxPriceInput(priceBounds.max);
  }, [priceBounds.min, priceBounds.max]);

  const filteredProducts = useMemo(() => {
    let data = [...products];

    if (searchTerm) {
      data = data.filter((product) => {
        const content = `${product.name} ${product.description || ""}`.toLowerCase();
        return content.includes(searchTerm);
      });
    }

    if (activeCategory !== "All") {
      data = data.filter((product) => detectCategory(product) === activeCategory);
    }

    data = data.filter((product) => {
      const price = Number(product.basePrice);
      return price >= minPriceInput && price <= maxPriceInput;
    });

    if (sortMode === "price-asc") {
      data.sort((a, b) => Number(a.basePrice) - Number(b.basePrice));
    } else if (sortMode === "price-desc") {
      data.sort((a, b) => Number(b.basePrice) - Number(a.basePrice));
    } else if (sortMode === "name-asc") {
      data.sort((a, b) => a.name.localeCompare(b.name));
    }

    return data;
  }, [products, searchTerm, activeCategory, sortMode, minPriceInput, maxPriceInput]);

  useEffect(() => {
    if (!showFilters) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [showFilters]);

  function requireLogin() {
    if (getToken()) return true;
    setError("Please login to use like/save/cart actions");
    router.push("/login");
    return false;
  }

  function toggleAction(
    key: string,
    currentValues: string[],
    setValues: (values: string[]) => void,
    productId: string
  ) {
    if (!requireLogin()) return;
    const nextValues = currentValues.includes(productId)
      ? currentValues.filter((id) => id !== productId)
      : [...currentValues, productId];
    setValues(nextValues);
    writeIds(key, nextValues);
  }

  function addToCart(productId: string) {
    if (!requireLogin()) return;
    if (cartIds.includes(productId)) return;
    const nextValues = [...cartIds, productId];
    setCartIds(nextValues);
    writeIds(CART_KEY, nextValues);
  }

  function openFilters() {
    setSheetOffset(0);
    setShowFilters(true);
  }

  function closeFilters() {
    setSheetOffset(0);
    setShowFilters(false);
  }

  function resetFilters() {
    setActiveCategory("All");
    setSortMode("featured");
    setMinPriceInput(priceBounds.min);
    setMaxPriceInput(priceBounds.max);
  }

  function onSheetTouchStart(event: TouchEvent<HTMLDivElement>) {
    dragStartY.current = event.touches[0]?.clientY ?? null;
  }

  function onSheetTouchMove(event: TouchEvent<HTMLDivElement>) {
    if (dragStartY.current === null) return;
    const currentY = event.touches[0]?.clientY ?? dragStartY.current;
    const delta = Math.max(0, currentY - dragStartY.current);
    setSheetOffset(Math.min(delta, 260));
  }

  function onSheetTouchEnd() {
    if (sheetOffset > 120) {
      closeFilters();
      return;
    }
    setSheetOffset(0);
    dragStartY.current = null;
  }

  function handleMinInput(value: number) {
    if (Number.isNaN(value)) return;
    const clamped = Math.max(priceBounds.min, Math.min(value, maxPriceInput));
    setMinPriceInput(clamped);
  }

  function handleMaxInput(value: number) {
    if (Number.isNaN(value)) return;
    const clamped = Math.min(priceBounds.max, Math.max(value, minPriceInput));
    setMaxPriceInput(clamped);
  }

  function FiltersPanel() {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-600">Category</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                className={`rounded px-3 py-1 text-left text-sm ${
                  activeCategory === category ? "bg-[#2874f0] text-white" : "border border-slate-300 text-slate-700"
                }`}
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-600">Sort</h2>
          <select
            className="mt-2 w-full rounded border p-2 text-sm"
            value={sortMode}
            onChange={(event) => setSortMode(event.target.value)}
          >
            <option value="featured">Featured</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="name-asc">Name: A to Z</option>
          </select>
        </div>

        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-600">Price Range</h2>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <input
              type="number"
              className="rounded border p-2 text-sm"
              value={minPriceInput}
              min={priceBounds.min}
              max={maxPriceInput}
              onChange={(event) => handleMinInput(Number(event.target.value))}
            />
            <input
              type="number"
              className="rounded border p-2 text-sm"
              value={maxPriceInput}
              min={minPriceInput}
              max={priceBounds.max}
              onChange={(event) => handleMaxInput(Number(event.target.value))}
            />
          </div>
          <div className="mt-3 space-y-2">
            <input
              type="range"
              min={priceBounds.min}
              max={priceBounds.max}
              value={minPriceInput}
              onChange={(event) => handleMinInput(Number(event.target.value))}
              className="w-full"
            />
            <input
              type="range"
              min={priceBounds.min}
              max={priceBounds.max}
              value={maxPriceInput}
              onChange={(event) => handleMaxInput(Number(event.target.value))}
              className="w-full"
            />
            <p className="text-xs text-slate-600">
              Rs {minPriceInput} - Rs {maxPriceInput}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <button type="button" className="rounded border px-3 py-2 text-sm" onClick={resetFilters}>
            Reset
          </button>
          <button type="button" className="rounded bg-[#2874f0] px-3 py-2 text-sm font-semibold text-white" onClick={closeFilters}>
            Apply
          </button>
        </div>
      </div>
    );
  }

  return (
    <section className="space-y-4">
      {loading ? <p>Loading products...</p> : null}
      {error ? <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p> : null}

      <div className="space-y-3">
        <div className="flex items-center justify-between rounded bg-white px-4 py-3 shadow-sm">
          <p className="text-sm text-slate-700">
            {filteredProducts.length} products{" "}
            {activeOffer ? `in offer "${activeOffer.title}"` : searchTerm ? `for "${searchTerm}"` : "available"}
          </p>
          <button
            type="button"
            className="rounded bg-[#2874f0] px-3 py-2 text-sm font-semibold text-white"
            onClick={openFilters}
          >
            Filter & Sort
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filteredProducts.map((product) => (
            <article key={product.id} className="rounded bg-white p-3 shadow-sm transition hover:shadow-md">
              <div className="mb-3">
                <ProductMediaCarousel media={product.media || []} productName={product.name} className="h-48" />
              </div>

              <Link href={`/products/${product.slug}`} className="line-clamp-1 text-base font-semibold hover:text-[#2874f0]">
                {product.name}
              </Link>
              <p className="mt-1 line-clamp-2 min-h-10 text-sm text-slate-600">{product.description || "No description"}</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">From Rs {Number(product.basePrice).toFixed(2)}</p>

              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <button
                  type="button"
                  className="rounded border px-2 py-1"
                  onClick={() => toggleAction(LIKED_KEY, likedIds, setLikedIds, product.id)}
                >
                  {likedIds.includes(product.id) ? "Liked" : "Like"}
                </button>
                <button
                  type="button"
                  className="rounded border px-2 py-1"
                  onClick={() => toggleAction(SAVED_KEY, savedIds, setSavedIds, product.id)}
                >
                  {savedIds.includes(product.id) ? "Saved" : "Save"}
                </button>
                <button
                  type="button"
                  className="rounded bg-[#fb641b] px-2 py-1 font-semibold text-white"
                  onClick={() => addToCart(product.id)}
                >
                  {cartIds.includes(product.id) ? "In Cart" : "Add"}
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>

      {showFilters ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 lg:items-start lg:justify-end" onClick={closeFilters}>
          <div
            className="w-full rounded-t-2xl bg-white p-4 transition-transform duration-200 lg:mr-6 lg:mt-24 lg:max-h-[80vh] lg:w-[360px] lg:overflow-y-auto lg:rounded-2xl"
            style={{ transform: `translateY(${sheetOffset}px)` }}
            onClick={(event) => event.stopPropagation()}
            onTouchStart={onSheetTouchStart}
            onTouchMove={onSheetTouchMove}
            onTouchEnd={onSheetTouchEnd}
          >
            <div className="mb-2 flex justify-center lg:hidden">
              <span className="h-1.5 w-12 rounded-full bg-slate-300" />
            </div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Filter & Sort</h3>
              <button type="button" className="rounded border px-2 py-1 text-sm" onClick={closeFilters}>
                Close
              </button>
            </div>
            <FiltersPanel />
          </div>
        </div>
      ) : null}
    </section>
  );
}
