import { BlogStatus } from "@prisma/client";
import { z } from "zod";

const optionalText = z.string().trim().optional().or(z.literal(""));
const optionalUrl = z.string().url().optional().or(z.literal(""));

const hasArticleContent = (value: string) =>
  value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().length > 0;

export const productInputSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).max(500),
  image: optionalUrl.transform((value) => value || undefined),
  buyUrl: z.string().url(),
  price: optionalText.transform((value) => value || undefined),
});

export const blogBodySchema = z.object({
  title: z.string().trim().min(1).max(160),
  slug: optionalText.transform((value) => value || undefined),
  excerpt: z.string().trim().min(1).max(320),
  content: z.string().refine(hasArticleContent, {
    message: "Article content is required.",
  }),
  featuredImage: optionalUrl.transform((value) => value || undefined),
  categoryId: optionalText.transform((value) => value || undefined),
  tagIds: z.array(z.string()).default([]),
  metaTitle: optionalText.transform((value) => value || undefined),
  metaDescription: optionalText.transform((value) => value || undefined),
  pinterestUrl: optionalUrl.transform((value) => value || undefined),
  status: z.nativeEnum(BlogStatus).default(BlogStatus.PUBLISHED),
  products: z.array(productInputSchema).default([]),
});

export const createBlogSchema = z.object({
  body: blogBodySchema,
});

export const updateBlogSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
  body: blogBodySchema,
});

export const listBlogsSchema = z.object({
  query: z.object({
    page: z.coerce.number().min(1).default(1),
    pageSize: z.coerce.number().min(1).max(24).default(12),
    search: optionalText.transform((value) => value || undefined),
    category: optionalText.transform((value) => value || undefined),
    status: z.nativeEnum(BlogStatus).optional(),
    sort: z.enum(["latest", "trending"]).default("latest"),
  }),
});

export const getBlogBySlugSchema = z.object({
  params: z.object({
    slug: z.string().min(1),
  }),
});

export const trackBlogVisitSchema = z.object({
  params: z.object({
    slug: z.string().min(1),
  }),
  body: z.object({
    visitorId: z.string().min(16).max(128),
  }),
});
