import { Router } from "express";

import { authMiddleware, optionalAuthMiddleware } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/role.middleware";
import { validateRequest } from "../../middleware/validate.middleware";
import {
  adminBlogSummaryController,
  createBlogController,
  deleteBlogController,
  getBlogByIdController,
  getBlogBySlugController,
  listBlogsController,
  updateBlogController
} from "./blog.controller";
import { createBlogSchema, getBlogBySlugSchema, listBlogsSchema, updateBlogSchema } from "./blog.schema";

export const blogRoutes = Router();

blogRoutes.get("/admin/summary", authMiddleware, authorize("ADMIN", "EDITOR"), adminBlogSummaryController);
blogRoutes.get("/admin/:id", authMiddleware, authorize("ADMIN", "EDITOR"), getBlogByIdController);
blogRoutes.get("/", optionalAuthMiddleware, validateRequest(listBlogsSchema), listBlogsController);
blogRoutes.get("/:slug", optionalAuthMiddleware, validateRequest(getBlogBySlugSchema), getBlogBySlugController);
blogRoutes.post("/", authMiddleware, authorize("ADMIN", "EDITOR"), validateRequest(createBlogSchema), createBlogController);
blogRoutes.put("/:id", authMiddleware, authorize("ADMIN", "EDITOR"), validateRequest(updateBlogSchema), updateBlogController);
blogRoutes.delete("/:id", authMiddleware, authorize("ADMIN"), deleteBlogController);
