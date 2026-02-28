"use client";

import { useMemo, useState } from "react";
import { calculatePrice } from "@/lib/price";

const products = {
  "visiting-cards": { label: "Visiting Cards", basePrice: 2.5 },
  flyers: { label: "Flyers", basePrice: 1.8 },
  brochures: { label: "Brochures", basePrice: 5.2 }
};

const paperOptions: Record<string, number> = {
  Standard: 1,
  Premium: 1.25,
  Matte: 1.1
};

const finishOptions: Record<string, number> = {
  None: 1,
  Gloss: 1.15,
  Lamination: 1.3
};

export function PriceCalculator() {
  const [product, setProduct] = useState<keyof typeof products>("visiting-cards");
  const [quantity, setQuantity] = useState(100);
  const [paper, setPaper] = useState("Standard");
  const [finish, setFinish] = useState("None");

  const summary = useMemo(
    () =>
      calculatePrice({
        basePrice: products[product].basePrice,
        quantity,
        paperMultiplier: paperOptions[paper],
        finishMultiplier: finishOptions[finish]
      }),
    [product, quantity, paper, finish]
  );

  return (
    <div className="grid gap-3 rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold">Instant Quote Calculator</h2>

      <label className="text-sm">
        Product
        <select className="mt-1 w-full rounded border p-2" value={product} onChange={(e) => setProduct(e.target.value as keyof typeof products)}>
          {Object.entries(products).map(([value, data]) => (
            <option key={value} value={value}>
              {data.label}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm">
        Quantity
        <input
          className="mt-1 w-full rounded border p-2"
          type="number"
          min={1}
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value || 1))}
        />
      </label>

      <label className="text-sm">
        Paper Type
        <select className="mt-1 w-full rounded border p-2" value={paper} onChange={(e) => setPaper(e.target.value)}>
          {Object.keys(paperOptions).map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm">
        Finish Type
        <select className="mt-1 w-full rounded border p-2" value={finish} onChange={(e) => setFinish(e.target.value)}>
          {Object.keys(finishOptions).map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </label>

      <div className="mt-4 rounded-xl bg-brand p-4 text-white">
        <p>Subtotal: Rs {summary.subtotal.toFixed(2)}</p>
        <p>GST (18%): Rs {summary.taxAmount.toFixed(2)}</p>
        <p className="text-lg font-semibold">Total: Rs {summary.total.toFixed(2)}</p>
      </div>
    </div>
  );
}
