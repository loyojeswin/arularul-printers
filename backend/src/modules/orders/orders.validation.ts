import { z } from "zod";

export const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().min(1),
        paperType: z.string().min(2),
        finishType: z.string().min(2),
        notes: z.string().max(500).optional(),
        designFileIndex: z.number().int().min(0).optional(),
        designFileIndices: z.array(z.number().int().min(0)).max(10).optional()
      })
    )
    .min(1),
  notes: z.string().max(1000).optional(),
  city: z.string().min(2).optional(),
  paymentMode: z.enum(["CASH", "CARD", "UPI"]).optional()
});
