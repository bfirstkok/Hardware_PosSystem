import assert from "node:assert/strict";
import test from "node:test";
import {
  canAccessRoute,
  canPerformAction,
  getDefaultPathForRole,
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
  assert.equal(canPerformAction("manager", "products.delete"), false);
  assert.equal(canPerformAction("owner", "products.delete"), true);
});

test("default path follows role", () => {
  assert.equal(getDefaultPathForRole("cashier"), "/pos");
  assert.equal(getDefaultPathForRole("manager"), "/dashboard");
  assert.equal(getDefaultPathForRole("owner"), "/dashboard");
});
