import { z } from "zod";

export const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().min(1),
        paperType: z.string().min(2),
        finishType: z.string().min(2)
      })
    )
    .min(1),
  notes: z.string().max(500).optional(),
  city: z.string().min(2).optional()
});
