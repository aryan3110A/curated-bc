import { z } from "zod";

const emptyToUndefined = (value: unknown) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
};

export const generateBlogSchema = z.object({
  body: z.object({
    topic: z.string().trim().min(4).max(160),
    keywords: z.array(z.string().trim().min(1)).default([]),
    tone: z
      .enum(["elevated", "editorial", "warm", "luxury", "practical"])
      .default("editorial"),
    audience: z.preprocess(
      emptyToUndefined,
      z.string().max(120).optional(),
    ),
  }),
});

export const generateSeoSchema = z.object({
  body: z.object({
    title: z.string().trim().min(4).max(160),
    excerpt: z.preprocess(
      emptyToUndefined,
      z.string().min(10).max(320).optional(),
    ),
    content: z.preprocess(
      emptyToUndefined,
      z.string().min(20).optional(),
    ),
  }),
});

export const generateCaptionSchema = z.object({
  body: z.object({
    title: z.string().trim().min(4).max(160),
    keywords: z.array(z.string().trim().min(1)).default([]),
  }),
});
