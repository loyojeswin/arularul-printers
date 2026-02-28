export type OrderStatus =
  | "PENDING"
  | "IN_REVIEW"
  | "PRINTING"
  | "COMPLETED"
  | "DELIVERED";

export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";

export interface PriceInput {
  basePrice: number;
  quantity: number;
  paperMultiplier: number;
  finishMultiplier: number;
}

export interface PriceBreakdown {
  subtotal: number;
  taxAmount: number;
  total: number;
}

export const SUPPORTED_CITIES = ["Thoothukudi"] as const;
