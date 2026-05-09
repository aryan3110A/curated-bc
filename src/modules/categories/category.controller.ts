import { asyncHandler } from "../../utils/async-handler";
import { categoryService } from "./category.service";

export const listCategoriesController = asyncHandler(async (_req, res) => {
  const categories = await categoryService.list();

  res.status(200).json({
    success: true,
    data: categories
  });
});

export const createCategoryController = asyncHandler(async (req, res) => {
  const category = await categoryService.create(req.body.name);

  res.status(201).json({
    success: true,
    data: category
  });
});
