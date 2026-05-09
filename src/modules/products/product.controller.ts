import { asyncHandler } from "../../utils/async-handler";
import { productService } from "./product.service";

export const createProductController = asyncHandler(async (req, res) => {
  const product = await productService.create(req.body);

  res.status(201).json({
    success: true,
    data: product
  });
});

export const updateProductController = asyncHandler(async (req, res) => {
  const product = await productService.update(req.params.id, req.body);

  res.status(200).json({
    success: true,
    data: product
  });
});

export const deleteProductController = asyncHandler(async (req, res) => {
  await productService.remove(req.params.id);

  res.status(200).json({
    success: true,
    message: "Product deleted successfully."
  });
});
