import { PublicProductCatalog } from "@/components/public-product-catalog";
import { Suspense } from "react";

export default function ProductsPage() {
  return (
    <Suspense fallback={<p>Loading products...</p>}>
      <PublicProductCatalog />
    </Suspense>
  );
}
