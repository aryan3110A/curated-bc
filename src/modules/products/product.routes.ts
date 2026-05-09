import { Router } from "express";

import { authMiddleware } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/role.middleware";
import { validateRequest } from "../../middleware/validate.middleware";
import { createProductController, deleteProductController, updateProductController } from "./product.controller";
import { createProductSchema, updateProductSchema } from "./product.schema";

export const productRoutes = Router();

productRoutes.post("/", authMiddleware, authorize("ADMIN", "EDITOR"), validateRequest(createProductSchema), createProductController);
productRoutes.put("/:id", authMiddleware, authorize("ADMIN", "EDITOR"), validateRequest(updateProductSchema), updateProductController);
productRoutes.delete("/:id", authMiddleware, authorize("ADMIN", "EDITOR"), deleteProductController);
