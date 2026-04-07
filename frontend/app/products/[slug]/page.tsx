import Link from "next/link";
import { notFound } from "next/navigation";
import { Product } from "@/lib/types";
import { ProductMediaCarousel } from "@/components/product-media-carousel";
import { ProductDetailActions } from "@/components/product-detail-actions";
import { ProductReviews } from "@/components/product-reviews";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000/api";

async function getProducts(): Promise<Product[]> {
  const response = await fetch(`${API_BASE_URL}/products`, {
    cache: "no-store"
  });

  if (!response.ok) {
    return [];
  }

  return response.json();
}

function getCategory(product: Product): string {
  const text = `${product.name} ${product.description || ""}`.toLowerCase();
  if (/(card|brochure|flyer|letterhead|sticker)/.test(text)) return "Business Prints";
  if (/(frame|photo|mug|gift|album)/.test(text)) return "Photo Gifts";
  if (/(banner|standee|poster|board|display)/.test(text)) return "Signage & Display";
  return "Custom Prints";
}

function getRelatedProducts(products: Product[], current: Product): Product[] {
  const currentCategory = getCategory(current);
  const currentTokens = `${current.name} ${current.description || ""}`
    .toLowerCase()
    .split(/\W+/)
    .filter((token) => token.length > 2);

  return [...products]
    .filter((item) => item.id !== current.id)
    .map((item) => {
      const text = `${item.name} ${item.description || ""}`.toLowerCase();
      const sameCategory = getCategory(item) === currentCategory ? 3 : 0;
      const tokenScore = currentTokens.reduce((score, token) => (text.includes(token) ? score + 1 : score), 0);
      return { item, score: sameCategory + tokenScore };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((row) => row.item);
}

export default async function ProductDetails({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const products = await getProducts();
  const product = products.find((item) => item.slug === slug);

  if (!product) return notFound();

  const category = getCategory(product);
  const relatedProducts = getRelatedProducts(products, product);

  const paperOptions = (product.pricingOptions || [])
    .filter((option) => option.optionType === "PAPER")
    .map((option) => option.optionValue);
  const finishOptions = (product.pricingOptions || [])
    .filter((option) => option.optionType === "FINISH")
    .map((option) => option.optionValue);

  return (
    <section className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1.1fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
          <ProductMediaCarousel media={product.media || []} productName={product.name} className="h-[420px]" />
        </div>

        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#2874f0]">{category}</p>
          <h1 className="text-3xl font-bold text-slate-900">{product.name}</h1>
          <p className="text-sm text-slate-700">{product.description || "No description available for this product."}</p>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-slate-600">Ratings and reviews available below</span>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-600">Starting from</p>
            <p className="text-3xl font-bold text-slate-900">Rs {Number(product.basePrice).toFixed(2)}</p>
            <p className="mt-1 text-xs text-slate-500">Final price may vary based on size, paper, finish and quantity.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Paper Options</p>
              <p className="mt-1 text-sm text-slate-700">{paperOptions.length ? paperOptions.join(", ") : "Standard"}</p>
            </div>
            <div className="rounded-lg border border-slate-200 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Finish Options</p>
              <p className="mt-1 text-sm text-slate-700">{finishOptions.length ? finishOptions.join(", ") : "None"}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <ProductDetailActions productId={product.id} />
          </div>
        </div>
      </div>

      <ProductReviews productId={product.id} />

      <article className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">Related Products</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {relatedProducts.map((item) => (
            <Link key={item.id} href={`/products/${item.slug}`} className="rounded-lg border border-slate-200 p-3 transition hover:shadow-sm">
              <div className="mb-2">
                <ProductMediaCarousel media={item.media || []} productName={item.name} className="h-36" />
              </div>
              <p className="line-clamp-1 text-sm font-semibold text-slate-900">{item.name}</p>
              <p className="mt-1 text-xs text-slate-600">Rs {Number(item.basePrice).toFixed(2)}</p>
            </Link>
          ))}
        </div>
      </article>
    </section>
  );
}
