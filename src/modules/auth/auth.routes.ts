import { Router } from "express";

import { authMiddleware } from "../../middleware/auth.middleware";
import { validateRequest } from "../../middleware/validate.middleware";
import { loginController, logoutController, meController, refreshController } from "./auth.controller";
import { loginSchema } from "./auth.schema";

export const authRoutes = Router();

authRoutes.post("/login", validateRequest(loginSchema), loginController);
authRoutes.post("/refresh", refreshController);
authRoutes.post("/logout", logoutController);
authRoutes.get("/me", authMiddleware, meController);
