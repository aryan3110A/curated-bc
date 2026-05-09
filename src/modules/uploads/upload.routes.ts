import multer from "multer";
import { Router, type RequestHandler } from "express";

import { authMiddleware } from "../../middleware/auth.middleware";
import { authorize } from "../../middleware/role.middleware";
import { uploadImageController } from "./upload.controller";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  }
});

const uploadImageMiddleware = upload.single("image") as unknown as RequestHandler;

export const uploadRoutes = Router();

uploadRoutes.post("/image", authMiddleware, authorize("ADMIN", "EDITOR"), uploadImageMiddleware, uploadImageController);
