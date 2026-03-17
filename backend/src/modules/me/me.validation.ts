import { z } from "zod";

export const toggleProductSchema = z.object({
  productId: z.string().min(1)
});

export const cartUpdateSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(1).max(1000)
});
