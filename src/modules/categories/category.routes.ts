import { Router } from "express";

import { authMiddleware } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/role.middleware";
import { validateRequest } from "../../middleware/validate.middleware";
import { createCategoryController, listCategoriesController } from "./category.controller";
import { createCategorySchema } from "./category.schema";

export const categoryRoutes = Router();

categoryRoutes.get("/", listCategoriesController);
categoryRoutes.post("/", authMiddleware, authorize("ADMIN", "EDITOR"), validateRequest(createCategorySchema), createCategoryController);
