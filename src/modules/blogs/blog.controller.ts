import { asyncHandler } from "../../utils/async-handler";
import { blogService } from "./blog.service";

const canManageDrafts = (role?: string) =>
  role === "ADMIN" || role === "EDITOR";

export const listBlogsController = asyncHandler(async (req, res) => {
  const includeDrafts = canManageDrafts(req.user?.role);
  const query = req.query as {
    page?: string;
    pageSize?: string;
    search?: string;
    category?: string;
    status?: "DRAFT" | "PUBLISHED";
    sort?: "latest" | "trending";
  };

  const page = Number(query.page ?? 1);
  const pageSize = Number(query.pageSize ?? 12);

  const data = await blogService.list(
    {
      page,
      pageSize,
      search: query.search,
      category: query.category,
      status: query.status,
      sort: query.sort ?? "latest",
    },
    includeDrafts,
  );

  res.status(200).json({
    success: true,
    data,
  });
});

export const getBlogBySlugController = asyncHandler(async (req, res) => {
  const includeDrafts = canManageDrafts(req.user?.role);
  const data = await blogService.getBySlug(req.params.slug, includeDrafts);

  res.status(200).json({
    success: true,
    data,
  });
});

export const trackBlogVisitController = asyncHandler(async (req, res) => {
  const data = await blogService.trackVisit(
    req.params.slug,
    req.body.visitorId,
  );

  res.status(200).json({
    success: true,
    data,
  });
});

export const getBlogByIdController = asyncHandler(async (req, res) => {
  const blog = await blogService.getById(req.params.id);

  res.status(200).json({
    success: true,
    data: blog,
  });
});

export const createBlogController = asyncHandler(async (req, res) => {
  const blog = await blogService.create(req.user!.id, req.body);

  res.status(201).json({
    success: true,
    data: blog,
  });
});

export const updateBlogController = asyncHandler(async (req, res) => {
  const blog = await blogService.update(req.params.id, req.body);

  res.status(200).json({
    success: true,
    data: blog,
  });
});

export const deleteBlogController = asyncHandler(async (req, res) => {
  await blogService.remove(req.params.id);

  res.status(200).json({
    success: true,
    message: "Blog deleted successfully.",
  });
});

export const adminBlogSummaryController = asyncHandler(async (_req, res) => {
  const summary = await blogService.getAdminSummary();

  res.status(200).json({
    success: true,
    data: summary,
  });
});
