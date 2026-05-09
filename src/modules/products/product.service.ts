import { StatusCodes } from "http-status-codes";

import { db } from "../../config/db";
import { AppError } from "../../utils/app-error";

const normalizeOptional = (value?: string) => {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
};

export const productService = {
  async create(input: {
    blogId: string;
    title: string;
    description: string;
    image?: string;
    buyUrl: string;
    price?: string;
  }) {
    const blog = await db.blog.findUnique({
      where: { id: input.blogId }
    });

    if (!blog) {
      throw new AppError("Blog not found.", StatusCodes.NOT_FOUND);
    }

    return db.product.create({
      data: {
        blogId: input.blogId,
        title: input.title,
        description: input.description,
        image: normalizeOptional(input.image),
        buyUrl: input.buyUrl,
        price: normalizeOptional(input.price)
      }
    });
  },

  async update(
    productId: string,
    input: Partial<{
      blogId: string;
      title: string;
      description: string;
      image?: string;
      buyUrl: string;
      price?: string;
    }>
  ) {
    const existingProduct = await db.product.findUnique({
      where: { id: productId }
    });

    if (!existingProduct) {
      throw new AppError("Product not found.", StatusCodes.NOT_FOUND);
    }

    return db.product.update({
      where: { id: productId },
      data: {
        blogId: input.blogId,
        title: input.title,
        description: input.description,
        image: input.image !== undefined ? normalizeOptional(input.image) : undefined,
        buyUrl: input.buyUrl,
        price: input.price !== undefined ? normalizeOptional(input.price) : undefined
      }
    });
  },

  async remove(productId: string) {
    const existingProduct = await db.product.findUnique({
      where: { id: productId }
    });

    if (!existingProduct) {
      throw new AppError("Product not found.", StatusCodes.NOT_FOUND);
    }

    await db.product.delete({
      where: { id: productId }
    });
  }
};
