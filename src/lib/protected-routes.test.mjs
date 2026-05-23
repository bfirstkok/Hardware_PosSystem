import assert from "node:assert/strict";
import test from "node:test";
import {
  createLoginRedirectPath,
  isProtectedPath,
  normalizeLocalNextPath,
} from "./protected-routes.mjs";

test("protected route matcher covers POS modules and nested pages", () => {
  assert.equal(isProtectedPath("/pos"), true);
  assert.equal(isProtectedPath("/pos/receipt/123"), true);
  assert.equal(isProtectedPath("/dashboard"), true);
  assert.equal(isProtectedPath("/sales-history/export"), true);
});

test("protected route matcher leaves public and asset routes alone", () => {
  assert.equal(isProtectedPath("/"), false);
  assert.equal(isProtectedPath("/login"), false);
  assert.equal(isProtectedPath("/_next/static/app.js"), false);
});

test("login redirect keeps only local next paths", () => {
  assert.equal(createLoginRedirectPath("/pos", ""), "/login?auth=no-session&next=%2Fpos");
  assert.equal(
    createLoginRedirectPath("/dashboard", "?tab=today"),
    "/login?auth=no-session&next=%2Fdashboard%3Ftab%3Dtoday",
  );
  assert.equal(normalizeLocalNextPath("https://evil.example/phish"), "/pos");
  assert.equal(normalizeLocalNextPath("//evil.example/phish"), "/pos");
  assert.equal(normalizeLocalNextPath("/stock"), "/stock");
});
