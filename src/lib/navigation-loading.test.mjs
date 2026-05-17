import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const dataHeavyRoutes = ["barcodes", "dashboard", "pos", "products", "sales-history", "stock"];

test("data-heavy routes have route loading fallbacks", () => {
  for (const route of dataHeavyRoutes) {
    assert.equal(
      existsSync(join("src", "app", route, "loading.tsx")),
      true,
      `${route} should render a loading fallback during slow data navigation`,
    );
  }
});

test("route loading fallbacks share one stable skeleton component", () => {
  assert.equal(existsSync(join("src", "components", "page-loading.tsx")), true);
});
