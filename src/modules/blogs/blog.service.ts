import { StatusCodes } from "http-status-codes";
import type {
  BlogStatus as BlogPublicationStatus,
  Prisma,
} from "@prisma/client";

import { AppError } from "../../utils/app-error";
import { estimateReadingTime, sanitizeBlogContent } from "../../utils/content";
import { createSlug } from "../../utils/slug";
import { blogRepository } from "./blog.repository";

type ProductInput = {
  title: string;
  description: string;
  image?: string;
  buyUrl: string;
  price?: string;
};

type BlogInput = {
  title: string;
  slug?: string;
  excerpt: string;
  content: string;
  featuredImage?: string;
  categoryId?: string;
  tagIds: string[];
  metaTitle?: string;
  metaDescription?: string;
  pinterestUrl?: string;
  status: BlogPublicationStatus;
  products: ProductInput[];
};

type BlogListFilters = {
  page: number;
  pageSize: number;
  search?: string;
  category?: string;
  status?: BlogPublicationStatus;
  sort: "latest" | "trending";
};

const normalizeOptional = (value?: string) => {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
};

const mapProducts = (products: ProductInput[]) =>
  products.map((product) => ({
    title: product.title,
    description: product.description,
    image: normalizeOptional(product.image) ?? undefined,
    buyUrl: product.buyUrl,
    price: normalizeOptional(product.price) ?? undefined,
  }));

const buildUniqueSlug = async (value: string, excludeId?: string) => {
  const baseSlug = createSlug(value);
  const matches = await blogRepository.findMatchingSlugs(baseSlug, excludeId);
  const existingSlugs = new Set(matches.map((item) => item.slug));

  if (!existingSlugs.has(baseSlug)) {
    return baseSlug;
  }

  let suffix = 2;

  while (existingSlugs.has(`${baseSlug}-${suffix}`)) {
    suffix += 1;
  }

  return `${baseSlug}-${suffix}`;
};

const buildCreateData = async (
  authorId: string,
  input: BlogInput,
): Promise<Prisma.BlogCreateInput> => {
  const content = sanitizeBlogContent(input.content);
  const slug = await buildUniqueSlug(input.slug || input.title);

  return {
    title: input.title,
    slug,
    excerpt: input.excerpt,
    content,
    featuredImage: normalizeOptional(input.featuredImage) ?? undefined,
    metaTitle: normalizeOptional(input.metaTitle) ?? input.title,
    metaDescription: normalizeOptional(input.metaDescription) ?? input.excerpt,
    pinterestUrl: normalizeOptional(input.pinterestUrl) ?? undefined,
    status: input.status,
    readingTime: estimateReadingTime(content),
    author: {
      connect: { id: authorId },
    },
    category: input.categoryId
      ? {
          connect: { id: input.categoryId },
        }
      : undefined,
    tags: input.tagIds.length
      ? {
          connect: input.tagIds.map((id) => ({ id })),
        }
      : undefined,
    products: input.products.length
      ? {
          create: mapProducts(input.products),
        }
      : undefined,
  };
};

const buildUpdateData = async (
  blogId: string,
  input: BlogInput,
): Promise<Prisma.BlogUpdateInput> => {
  const content = sanitizeBlogContent(input.content);
  const slug = await buildUniqueSlug(input.slug || input.title, blogId);

  return {
    title: input.title,
    slug,
    excerpt: input.excerpt,
    content,
    featuredImage: normalizeOptional(input.featuredImage),
    metaTitle: normalizeOptional(input.metaTitle) ?? input.title,
    metaDescription: normalizeOptional(input.metaDescription) ?? input.excerpt,
    pinterestUrl: normalizeOptional(input.pinterestUrl),
    status: input.status,
    readingTime: estimateReadingTime(content),
    category: input.categoryId
      ? {
          connect: { id: input.categoryId },
        }
      : {
          disconnect: true,
        },
    tags: {
      set: input.tagIds.map((id) => ({ id })),
    },
    products: {
      deleteMany: {},
      ...(input.products.length
        ? {
            create: mapProducts(input.products),
          }
        : {}),
    },
  };
};

export const blogService = {
  async list(filters: BlogListFilters, includeDrafts: boolean) {
    const result = await blogRepository.list({
      ...filters,
      includeDrafts,
    });

    return {
      items: result.items,
      pagination: {
        page: filters.page,
        pageSize: filters.pageSize,
        total: result.total,
        pageCount: Math.ceil(result.total / filters.pageSize),
      },
    };
  },

  async getBySlug(slug: string, includeDrafts: boolean) {
    const blog = await blogRepository.findBySlug(slug, includeDrafts);

    if (!blog) {
      throw new AppError("Blog not found.", StatusCodes.NOT_FOUND);
    }

    const relatedBlogs = await blogRepository.listRelated(
      blog.id,
      blog.categoryId,
    );

    return {
      blog,
      relatedBlogs,
    };
  },

  async trackVisit(slug: string, visitorId: string) {
    const blog = await blogRepository.findBySlug(slug, false);

    if (!blog) {
      throw new AppError("Blog not found.", StatusCodes.NOT_FOUND);
    }

    return blogRepository.trackVisit(blog.id, visitorId);
  },

  async getById(blogId: string) {
    const blog = await blogRepository.findById(blogId);

    if (!blog) {
      throw new AppError("Blog not found.", StatusCodes.NOT_FOUND);
    }

    return blog;
  },

  async create(authorId: string, input: BlogInput) {
    return blogRepository.create(await buildCreateData(authorId, input));
  },

  async update(blogId: string, input: BlogInput) {
    const existingBlog = await blogRepository.findById(blogId);

    if (!existingBlog) {
      throw new AppError("Blog not found.", StatusCodes.NOT_FOUND);
    }

    return blogRepository.update(blogId, await buildUpdateData(blogId, input));
  },

  async remove(blogId: string) {
    const existingBlog = await blogRepository.findById(blogId);

    if (!existingBlog) {
      throw new AppError("Blog not found.", StatusCodes.NOT_FOUND);
    }

    await blogRepository.delete(blogId);
  },

  getAdminSummary() {
    return blogRepository.getAdminSummary();
  },
};
