import { db } from "../../config/db";
import { createSlug } from "../../utils/slug";

export const tagService = {
  list() {
    return db.tag.findMany({
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
    return db.tag.upsert({
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
