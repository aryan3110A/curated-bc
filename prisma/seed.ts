import { BlogStatus, PrismaClient, Role } from "@prisma/client";

import { env } from "../src/config/env";
import { hashPassword } from "../src/utils/password";
import { createSlug } from "../src/utils/slug";

const prisma = new PrismaClient();

const sampleContent = `
<section>
  <p>Minimal interiors work best when every surface has room to breathe. Pinterest traffic often spikes around calming spaces, and that means the blog experience needs to be equal parts inspirational and practical.</p>
  <h2>Start with a warm neutral base</h2>
  <p>Choose beige, cream, and muted stone as the foundation of the room. These shades photograph beautifully and create enough contrast for texture-led styling.</p>
  <h2>Layer soft shapes</h2>
  <p>Rounded lamps, curved accent chairs, and washed linen pillows make the room feel editorial without looking staged. Keep the palette narrow and let shape do the work.</p>
  <h2>Add two purposeful products</h2>
  <p>An oversized boucle chair and a travertine side table give readers a natural path from inspiration into shopping intent without turning the article into a catalog.</p>
</section>
`;

const seed = async () => {
  const password = await hashPassword(env.ADMIN_PASSWORD);

  const admin = await prisma.user.upsert({
    where: { email: env.ADMIN_EMAIL },
    update: {
      name: "Platform Admin",
      password,
      role: Role.ADMIN
    },
    create: {
      name: "Platform Admin",
      email: env.ADMIN_EMAIL,
      password,
      role: Role.ADMIN
    }
  });

  const categoryNames = ["Home Decor", "Slow Living", "Workspaces", "Seasonal Styling"];
  const tagNames = ["Minimal", "Pinterest", "Affiliate", "Styling", "Organic Traffic"];

  const categories = await Promise.all(
    categoryNames.map((name) =>
      prisma.category.upsert({
        where: { slug: createSlug(name) },
        update: { name },
        create: { name, slug: createSlug(name) }
      })
    )
  );

  const tags = await Promise.all(
    tagNames.map((name) =>
      prisma.tag.upsert({
        where: { slug: createSlug(name) },
        update: { name },
        create: { name, slug: createSlug(name) }
      })
    )
  );

  const blog = await prisma.blog.upsert({
    where: { slug: "minimal-living-room-ideas" },
    update: {
      title: "Minimal Living Room Ideas That Still Feel Warm",
      excerpt: "A Pinterest-friendly guide to creating a serene living room with warmth, texture, and thoughtful product placement.",
      content: sampleContent,
      featuredImage: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
      categoryId: categories[0]?.id,
      authorId: admin.id,
      metaTitle: "Minimal Living Room Ideas for Warm, Elevated Spaces",
      metaDescription: "Discover elegant minimal living room ideas with soft textures, Pinterest-inspired styling, and curated product recommendations.",
      pinterestUrl: "https://www.pinterest.com/",
      status: BlogStatus.PUBLISHED,
      readingTime: 4,
      views: 172,
      tags: {
        set: tags.map((tag) => ({ id: tag.id }))
      }
    },
    create: {
      title: "Minimal Living Room Ideas That Still Feel Warm",
      slug: "minimal-living-room-ideas",
      excerpt: "A Pinterest-friendly guide to creating a serene living room with warmth, texture, and thoughtful product placement.",
      content: sampleContent,
      featuredImage: "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80",
      categoryId: categories[0]?.id,
      authorId: admin.id,
      metaTitle: "Minimal Living Room Ideas for Warm, Elevated Spaces",
      metaDescription: "Discover elegant minimal living room ideas with soft textures, Pinterest-inspired styling, and curated product recommendations.",
      pinterestUrl: "https://www.pinterest.com/",
      status: BlogStatus.PUBLISHED,
      readingTime: 4,
      views: 172,
      tags: {
        connect: tags.map((tag) => ({ id: tag.id }))
      }
    }
  });

  await prisma.product.deleteMany({
    where: { blogId: blog.id }
  });

  await prisma.product.createMany({
    data: [
      {
        blogId: blog.id,
        title: "Curved Boucle Accent Chair",
        description: "Soft sculptural seating that adds warmth and texture without overwhelming the room.",
        image: "https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=900&q=80",
        buyUrl: "https://example.com/products/boucle-chair",
        price: "$399"
      },
      {
        blogId: blog.id,
        title: "Travertine Side Table",
        description: "A muted stone accent piece that brings premium editorial character to a neutral corner.",
        image: "https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=900&q=80",
        buyUrl: "https://example.com/products/travertine-side-table",
        price: "$259"
      }
    ]
  });
};

seed()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });