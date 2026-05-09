export const parsePagination = (page?: number, pageSize?: number) => {
  const safePage = Math.max(1, page ?? 1);
  const safePageSize = Math.min(24, Math.max(1, pageSize ?? 12));

  return {
    page: safePage,
    pageSize: safePageSize,
    skip: (safePage - 1) * safePageSize,
    take: safePageSize
  };
};
