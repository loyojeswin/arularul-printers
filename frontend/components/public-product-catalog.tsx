"use client";

import { TouchEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { Product } from "@/lib/types";
import { ProductMediaCarousel } from "@/components/product-media-carousel";
import {
  addLike,
  fetchCart,
  fetchLikes,
  removeLike,
  upsertCartItem
} from "@/lib/user-data";
import { fetchProfile } from "@/lib/auth";

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

export function PublicProductCatalog() {
  const router = useRouter();
  const params = useSearchParams();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [likedIds, setLikedIds] = useState<string[]>([]);
  const [cartIds, setCartIds] = useState<string[]>([]);
  const [isAuthed, setIsAuthed] = useState(false);

  const [activeCategory, setActiveCategory] = useState("All");
  const [sortMode, setSortMode] = useState("featured");
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [sheetOffset, setSheetOffset] = useState(0);
  const dragStartY = useRef<number | null>(null);

  useEffect(() => {
    async function loadProducts() {
      try {
        const data = await apiFetch<Product[]>("/products");
        setProducts(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load products");
      } finally {
        setLoading(false);
      }
    }

    void loadProducts();
  }, []);

  useEffect(() => {
    async function loadUserLists() {
      try {
        await fetchProfile();
        setIsAuthed(true);
      } catch {
        setIsAuthed(false);
        setLikedIds([]);
        setCartIds([]);
        return;
      }

      try {
        const [likes, cart] = await Promise.all([fetchLikes(), fetchCart()]);
        setLikedIds(likes);
        setCartIds(cart.map((item) => item.productId));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load user data");
      }
    }

    void loadUserLists();
  }, []);

  const searchTerm = (params.get("search") || "").toLowerCase().trim();

  const categories = useMemo(() => {
    const set = new Set<string>(["All"]);
    products.forEach((product) => set.add(detectCategory(product)));
    return Array.from(set);
  }, [products]);

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

    if (sortMode === "price-asc") {
      data.sort((a, b) => Number(a.basePrice) - Number(b.basePrice));
    } else if (sortMode === "price-desc") {
      data.sort((a, b) => Number(b.basePrice) - Number(a.basePrice));
    } else if (sortMode === "name-asc") {
      data.sort((a, b) => a.name.localeCompare(b.name));
    }

    return data;
  }, [products, searchTerm, activeCategory, sortMode]);

  useEffect(() => {
    if (!showMobileFilters) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [showMobileFilters]);

  function requireLogin() {
    if (isAuthed) return true;
    setError("Please login to use like/cart actions");
    router.push("/login");
    return false;
  }

  async function toggleLike(productId: string) {
    if (!requireLogin()) return;
    if (likedIds.includes(productId)) {
      await removeLike(productId);
      setLikedIds((prev) => prev.filter((id) => id !== productId));
    } else {
      await addLike(productId);
      setLikedIds((prev) => [...prev, productId]);
    }
  }

  async function addToCart(productId: string) {
    if (!requireLogin()) return;
    if (cartIds.includes(productId)) return;
    await upsertCartItem(productId, 1);
    setCartIds((prev) => [...prev, productId]);
  }

  function openMobileFilters() {
    setSheetOffset(0);
    setShowMobileFilters(true);
  }

  function closeMobileFilters() {
    setSheetOffset(0);
    setShowMobileFilters(false);
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
      closeMobileFilters();
      return;
    }
    setSheetOffset(0);
    dragStartY.current = null;
  }

  function FiltersPanel() {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate-600">Category</h2>
          <div className="mt-2 flex flex-wrap gap-2 lg:flex-col">
            {categories.map((category) => (
              <button
                key={category}
                type="button"
                className={`rounded px-3 py-1 text-left text-sm ${
                  activeCategory === category
                    ? "bg-[#2874f0] text-white"
                    : "border border-slate-300 text-slate-700"
                }`}
                onClick={() => {
                  setActiveCategory(category);
                  setShowMobileFilters(false);
                }}
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
            onChange={(event) => {
              setSortMode(event.target.value);
              setShowMobileFilters(false);
            }}
          >
            <option value="featured">Featured</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="name-asc">Name: A to Z</option>
          </select>
        </div>
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <div className="rounded bg-white px-4 py-3 shadow-sm">
        <h1 className="text-2xl font-extrabold tracking-tight md:text-3xl">Explore Products</h1>
        <p className="text-sm text-slate-600">View all products without login. Actions require login.</p>
      </div>

      {loading ? <p>Loading products...</p> : null}
      {error ? <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p> : null}

      <div className="rounded bg-white px-4 py-3 shadow-sm lg:hidden">
        <button
          type="button"
          className="rounded bg-[#2874f0] px-3 py-2 text-sm font-semibold text-white"
          onClick={openMobileFilters}
        >
          Filter & Sort
        </button>
      </div>

      {showMobileFilters ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/40 lg:hidden" onClick={closeMobileFilters}>
          <div
            className="w-full rounded-t-2xl bg-white p-4 transition-transform duration-200"
            style={{ transform: `translateY(${sheetOffset}px)` }}
            onClick={(event) => event.stopPropagation()}
            onTouchStart={onSheetTouchStart}
            onTouchMove={onSheetTouchMove}
            onTouchEnd={onSheetTouchEnd}
          >
            <div className="mb-2 flex justify-center">
              <span className="h-1.5 w-12 rounded-full bg-slate-300" />
            </div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Filter & Sort</h3>
              <button type="button" className="rounded border px-2 py-1 text-sm" onClick={closeMobileFilters}>
                Close
              </button>
            </div>
            <FiltersPanel />
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        <aside className="hidden rounded bg-white p-4 shadow-sm lg:sticky lg:top-28 lg:block lg:h-fit">
          <FiltersPanel />
        </aside>

        <div className="space-y-3">
          <div className="flex items-center justify-between rounded bg-white px-4 py-3 shadow-sm">
            <p className="text-sm text-slate-700">
              {filteredProducts.length} products {searchTerm ? `for "${searchTerm}"` : "available"}
            </p>
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

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <button type="button" className="rounded border px-2 py-1" onClick={() => void toggleLike(product.id)}>
                    {likedIds.includes(product.id) ? "Liked" : "Like"}
                  </button>
                  <button
                    type="button"
                    className="rounded bg-[#fb641b] px-2 py-1 font-semibold text-white"
                    onClick={() => void addToCart(product.id)}
                  >
                    {cartIds.includes(product.id) ? "In Cart" : "Add"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
