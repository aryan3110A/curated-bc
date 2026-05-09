import { asyncHandler } from "../../utils/async-handler";
import { aiService } from "./ai.service";

export const generateBlogController = asyncHandler(async (req, res) => {
  const result = await aiService.generateBlog(req.body);

  res.status(200).json({
    success: true,
    data: result
  });
});

export const generateSeoController = asyncHandler(async (req, res) => {
  const result = await aiService.generateSeo(req.body);

  res.status(200).json({
    success: true,
    data: result
  });
});

export const generateCaptionController = asyncHandler(async (req, res) => {
  const result = await aiService.generateCaption(req.body);

  res.status(200).json({
    success: true,
    data: result
  });
});
