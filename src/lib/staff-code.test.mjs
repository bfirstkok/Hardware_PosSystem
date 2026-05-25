import assert from "node:assert/strict";
import test from "node:test";
import { nextStaffCode, staffCodePrefix } from "./staff-code.mjs";

test("staff code prefix follows role", () => {
  assert.equal(staffCodePrefix("owner"), "OWN");
  assert.equal(staffCodePrefix("manager"), "MGR");
  assert.equal(staffCodePrefix("cashier"), "CAS");
});

test("nextStaffCode ignores legacy ADMIN and EMP codes", () => {
  assert.equal(nextStaffCode("cashier", ["ADMIN001", "EMP001"]), "CAS001");
  assert.equal(nextStaffCode("cashier", ["CAS001", "CAS009", "EMP010"]), "CAS010");
  assert.equal(nextStaffCode("manager", ["MGR002", "CAS010"]), "MGR003");
  assert.equal(nextStaffCode("owner", ["OWNER001", "OWN004"]), "OWN005");
});
