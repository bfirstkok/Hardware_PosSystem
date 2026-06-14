import assert from "node:assert/strict";
import test from "node:test";
import {
  canArchiveStaffProfile,
  canEditStaffProfile,
  canSetStaffRole,
  isStaffAccountStatus,
  isStaffEmploymentStatus,
} from "./staff-admin-rules.mjs";

test("owner can edit every staff role", () => {
  assert.equal(canEditStaffProfile("owner", "cashier"), true);
  assert.equal(canEditStaffProfile("owner", "manager"), true);
  assert.equal(canEditStaffProfile("owner", "owner"), true);
});

test("manager can edit only cashier profiles", () => {
  assert.equal(canEditStaffProfile("manager", "cashier"), true);
  assert.equal(canEditStaffProfile("manager", "manager"), false);
  assert.equal(canEditStaffProfile("manager", "owner"), false);
});

test("manager cannot promote a cashier or archive self", () => {
  assert.equal(canSetStaffRole("manager", "cashier", "cashier"), true);
  assert.equal(canSetStaffRole("manager", "cashier", "manager"), false);
  assert.equal(canArchiveStaffProfile("manager", "cashier", false), true);
  assert.equal(canArchiveStaffProfile("manager", "cashier", true), false);
});

test("staff status validators accept only database status values", () => {
  assert.equal(isStaffAccountStatus("active"), true);
  assert.equal(isStaffAccountStatus("blocked"), false);
  assert.equal(isStaffEmploymentStatus("full_time"), true);
  assert.equal(isStaffEmploymentStatus("fired"), false);
});
