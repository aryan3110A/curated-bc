import { db } from "../../config/db";
import { createSlug } from "../../utils/slug";

export const categoryService = {
  list() {
    return db.category.findMany({
      orderBy: {
        name: "asc"
      },
      include: {
        _count: {
          select: {
            blogs: true
          }
        }
      }
    });
  },

  create(name: string) {
    return db.category.upsert({
      where: {
        slug: createSlug(name)
      },
      update: {
        name
      },
      create: {
        name,
        slug: createSlug(name)
      }
    });
  }
};
