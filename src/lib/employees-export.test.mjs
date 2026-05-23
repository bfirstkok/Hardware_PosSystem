import assert from "node:assert/strict";
import test from "node:test";
import {
  EMPLOYEE_PAGE_SIZE,
  employeeMatchesFilters,
  employeeSearchOrFilter,
  employeeSearchTerm,
  employeesToCsv,
  normalizeEmployeeFilters,
} from "./employees-export.mjs";

const employee = {
  employee_code: "CAS001",
  display_name: "สมชาย",
  auth_email: "cas001@internal.pos",
  phone: "0812345678",
  role: "cashier",
  job_title: "หน้าร้าน",
  branchName: "สาขาหลัก",
  account_status: "active",
  employment_status: "full_time",
};

test("normalizeEmployeeFilters keeps safe query, role, and status values", () => {
  const filters = normalizeEmployeeFilters(new URLSearchParams("q=CAS&role=cashier&status=active"));
  assert.deepEqual(filters, { q: "CAS", role: "cashier", status: "active" });

  const fallback = normalizeEmployeeFilters(new URLSearchParams("role=admin&status=bad"));
  assert.deepEqual(fallback, { q: "", role: "all", status: "all" });
});

test("employeeMatchesFilters searches code, name, email, phone, role, and status", () => {
  assert.equal(employeeMatchesFilters(employee, { q: "สม", role: "all", status: "all" }), true);
  assert.equal(employeeMatchesFilters(employee, { q: "0812", role: "cashier", status: "active" }), true);
  assert.equal(employeeMatchesFilters(employee, { q: "0812", role: "manager", status: "active" }), false);
  assert.equal(employeeMatchesFilters(employee, { q: "missing", role: "all", status: "all" }), false);
});

test("employeesToCsv exports BOM CSV and neutralizes spreadsheet formulas", () => {
  const csv = employeesToCsv([
    {
      ...employee,
      employee_code: "=CAS001",
      display_name: "+bad",
      phone: "-081",
      job_title: "@role",
    },
  ]);

  assert.ok(csv.startsWith("\uFEFFemployee_code,display_name"));
  assert.match(csv, /"'=CAS001"/);
  assert.match(csv, /"'\+bad"/);
  assert.match(csv, /"'-081"/);
  assert.match(csv, /"'@role"/);
});

test("employee search filter is safe for PostgREST or syntax", () => {
  assert.equal(EMPLOYEE_PAGE_SIZE, 20);
  assert.equal(employeeSearchTerm(" CAS001, test%() "), "CAS001 test");
  assert.equal(
    employeeSearchOrFilter("CAS001"),
    "employee_code.ilike.%CAS001%,display_name.ilike.%CAS001%,auth_email.ilike.%CAS001%,phone.ilike.%CAS001%,job_title.ilike.%CAS001%",
  );
  assert.equal(employeeSearchOrFilter(" ,() "), "");
});
