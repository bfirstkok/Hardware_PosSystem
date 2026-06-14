import test from "node:test";
import assert from "node:assert/strict";
import {
  campaignStatusLabel,
  discountSummary,
  estimateDiscount,
  promotionSummary,
} from "./promotion-rules.mjs";

test("campaignStatusLabel reports active, scheduled, expired, and disabled states", () => {
  const now = new Date("2026-05-18T08:00:00.000Z");

  assert.equal(campaignStatusLabel({ is_active: true }, now), "กำลังใช้งาน");
  assert.equal(campaignStatusLabel({ is_active: false }, now), "ปิดใช้งาน");
  assert.equal(
    campaignStatusLabel({ is_active: true, starts_at: "2026-05-20T00:00:00.000Z" }, now),
    "รอเริ่ม",
  );
  assert.equal(
    campaignStatusLabel({ is_active: true, ends_at: "2026-05-01T00:00:00.000Z" }, now),
    "หมดอายุ",
  );
});

test("discountSummary describes amount, percent cap, threshold, and approval", () => {
  assert.equal(
    discountSummary({
      discount_type: "percent",
      value: 10,
      min_purchase_amount: 500,
      max_discount_amount: 120,
      requires_approval: true,
    }),
    "ลด 10% · ขั้นต่ำ 500.00 บาท · ลดสูงสุด 120.00 บาท · ต้องอนุมัติ",
  );

  assert.equal(
    discountSummary({ discount_type: "amount", value: 50, min_purchase_amount: 0 }),
    "ลด 50.00 บาท",
  );
});

test("estimateDiscount respects minimum purchase, caps, and subtotal floor", () => {
  assert.equal(estimateDiscount({ discount_type: "percent", value: 10, min_purchase_amount: 500 }, 300), 0);
  assert.equal(
    estimateDiscount({ discount_type: "percent", value: 10, min_purchase_amount: 500, max_discount_amount: 80 }, 1000),
    80,
  );
  assert.equal(estimateDiscount({ discount_type: "amount", value: 150 }, 100), 100);
});

test("promotionSummary describes promotion mechanics", () => {
  assert.equal(
    promotionSummary({ promotion_type: "buy_x_get_y", buy_qty: 2, get_qty: 1 }),
    "ซื้อ 2 แถม 1",
  );
  assert.equal(
    promotionSummary({ promotion_type: "threshold", min_purchase_amount: 1500, reward_text: "คูปองส่งฟรี" }),
    "ซื้อครบ 1,500.00 บาท รับ คูปองส่งฟรี",
  );
});
