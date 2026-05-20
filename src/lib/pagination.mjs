export function parsePage(value) {
  const page = Number(value);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export function paginationState({ page, pageSize, totalItems }) {
  const safePageSize = Math.max(1, Number(pageSize) || 1);
  const safeTotalItems = Math.max(0, Number(totalItems) || 0);
  const pageCount = Math.max(1, Math.ceil(safeTotalItems / safePageSize));
  const currentPage = Math.min(Math.max(1, Number(page) || 1), pageCount);
  const from = (currentPage - 1) * safePageSize;

  return {
    currentPage,
    pageCount,
    from,
    to: from + safePageSize - 1,
    hasPrevious: currentPage > 1,
    hasNext: currentPage < pageCount,
  };
}

export function pageHref(path, params, page) {
  const nextParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params ?? {})) {
    if (value != null && value !== "" && key !== "page") {
      nextParams.set(key, String(value));
    }
  }

  if (page > 1) nextParams.set("page", String(page));

  const query = nextParams.toString();
  return query ? `${path}?${query}` : path;
}
