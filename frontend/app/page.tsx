import Link from "next/link";

export default function HomePage() {
  return (
    <section className="grid gap-6">
      <h1 className="text-4xl font-extrabold text-brand">Top printing solutions in Thoothukudi</h1>
      <p className="max-w-3xl text-slate-700">
        arul printers helps corporate and retail customers place, track, and reorder print jobs online.
      </p>
      <div className="flex gap-3">
        <Link href="/get-quote" className="rounded bg-brand px-4 py-2 text-white">
          Get Instant Quote
        </Link>
        <Link href="/services" className="rounded border border-brand px-4 py-2 text-brand">
          View Services
        </Link>
      </div>
    </section>
  );
}
