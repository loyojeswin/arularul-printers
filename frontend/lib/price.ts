import { PriceBreakdown, PriceInput } from "@arul/shared";

export function calculatePrice(input: PriceInput): PriceBreakdown {
  const subtotal = input.basePrice * input.quantity * input.paperMultiplier * input.finishMultiplier;
  const taxAmount = subtotal * 0.18;
  const total = subtotal + taxAmount;

  return {
    subtotal: round(subtotal),
    taxAmount: round(taxAmount),
    total: round(total)
  };
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}
