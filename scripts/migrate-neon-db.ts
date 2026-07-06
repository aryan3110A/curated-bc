import { PrismaClient } from "@prisma/client";

const OLD_DATABASE_URL = process.env.OLD_DATABASE_URL;
const NEW_DATABASE_URL = process.env.NEW_DATABASE_URL ?? process.env.DATABASE_URL;

if (!OLD_DATABASE_URL || !NEW_DATABASE_URL) {
  throw new Error(
    "Set OLD_DATABASE_URL and NEW_DATABASE_URL (or DATABASE_URL) before running.",
  );
}

const source = new PrismaClient({
  datasources: { db: { url: OLD_DATABASE_URL } },
});

const target = new PrismaClient({
  datasources: { db: { url: NEW_DATABASE_URL } },
});

const countAll = async (client: PrismaClient, label: string) => {
  const [users, categories, tags, blogs, products, blogVisits, refreshTokens] =
    await Promise.all([
      client.user.count(),
      client.category.count(),
      client.tag.count(),
      client.blog.count(),
      client.product.count(),
      client.blogVisit.count(),
      client.refreshToken.count(),
    ]);

  console.log(
    `${label}: users=${users}, categories=${categories}, tags=${tags}, blogs=${blogs}, products=${products}, blogVisits=${blogVisits}, refreshTokens=${refreshTokens}`,
  );

  return { users, categories, tags, blogs, products, blogVisits, refreshTokens };
};

const migrate = async () => {
  console.log("Reading data from old Neon database...");
  const sourceCounts = await countAll(source, "Source");

  const users = await source.user.findMany();
  const categories = await source.category.findMany();
  const tags = await source.tag.findMany();
  const blogs = await source.blog.findMany({
    include: { tags: { select: { id: true } } },
  });
  const products = await source.product.findMany();
  const blogVisits = await source.blogVisit.findMany();
  const refreshTokens = await source.refreshToken.findMany();

  console.log("Clearing target database...");
  await target.blogVisit.deleteMany();
  await target.product.deleteMany();
  await target.refreshToken.deleteMany();
  await target.blog.deleteMany();
  await target.tag.deleteMany();
  await target.category.deleteMany();
  await target.user.deleteMany();

  console.log("Writing data to new Neon database...");
  if (users.length) {
    await target.user.createMany({ data: users });
  }
  if (categories.length) {
    await target.category.createMany({ data: categories });
  }
  if (tags.length) {
    await target.tag.createMany({ data: tags });
  }

  for (const blog of blogs) {
    const { tags: blogTags, ...blogData } = blog;
    await target.blog.create({
      data: {
        ...blogData,
        tags: {
          connect: blogTags.map((tag) => ({ id: tag.id })),
        },
      },
    });
  }

  if (products.length) {
    await target.product.createMany({ data: products });
  }
  if (blogVisits.length) {
    await target.blogVisit.createMany({ data: blogVisits });
  }
  if (refreshTokens.length) {
    await target.refreshToken.createMany({ data: refreshTokens });
  }

  const targetCounts = await countAll(target, "Target");

  const mismatches = Object.entries(sourceCounts).filter(
    ([key, value]) => targetCounts[key as keyof typeof targetCounts] !== value,
  );

  if (mismatches.length) {
    throw new Error(`Migration count mismatch: ${JSON.stringify(mismatches)}`);
  }

  console.log("Migration completed successfully.");
};

migrate()
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await source.$disconnect();
    await target.$disconnect();
  });
