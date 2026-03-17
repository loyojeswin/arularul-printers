"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { fetchProfile } from "@/lib/auth";
import { addLike, fetchLikes, removeLike, upsertCartItem } from "@/lib/user-data";

export function ProductDetailActions({ productId }: { productId: string }) {
  const router = useRouter();
  const [isAuthed, setIsAuthed] = useState(false);
  const [liked, setLiked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        await fetchProfile();
        setIsAuthed(true);
      } catch {
        setIsAuthed(false);
        return;
      }

      try {
        const likes = await fetchLikes();
        setLiked(likes.includes(productId));
      } catch {
        // Keep non-blocking; user can still purchase.
      }
    }

    void load();
  }, [productId]);

  function requireLogin() {
    if (isAuthed) return true;
    router.push("/login");
    return false;
  }

  async function toggleLike() {
    setError(null);
    if (!requireLogin()) return;

    setBusy(true);
    try {
      if (liked) {
        await removeLike(productId);
        setLiked(false);
      } else {
        await addLike(productId);
        setLiked(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update like");
    } finally {
      setBusy(false);
    }
  }

  async function buyNow() {
    setError(null);
    if (!requireLogin()) return;

    setBusy(true);
    try {
      await upsertCartItem(productId, 1);
      router.push("/checkout");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add to cart");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void toggleLike()}
          disabled={busy}
          className="rounded border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-60"
        >
          {liked ? "Liked" : "Like"}
        </button>
        <button
          type="button"
          onClick={() => void buyNow()}
          disabled={busy}
          className="rounded bg-[#fb641b] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          Buy Now
        </button>
      </div>
    </div>
  );
}

