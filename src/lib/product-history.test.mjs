import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSaleLineLookup,
  mapPriceHistory,
  mapStockMovement,
  priceChangeDetail,
  productHistoryToCsv,
} from "./product-history.mjs";

test("mapStockMovement shows sale number and unit price for sale rows", () => {
  const saleLines = buildSaleLineLookup([
    {
      sale_id: 12,
      product_id: 7,
      unit_price: 145,
      sales: { sale_no: "SALE-202605190001" },
    },
  ]);

  const item = mapStockMovement(
    {
      id: 1,
      product_id: 7,
      movement_date: "2026-05-19T08:00:00.000Z",
      movement_type: "sale",
      qty_in: 0,
      qty_out: 2,
      ref_type: "sales",
      ref_id: 12,
      note: null,
      created_by: "user-1",
      products: { sku: "SKU001", name: "สีทาบ้าน" },
    },
    saleLines,
    { id: "user-1", email: "cashier@example.com" },
  );

  assert.equal(item.ref, "SALE-202605190001");
  assert.equal(item.detail, "ราคาขายต่อหน่วย 145.00");
  assert.equal(item.actor, "cashier@example.com");
});

test("mapStockMovement separates void and refund stock returns", () => {
  const saleLines = buildSaleLineLookup([
    {
      sale_id: 12,
      product_id: 7,
      unit_price: 145,
      sales: { sale_no: "INV-20260520-001" },
    },
  ]);

  const voidItem = mapStockMovement(
    {
      id: 2,
      product_id: 7,
      movement_date: "2026-05-20T08:00:00.000Z",
      movement_type: "receive",
      qty_in: 2,
      qty_out: 0,
      ref_type: "sales",
      ref_id: 12,
      note: "Void sale: ลูกค้าขอยกเลิก",
      created_by: "user-1",
      products: { sku: "SKU001", name: "สีทาบ้าน" },
    },
    saleLines,
    { id: "user-1", email: "cashier@example.com" },
  );

  const refundItem = mapStockMovement(
    {
      id: 3,
      product_id: 7,
      movement_date: "2026-05-20T09:00:00.000Z",
      movement_type: "receive",
      qty_in: 1,
      qty_out: 0,
      ref_type: "sales",
      ref_id: 12,
      note: "Refund sale: สินค้าชำรุด",
      created_by: "user-1",
      products: { sku: "SKU001", name: "สีทาบ้าน" },
    },
    saleLines,
    { id: "user-1", email: "cashier@example.com" },
  );

  assert.equal(voidItem.type, "void_return");
  assert.equal(voidItem.detail, "คืนสต๊อกจากยกเลิก: ลูกค้าขอยกเลิก");
  assert.equal(voidItem.ref, "INV-20260520-001");
  assert.equal(refundItem.type, "refund_return");
  assert.equal(refundItem.detail, "คืนสต๊อกจากคืนเงิน: สินค้าชำรุด");
  assert.equal(refundItem.ref, "INV-20260520-001");
});

test("mapPriceHistory summarizes only changed prices", () => {
  const detail = priceChangeDetail({
    old_retail_price: 100,
    new_retail_price: 120,
    old_wholesale_price: 90,
    new_wholesale_price: 90,
    old_cost_price: 70,
    new_cost_price: 75,
  });

  assert.equal(detail, "ปลีก 100.00 → 120.00 / ต้นทุน 70.00 → 75.00");
});

test("mapPriceHistory maps product, actor, and reference", () => {
  const item = mapPriceHistory(
    {
      id: 3,
      product_id: 7,
      old_retail_price: 100,
      new_retail_price: 120,
      old_wholesale_price: 90,
      new_wholesale_price: 90,
      old_cost_price: 70,
      new_cost_price: 75,
      changed_by: "other-user-id",
      changed_at: "2026-05-19T08:30:00.000Z",
      products: { sku: "SKU001", name: "สีทาบ้าน" },
    },
    { id: "user-1", email: "cashier@example.com" },
  );

  assert.equal(item.id, "price-3");
  assert.equal(item.productSku, "SKU001");
  assert.equal(item.productName, "สีทาบ้าน");
  assert.equal(item.actor, "other-us");
  assert.equal(item.ref, "products");
});

test("productHistoryToCsv exports escaped product history rows", () => {
  const csv = productHistoryToCsv([
    {
      date: "2026-05-19T08:00:00.000Z",
      productSku: "SKU001",
      productName: 'สี, "ขาว"',
      type: "sale",
      qtyIn: 0,
      qtyOut: 2,
      detail: "ราคาขายต่อหน่วย 145.00",
      ref: "SALE-1",
      actor: "cashier@example.com",
    },
  ]);

  assert.ok(csv.startsWith("\uFEFFdate,product_sku,product_name"));
  assert.match(csv, /"สี, ""ขาว"""/);
  assert.match(csv, /SALE-1/);
});

test("productHistoryToCsv neutralizes spreadsheet formulas", () => {
  const csv = productHistoryToCsv([
    {
      date: "2026-05-19T08:00:00.000Z",
      productSku: "+SKU001",
      productName: "@danger",
      type: "price_change",
      qtyIn: 0,
      qtyOut: 0,
      detail: "=bad",
      ref: "-REF",
      actor: "cashier@example.com",
    },
  ]);

  assert.match(csv, /'\+SKU001/);
  assert.match(csv, /'@danger/);
  assert.match(csv, /'=bad/);
  assert.match(csv, /'-REF/);
});
