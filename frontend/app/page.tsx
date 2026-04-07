"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { API_BASE_URL, apiFetch } from "@/lib/api";
import { Offer } from "@/lib/types";

export default function HomePage() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(true);

  useEffect(() => {
    async function loadOffers() {
      try {
        const data = await apiFetch<Offer[]>("/offers");
        setOffers(data);
      } catch {
        setOffers([]);
      } finally {
        setLoadingOffers(false);
      }
    }

    void loadOffers();
  }, []);

  return (
    <section className="grid gap-6">
      <div className="rounded-2xl bg-gradient-to-r from-[#1d4ed8] to-[#0ea5e9] p-6 text-white shadow-md">
        <h1 className="text-4xl font-extrabold">Top printing solutions in Thoothukudi</h1>
        <p className="mt-2 max-w-3xl text-white/90">
          arul printers helps corporate and retail customers place, track, and reorder print jobs online.
        </p>
        <div className="mt-4 flex gap-3">
          <Link href="/products" className="rounded bg-white px-4 py-2 font-semibold text-[#1d4ed8]">
            Explore Products
          </Link>
        </div>
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Offers & Discounts</h2>
          <Link href="/products" className="text-sm font-semibold text-[#2874f0]">
            View all products
          </Link>
        </div>

        {loadingOffers ? <p className="text-sm text-slate-600">Loading offers...</p> : null}
        {!loadingOffers && offers.length === 0 ? <p className="text-sm text-slate-600">No active offers right now.</p> : null}

        <div className="grid gap-3 md:grid-cols-3">
          {offers.map((offer) => (
            <Link
              key={offer.id}
              href={`/products?offer=${offer.slug}`}
              className="rounded-lg border border-slate-200 bg-slate-50 p-4 transition hover:border-[#2874f0] hover:shadow-sm"
            >
              {offer.imagePath ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={`${API_BASE_URL.replace(/\/api$/, "")}/uploads/${offer.imagePath}`}
                  alt={offer.title}
                  className="mb-3 h-28 w-full rounded object-cover"
                  loading="lazy"
                />
              ) : null}
              <p className="text-base font-semibold text-slate-900">{offer.title}</p>
              <p className="mt-1 text-sm text-slate-600">{offer.description || "Special offer available"}</p>
              <p className="mt-2 text-xs font-semibold text-[#2874f0]">{offer.productCount || 0} product(s) in this offer</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
