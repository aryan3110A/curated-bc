import { BlogStatus, Prisma } from "@prisma/client";

import { db } from "../../config/db";

export const blogCardSelect = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  featuredImage: true,
  status: true,
  readingTime: true,
  views: true,
  uniqueViews: true,
  createdAt: true,
  updatedAt: true,
  metaTitle: true,
  metaDescription: true,
  pinterestUrl: true,
  author: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  category: true,
  tags: true,
  products: true,
} satisfies Prisma.BlogSelect;

export const blogDetailInclude = {
  author: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  category: true,
  tags: true,
  products: true,
} satisfies Prisma.BlogInclude;

type ListBlogFilters = {
  page: number;
  pageSize: number;
  search?: string;
  category?: string;
  status?: BlogStatus;
  sort: "latest" | "trending";
  includeDrafts: boolean;
};

const buildWhere = (filters: ListBlogFilters): Prisma.BlogWhereInput => {
  const where: Prisma.BlogWhereInput = {};

  if (!filters.includeDrafts) {
    where.status = BlogStatus.PUBLISHED;
  } else if (filters.status) {
    where.status = filters.status;
  }

  if (filters.search) {
    where.OR = [
      {
        title: {
          contains: filters.search,
          mode: "insensitive",
        },
      },
      {
        excerpt: {
          contains: filters.search,
          mode: "insensitive",
        },
      },
      {
        tags: {
          some: {
            name: {
              contains: filters.search,
              mode: "insensitive",
            },
          },
        },
      },
    ];
  }

  if (filters.category) {
    where.category = {
      slug: filters.category,
    };
  }

  return where;
};

export const blogRepository = {
  async list(filters: ListBlogFilters) {
    const where = buildWhere(filters);
    const orderBy =
      filters.sort === "trending"
        ? { views: "desc" as const }
        : { createdAt: "desc" as const };
    const skip = (filters.page - 1) * filters.pageSize;

    const [items, total] = await db.$transaction([
      db.blog.findMany({
        where,
        orderBy,
        skip,
        take: filters.pageSize,
        select: blogCardSelect,
      }),
      db.blog.count({ where }),
    ]);

    return {
      items,
      total,
    };
  },

  findBySlug(slug: string, includeDrafts: boolean) {
    return db.blog.findFirst({
      where: {
        slug,
        ...(includeDrafts ? {} : { status: BlogStatus.PUBLISHED }),
      },
      include: blogDetailInclude,
    });
  },

  findById(id: string) {
    return db.blog.findUnique({
      where: { id },
      include: blogDetailInclude,
    });
  },

  findMatchingSlugs(baseSlug: string, excludeId?: string) {
    return db.blog.findMany({
      where: {
        slug: {
          startsWith: baseSlug,
        },
        ...(excludeId
          ? {
              NOT: {
                id: excludeId,
              },
            }
          : {}),
      },
      select: {
        slug: true,
      },
    });
  },

  create(data: Prisma.BlogCreateInput) {
    return db.blog.create({
      data,
      include: blogDetailInclude,
    });
  },

  update(id: string, data: Prisma.BlogUpdateInput) {
    return db.blog.update({
      where: { id },
      data,
      include: blogDetailInclude,
    });
  },

  delete(id: string) {
    return db.blog.delete({
      where: { id },
    });
  },

  incrementViews(id: string) {
    return db.blog.update({
      where: { id },
      data: {
        views: {
          increment: 1,
        },
      },
    });
  },

  async trackVisit(blogId: string, visitorId: string) {
    return db.$transaction(async (tx) => {
      const createdVisit = await tx.blogVisit.createMany({
        data: [
          {
            blogId,
            visitorId,
          },
        ],
        skipDuplicates: true,
      });

      if (!createdVisit.count) {
        await tx.blogVisit.update({
          where: {
            blogId_visitorId: {
              blogId,
              visitorId,
            },
          },
          data: {
            totalVisits: {
              increment: 1,
            },
            lastViewedAt: new Date(),
          },
        });
      }

      return tx.blog.update({
        where: { id: blogId },
        data: {
          views: {
            increment: 1,
          },
          uniqueViews: {
            increment: createdVisit.count ? 1 : 0,
          },
        },
        select: {
          views: true,
          uniqueViews: true,
        },
      });
    });
  },

  listRelated(blogId: string, categoryId?: string | null) {
    if (!categoryId) {
      return Promise.resolve([]);
    }

    return db.blog.findMany({
      where: {
        id: {
          not: blogId,
        },
        categoryId,
        status: BlogStatus.PUBLISHED,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 3,
      select: blogCardSelect,
    });
  },

  async getAdminSummary() {
    const [
      totalBlogs,
      publishedBlogs,
      draftBlogs,
      viewsAggregate,
      recentBlogs,
    ] = await db.$transaction([
      db.blog.count(),
      db.blog.count({ where: { status: BlogStatus.PUBLISHED } }),
      db.blog.count({ where: { status: BlogStatus.DRAFT } }),
      db.blog.aggregate({
        _sum: {
          views: true,
        },
      }),
      db.blog.findMany({
        orderBy: {
          updatedAt: "desc",
        },
        take: 5,
        select: blogCardSelect,
      }),
    ]);

    return {
      totalBlogs,
      publishedBlogs,
      draftBlogs,
      totalViews: viewsAggregate._sum.views ?? 0,
      recentBlogs,
    };
  },
};
