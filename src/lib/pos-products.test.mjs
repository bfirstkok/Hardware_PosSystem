import assert from "node:assert/strict";
import { test } from "node:test";
import { filterProducts, MAX_VISIBLE_PRODUCTS } from "./pos-products.mjs";

function product(id, overrides = {}) {
  return {
    id,
    name: `Product ${id}`,
    sku: `SKU-${id}`,
    barcode: `BC-${id}`,
    product_categories: { name: id % 2 ? "A" : "B" },
    ...overrides,
  };
}

test("filterProducts limits rendered products by default", () => {
  const products = Array.from({ length: MAX_VISIBLE_PRODUCTS + 5 }, (_, index) =>
    product(index + 1),
  );

  assert.equal(filterProducts(products, { query: "", activeCategory: "all" }).length, MAX_VISIBLE_PRODUCTS);
});

test("filterProducts searches name, sku, and barcode", () => {
  const products = [
    product(1, { name: "Cement", sku: "MAT-001", barcode: "111" }),
    product(2, { name: "Paint", sku: "MAT-002", barcode: "222" }),
  ];

  assert.equal(filterProducts(products, { query: "cement", activeCategory: "all" })[0].id, 1);
  assert.equal(filterProducts(products, { query: "mat-002", activeCategory: "all" })[0].id, 2);
  assert.equal(filterProducts(products, { query: "111", activeCategory: "all" })[0].id, 1);
});

test("filterProducts applies category before limit", () => {
  const products = Array.from({ length: 140 }, (_, index) => product(index + 1));
  const result = filterProducts(products, { query: "", activeCategory: "B", limit: 10 });

  assert.equal(result.length, 10);
  assert.ok(result.every((item) => item.product_categories.name === "B"));
});
