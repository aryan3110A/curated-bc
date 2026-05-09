import { Router } from "express";

import { authMiddleware } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/role.middleware";
import { validateRequest } from "../../middleware/validate.middleware";
import { generateBlogController, generateCaptionController, generateSeoController } from "./ai.controller";
import { generateBlogSchema, generateCaptionSchema, generateSeoSchema } from "./ai.schema";

export const aiRoutes = Router();

aiRoutes.post("/generate-blog", authMiddleware, authorize("ADMIN", "EDITOR"), validateRequest(generateBlogSchema), generateBlogController);
aiRoutes.post("/generate-seo", authMiddleware, authorize("ADMIN", "EDITOR"), validateRequest(generateSeoSchema), generateSeoController);
aiRoutes.post("/generate-caption", authMiddleware, authorize("ADMIN", "EDITOR"), validateRequest(generateCaptionSchema), generateCaptionController);