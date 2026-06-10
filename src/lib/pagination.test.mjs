import assert from "node:assert/strict";
import test from "node:test";
import { pageHref, paginationState, parsePage } from "./pagination.mjs";

test("parsePage falls back to page 1 for invalid values", () => {
  assert.equal(parsePage("3"), 3);
  assert.equal(parsePage("0"), 1);
  assert.equal(parsePage("-2"), 1);
  assert.equal(parsePage("bad"), 1);
});

test("paginationState clamps page and exposes range", () => {
  assert.deepEqual(paginationState({ page: 3, pageSize: 100, totalItems: 250 }), {
    currentPage: 3,
    pageCount: 3,
    from: 200,
    to: 299,
    hasPrevious: true,
    hasNext: false,
  });

  assert.equal(paginationState({ page: 99, pageSize: 100, totalItems: 250 }).currentPage, 3);
});

test("pageHref preserves filters and omits page 1", () => {
  assert.equal(
    pageHref("/sales-history", { period: "day", payment: "cash", status: "all", page: "7" }, 2),
    "/sales-history?period=day&payment=cash&status=all&page=2",
  );
  assert.equal(pageHref("/product-history", { period: "day", type: "all" }, 1), "/product-history?period=day&type=all");
});
