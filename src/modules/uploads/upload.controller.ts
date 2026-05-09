import { StatusCodes } from "http-status-codes";

import { AppError } from "../../utils/app-error";
import { asyncHandler } from "../../utils/async-handler";
import { uploadService } from "./upload.service";

export const uploadImageController = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError("Please attach an image file.", StatusCodes.BAD_REQUEST);
  }

  if (!req.file.mimetype.startsWith("image/")) {
    throw new AppError("Only image uploads are supported.", StatusCodes.BAD_REQUEST);
  }

  const folder = (req.body.folder || "content") as "featured" | "content" | "products";
  const uploadedAsset = await uploadService.uploadImage(req.file, folder);

  res.status(201).json({
    success: true,
    data: uploadedAsset
  });
});
