import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildSalesExportFilters,
  salesToCsv,
} from "./sales-history-export.mjs";

test("buildSalesExportFilters keeps selected form filters for CSV download", () => {
  const filters = buildSalesExportFilters(
    new URLSearchParams({
      from: "2026-05-01",
      to: "2026-05-14",
      payment: "transfer",
      status: "refund",
    }),
  );

  assert.equal(filters.selectedPayment, "transfer");
  assert.equal(filters.selectedStatus, "refund");
  assert.equal(filters.range.start.toISOString(), "2026-04-30T17:00:00.000Z");
  assert.equal(filters.range.end.toISOString(), "2026-05-14T17:00:00.000Z");
});

test("buildSalesExportFilters falls back from invalid filters to safe defaults", () => {
  const filters = buildSalesExportFilters(
    new URLSearchParams({
      payment: "promptpay",
      status: "deleted",
      period: "decade",
    }),
    new Date("2026-05-14T08:00:00.000Z"),
  );

  assert.equal(filters.selectedPayment, "all");
  assert.equal(filters.selectedStatus, "all");
  assert.equal(filters.range.start.toISOString(), "2026-05-13T17:00:00.000Z");
  assert.equal(filters.range.end.toISOString(), "2026-05-14T17:00:00.000Z");
});

test("salesToCsv exports cashier, offline, payment, and escaped item columns", () => {
  const csv = salesToCsv(
    [
      {
        sale_no: "SALE-1",
        sale_date: "2026-05-14T03:30:00.000Z",
        subtotal: 100,
        discount_amount: 5,
        total_amount: 95,
        payment_method: "cash",
        status: "completed",
        created_by: "user-1",
        client_invoice_no: "OFF-1",
        offline_created_at: "2026-05-14T03:00:00.000Z",
        sale_items: [
          {
            qty: 2,
            unit_price: 50,
            line_total: 100,
            products: { sku: "SKU-1", name: 'สี, "ขาว"' },
          },
        ],
        payments: [{ payment_method: "cash", amount: 95, reference_no: "REF-1" }],
      },
    ],
    "user-1",
    "cashier@example.com",
  );

  assert.ok(csv.startsWith("\uFEFFsale_no,sale_date,status"));
  assert.match(csv, /cashier@example\.com/);
  assert.match(csv, /OFF-1/);
  assert.match(csv, /cash:95:REF-1/);
  assert.match(csv, /"สี, ""ขาว"""/);
});

test("salesToCsv neutralizes spreadsheet formulas from text fields", () => {
  const csv = salesToCsv(
    [
      {
        sale_no: "=SALE-1",
        sale_date: "2026-05-14T03:30:00.000Z",
        subtotal: 100,
        discount_amount: 0,
        total_amount: 100,
        payment_method: "cash",
        status: "completed",
        created_by: "user-1",
        client_invoice_no: null,
        offline_created_at: null,
        sale_items: [
          {
            qty: 1,
            unit_price: 100,
            line_total: 100,
            products: { sku: "+SKU-1", name: "@danger" },
          },
        ],
        payments: [{ payment_method: "cash", amount: 100, reference_no: "-REF-1" }],
      },
    ],
    "user-1",
  );

  assert.match(csv, /'=SALE-1/);
  assert.match(csv, /'\+SKU-1/);
  assert.match(csv, /'@danger/);
  assert.match(csv, /cash:100:'-REF-1/);
});
