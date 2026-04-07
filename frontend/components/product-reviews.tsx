"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { ProductReviewsResponse } from "@/lib/types";
import { fetchProfile } from "@/lib/auth";

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  } catch {
    return value;
  }
}

export function ProductReviews({ productId }: { productId: string }) {
  const [data, setData] = useState<ProductReviewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [me, setMe] = useState<{ id: string; name: string } | null>(null);
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [reviews, profile] = await Promise.all([
          apiFetch<ProductReviewsResponse>(`/products/${productId}/reviews`),
          fetchProfile().catch(() => null)
        ]);
        setData(reviews);
        setMe(profile ? { id: profile.id, name: profile.name } : null);

        if (profile) {
          const existing = reviews.reviews.find((r) => r.user.id === profile.id) || null;
          if (existing) {
            setRating(existing.rating);
            setTitle(existing.title || "");
            setComment(existing.comment || "");
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load reviews");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [productId]);

  const summaryRows = useMemo(() => {
    const summary = data?.summary;
    if (!summary) return [];
    const total = Math.max(0, summary.totalReviews);
    return ([5, 4, 3, 2, 1] as const).map((stars) => {
      const count = summary.countByRating[stars] || 0;
      const pct = total > 0 ? (count / total) * 100 : 0;
      return { stars, count, pct };
    });
  }, [data]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/products/${productId}/reviews`, {
        method: "POST",
        body: JSON.stringify({
          rating,
          title: title.trim() || undefined,
          comment: comment.trim() || undefined
        })
      });

      const refreshed = await apiFetch<ProductReviewsResponse>(`/products/${productId}/reviews`);
      setData(refreshed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit review");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Ratings Summary</h2>
        {loading ? <p className="mt-2 text-sm text-slate-600">Loading ratings...</p> : null}
        {error ? <p className="mt-2 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
        {!loading && data ? (
          <>
            <p className="mt-2 text-4xl font-bold text-slate-900">{data.summary.averageRating.toFixed(1)} ★</p>
            <p className="text-sm text-slate-600">Based on {data.summary.totalReviews} review(s)</p>

            <div className="mt-4 space-y-2 text-sm">
              {summaryRows.map((row) => (
                <div key={row.stars} className="grid grid-cols-[30px_1fr_36px] items-center gap-2">
                  <span className="text-slate-600">{row.stars}★</span>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-emerald-500" style={{ width: `${row.pct}%` }} />
                  </div>
                  <span className="text-right text-slate-500">{row.count}</span>
                </div>
              ))}
            </div>
          </>
        ) : null}
      </article>

      <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">Customer Reviews</h2>

        {me ? (
          <form onSubmit={submit} className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Write a review</p>
            <p className="mt-1 text-xs text-slate-500">Only customers with a paid order can submit a review.</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <select
                className="rounded border border-slate-300 bg-white p-2 text-sm"
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
              >
                {[5, 4, 3, 2, 1].map((value) => (
                  <option key={value} value={value}>
                    {value} Star{value === 1 ? "" : "s"}
                  </option>
                ))}
              </select>
              <input
                className="rounded border border-slate-300 bg-white p-2 text-sm"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Title (optional)"
                maxLength={120}
              />
              <textarea
                className="rounded border border-slate-300 bg-white p-2 text-sm sm:col-span-2"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Comment (optional)"
                rows={3}
                maxLength={1000}
              />
            </div>
            <button
              type="submit"
              className="mt-3 rounded bg-[#2874f0] px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              disabled={saving}
            >
              {saving ? "Saving..." : "Submit review"}
            </button>
          </form>
        ) : (
          <p className="mt-3 text-sm text-slate-600">Login to write a review.</p>
        )}

        <div className="mt-4 space-y-4">
          {loading ? <p className="text-sm text-slate-600">Loading reviews...</p> : null}
          {!loading && data && data.reviews.length === 0 ? (
            <p className="text-sm text-slate-600">No reviews yet.</p>
          ) : null}
          {!loading && data
            ? data.reviews.map((review) => (
                <div key={review.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-900">{review.user.name}</p>
                    <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                      {review.rating} ★
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{formatDate(review.createdAt)}</p>
                  {review.title ? <p className="mt-2 text-sm font-medium text-slate-800">{review.title}</p> : null}
                  {review.comment ? <p className="mt-1 text-sm text-slate-600">{review.comment}</p> : null}
                </div>
              ))
            : null}
        </div>
      </article>
    </div>
  );
}

