import { z } from "zod";

export const generateBlogSchema = z.object({
  body: z.object({
    topic: z.string().min(4).max(160),
    keywords: z.array(z.string().min(1)).default([]),
    tone: z
      .enum(["elevated", "editorial", "warm", "luxury", "practical"])
      .default("editorial"),
    audience: z.string().max(120).optional(),
  }),
});

export const generateSeoSchema = z.object({
  body: z.object({
    title: z.string().min(4).max(160),
    excerpt: z.string().min(10).max(320).optional(),
    content: z.string().min(20).optional(),
  }),
});

export const generateCaptionSchema = z.object({
  body: z.object({
    title: z.string().min(4).max(160),
    keywords: z.array(z.string().min(1)).default([]),
  }),
});
