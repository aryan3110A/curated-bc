import { randomUUID } from "crypto";
import path from "path";

import { getFirebaseBucket } from "../../config/firebase";

const folderMap = {
  featured: "featured",
  content: "content",
  products: "products",
} as const;

export type UploadFolder = keyof typeof folderMap;

export const uploadService = {
  async uploadImage(
    file: Express.Multer.File,
    folder: UploadFolder = "content",
  ) {
    const bucket = getFirebaseBucket();
    const extension = path.extname(file.originalname) || ".jpg";
    const assetId = `${Date.now()}-${randomUUID()}${extension}`;

    if (!bucket) {
      const placeholderPath = `placeholder://${folderMap[folder]}/${assetId}`;

      return {
        path: placeholderPath,
        url: placeholderPath,
      };
    }

    const storagePath = `blogs/${folderMap[folder]}/${assetId}`;
    const storageFile = bucket.file(storagePath);

    await storageFile.save(file.buffer, {
      metadata: {
        contentType: file.mimetype,
        cacheControl: "public, max-age=31536000",
      },
    });

    await storageFile.makePublic();

    return {
      path: storagePath,
      url: `https://storage.googleapis.com/${bucket.name}/${storagePath}`,
    };
  },
};
