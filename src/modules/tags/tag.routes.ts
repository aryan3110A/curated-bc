import { Router } from "express";

import { authMiddleware } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/role.middleware";
import { validateRequest } from "../../middleware/validate.middleware";
import { createTagController, listTagsController } from "./tag.controller";
import { createTagSchema } from "./tag.schema";

export const tagRoutes = Router();

tagRoutes.get("/", listTagsController);
tagRoutes.post("/", authMiddleware, authorize("ADMIN", "EDITOR"), validateRequest(createTagSchema), createTagController);
