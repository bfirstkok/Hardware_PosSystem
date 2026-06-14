import assert from "node:assert/strict";
import test from "node:test";
import { parseEmployeeLoginPayload } from "./employee-login-validation.mjs";

test("employee login payload trims employee code and keeps next path", () => {
  assert.deepEqual(
    parseEmployeeLoginPayload({
      employeeCode: " emp002 ",
      password: "secret",
      nextPath: "/sales-history",
    }),
    {
      employeeCode: "emp002",
      password: "secret",
      nextPath: "/sales-history",
    },
  );
});

test("employee login payload rejects missing or oversized fields", () => {
  assert.equal(parseEmployeeLoginPayload({ employeeCode: "", password: "secret" }), null);
  assert.equal(parseEmployeeLoginPayload({ employeeCode: "EMP002", password: "" }), null);
  assert.equal(parseEmployeeLoginPayload({ employeeCode: "A".repeat(121), password: "secret" }), null);
  assert.equal(parseEmployeeLoginPayload({ employeeCode: "EMP002", password: "x".repeat(201) }), null);
  assert.equal(parseEmployeeLoginPayload(null), null);
});
