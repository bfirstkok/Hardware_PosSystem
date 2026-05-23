import assert from "node:assert/strict";
import test from "node:test";
import {
  canAccessRoute,
  canPerformAction,
  getDefaultPathForRole,
  getPostLoginPathForRole,
  hasMinimumRole,
} from "./permissions.mjs";

test("role hierarchy allows higher roles to access lower role routes", () => {
  assert.equal(hasMinimumRole("cashier", "cashier"), true);
  assert.equal(hasMinimumRole("manager", "cashier"), true);
  assert.equal(hasMinimumRole("owner", "manager"), true);
  assert.equal(hasMinimumRole("cashier", "manager"), false);
});

test("cashier is limited to POS, stock basics, and own sales history surface", () => {
  assert.equal(canAccessRoute("cashier", "/pos"), true);
  assert.equal(canAccessRoute("cashier", "/stock"), true);
  assert.equal(canAccessRoute("cashier", "/sales-history"), true);
  assert.equal(canAccessRoute("cashier", "/products"), false);
  assert.equal(canAccessRoute("cashier", "/reports"), false);
  assert.equal(canAccessRoute("cashier", "/employees"), false);
});

test("missing or invalid roles cannot access protected routes", () => {
  assert.equal(canAccessRoute(null, "/pos"), false);
  assert.equal(canAccessRoute(undefined, "/stock"), false);
  assert.equal(canAccessRoute("unknown", "/dashboard"), false);
  assert.equal(canAccessRoute(null, "/login"), true);
});

test("route access ignores query strings and hashes when matching protected paths", () => {
  assert.equal(canAccessRoute("cashier", "/dashboard?tab=today"), false);
  assert.equal(canAccessRoute("cashier", "/products#form"), false);
  assert.equal(canAccessRoute("manager", "/dashboard?tab=today"), true);
});

test("manager can manage operational modules but not owner-only branch admin", () => {
  assert.equal(canAccessRoute("manager", "/products"), true);
  assert.equal(canAccessRoute("manager", "/reports"), true);
  assert.equal(canAccessRoute("manager", "/employees"), true);
  assert.equal(canAccessRoute("manager", "/branches"), false);
});

test("critical actions follow first-phase permission rules", () => {
  assert.equal(canPerformAction("cashier", "stock.adjust_basic"), true);
  assert.equal(canPerformAction("cashier", "sales.refund"), false);
  assert.equal(canPerformAction("manager", "reports.export"), true);
  assert.equal(canPerformAction("manager", "staff.update_profile"), true);
  assert.equal(canPerformAction("manager", "staff.archive"), true);
  assert.equal(canPerformAction("manager", "products.delete"), false);
  assert.equal(canPerformAction("owner", "products.delete"), true);
  assert.equal(canPerformAction("cashier", "staff.update_profile"), false);
});

test("default path follows role", () => {
  assert.equal(getDefaultPathForRole("cashier"), "/pos");
  assert.equal(getDefaultPathForRole("manager"), "/dashboard");
  assert.equal(getDefaultPathForRole("owner"), "/dashboard");
});

test("post-login path only allows local routes allowed by role", () => {
  assert.equal(getPostLoginPathForRole("cashier", "/sales-history"), "/sales-history");
  assert.equal(getPostLoginPathForRole("cashier", "/dashboard"), "/pos");
  assert.equal(getPostLoginPathForRole("cashier", "/dashboard?tab=today"), "/pos");
  assert.equal(getPostLoginPathForRole("manager", "/dashboard"), "/dashboard");
  assert.equal(getPostLoginPathForRole("manager", "https://evil.example"), "/dashboard");
});
