import { notFound } from "next/navigation";
import { Product } from "@/lib/types";
import { ProductMediaCarousel } from "@/components/product-media-carousel";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000/api";

async function getProducts(): Promise<Product[]> {
  const response = await fetch(`${API_BASE_URL}/products`, {
    cache: "no-store"
  });

  if (!response.ok) {
    return [];
  }

  return response.json();
}

export default async function ProductDetails({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const products = await getProducts();
  const product = products.find((item) => item.slug === slug);

  if (!product) return notFound();

  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-bold">{product.name}</h1>
      <p className="text-slate-700">{product.description || "No description available"}</p>
      <p className="font-medium">Base Price: Rs {Number(product.basePrice).toFixed(2)}</p>

      <div className="rounded bg-white p-3 shadow-sm">
        <ProductMediaCarousel media={product.media || []} productName={product.name} className="h-80" />
      </div>

      <p className="text-sm text-slate-600">
        You can view products without login. Login is required for like/save/add to cart actions on the products page.
      </p>
    </section>
  );
}
