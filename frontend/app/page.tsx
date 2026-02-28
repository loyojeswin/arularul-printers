import Link from "next/link";

const offers = [
  {
    title: "Flat 20% Off on Bulk Business Cards",
    note: "Min order 500 cards"
  },
  {
    title: "Photo Gifts Festival Offer",
    note: "Buy 2 mugs, get 1 free"
  },
  {
    title: "Free Delivery in Thoothukudi",
    note: "For orders above Rs 999"
  }
];

export default function HomePage() {
  return (
    <section className="grid gap-6">
      <div className="rounded-2xl bg-gradient-to-r from-[#1d4ed8] to-[#0ea5e9] p-6 text-white shadow-md">
        <h1 className="text-4xl font-extrabold">Top printing solutions in Thoothukudi</h1>
        <p className="mt-2 max-w-3xl text-white/90">
          arul printers helps corporate and retail customers place, track, and reorder print jobs online.
        </p>
        <div className="mt-4 flex gap-3">
          <Link href="/get-quote" className="rounded bg-white px-4 py-2 font-semibold text-[#1d4ed8]">
            Get Instant Quote
          </Link>
          <Link href="/services" className="rounded border border-white px-4 py-2 text-white">
            View Services
          </Link>
        </div>
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Offers & Discounts</h2>
          <Link href="/products?search=offer" className="text-sm font-semibold text-[#2874f0]">
            View all offers
          </Link>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {offers.map((offer) => (
            <article key={offer.title} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-base font-semibold text-slate-900">{offer.title}</p>
              <p className="mt-1 text-sm text-slate-600">{offer.note}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
