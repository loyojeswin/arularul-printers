import { z } from "zod";

export const razorpayCreateOrderSchema = z.object({
  orderId: z.string().min(1)
});

export const razorpayVerifySchema = z.object({
  orderId: z.string().min(1),
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1)
});

