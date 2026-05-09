import { asyncHandler } from "../../utils/async-handler";
import { tagService } from "./tag.service";

export const listTagsController = asyncHandler(async (_req, res) => {
  const tags = await tagService.list();

  res.status(200).json({
    success: true,
    data: tags
  });
});

export const createTagController = asyncHandler(async (req, res) => {
  const tag = await tagService.create(req.body.name);

  res.status(201).json({
    success: true,
    data: tag
  });
});
