interface PriceInput {
  basePrice: number;
  quantity: number;
  paperMultiplier: number;
  finishMultiplier: number;
}

interface PriceBreakdown {
  subtotal: number;
  taxAmount: number;
  total: number;
}

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

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
