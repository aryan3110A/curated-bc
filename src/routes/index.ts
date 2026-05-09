import { Router } from "express";

import { aiRoutes } from "../modules/ai/ai.routes";
import { authRoutes } from "../modules/auth/auth.routes";
import { blogRoutes } from "../modules/blogs/blog.routes";
import { categoryRoutes } from "../modules/categories/category.routes";
import { productRoutes } from "../modules/products/product.routes";
import { tagRoutes } from "../modules/tags/tag.routes";
import { uploadRoutes } from "../modules/uploads/upload.routes";

export const apiRouter = Router();

apiRouter.use("/auth", authRoutes);
apiRouter.use("/blogs", blogRoutes);
apiRouter.use("/products", productRoutes);
apiRouter.use("/categories", categoryRoutes);
apiRouter.use("/tags", tagRoutes);
apiRouter.use("/uploads", uploadRoutes);
apiRouter.use("/ai", aiRoutes);
