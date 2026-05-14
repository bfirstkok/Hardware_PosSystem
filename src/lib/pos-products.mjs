export const MAX_VISIBLE_PRODUCTS = 120;

export function filterProducts(products, options) {
  const query = options.query.trim().toLowerCase();
  const activeCategory = options.activeCategory;
  const limit = options.limit ?? MAX_VISIBLE_PRODUCTS;
  const matches = [];

  for (const product of products) {
    const inCategory =
      activeCategory === "all" || product.product_categories?.name === activeCategory;
    if (!inCategory) continue;

    const matchesQuery =
      !query ||
      product.name.toLowerCase().includes(query) ||
      product.sku.toLowerCase().includes(query) ||
      product.barcode?.toLowerCase().includes(query);

    if (!matchesQuery) continue;

    matches.push(product);
    if (matches.length >= limit) break;
  }

  return matches;
}
