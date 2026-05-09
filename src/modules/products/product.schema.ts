import { z } from "zod";

const optionalText = z.string().trim().optional().or(z.literal(""));
const optionalUrl = z.string().url().optional().or(z.literal(""));

export const productBodySchema = z.object({
  blogId: z.string().min(1),
  title: z.string().min(2).max(160),
  description: z.string().min(10).max(500),
  image: optionalUrl.transform((value) => value || undefined),
  buyUrl: z.string().url(),
  price: optionalText.transform((value) => value || undefined)
});

export const createProductSchema = z.object({
  body: productBodySchema
});

export const updateProductSchema = z.object({
  params: z.object({
    id: z.string().min(1)
  }),
  body: productBodySchema.partial().extend({
    blogId: z.string().min(1).optional()
  })
});
