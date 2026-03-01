import { z } from "zod";

export const createProductSchema = z.object({
  name: z.string().min(2),
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, "Slug must contain lowercase letters, numbers, and hyphens only"),
  description: z.string().max(1000).optional(),
  basePrice: z.coerce.number().positive(),
  isActive: z.boolean().optional()
});

export const updateProductSchema = z.object({
  name: z.string().min(2).optional(),
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, "Slug must contain lowercase letters, numbers, and hyphens only")
    .optional(),
  description: z.string().max(1000).optional(),
  basePrice: z.coerce.number().positive().optional(),
  isActive: z.boolean().optional()
});

export const createOfferSchema = z.object({
  title: z.string().min(2),
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, "Slug must contain lowercase letters, numbers, and hyphens only"),
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
  productIds: z.array(z.string().min(1)).default([])
});

export const updateOfferSchema = z.object({
  title: z.string().min(2).optional(),
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, "Slug must contain lowercase letters, numbers, and hyphens only")
    .optional(),
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional(),
  productIds: z.array(z.string().min(1)).optional()
});
