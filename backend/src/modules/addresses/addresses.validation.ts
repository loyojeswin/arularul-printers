import { z } from "zod";

export const createAddressSchema = z.object({
  label: z.string().min(2),
  fullAddress: z.string().min(5),
  city: z.string().min(2),
  pincode: z.string().min(4).max(10).optional(),
  phone: z.string().min(7).max(20).optional(),
  isDefault: z.boolean().optional()
});

export const updateAddressSchema = z.object({
  label: z.string().min(2).optional(),
  fullAddress: z.string().min(5).optional(),
  city: z.string().min(2).optional(),
  pincode: z.string().min(4).max(10).optional(),
  phone: z.string().min(7).max(20).optional(),
  isDefault: z.boolean().optional()
});
