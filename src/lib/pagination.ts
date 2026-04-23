export interface PageArgs {
  page?: number;
  pageSize?: number;
}

export interface PageInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export function normalizePage(
  args: PageArgs,
  defaults = { page: 1, pageSize: 20, max: 100 },
) {
  const page = Math.max(1, Number(args.page) || defaults.page);
  const pageSize = Math.min(
    defaults.max,
    Math.max(1, Number(args.pageSize) || defaults.pageSize),
  );
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}

export function buildPageInfo(
  page: number,
  pageSize: number,
  total: number,
): PageInfo {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}
