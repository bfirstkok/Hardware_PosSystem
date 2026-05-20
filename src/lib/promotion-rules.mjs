export function money(value) {
  return Number(value || 0).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function campaignStatusLabel(rule, now = new Date()) {
  if (!rule?.is_active) return "ปิดใช้งาน";

  const startsAt = rule.starts_at ? new Date(rule.starts_at) : null;
  const endsAt = rule.ends_at ? new Date(rule.ends_at) : null;

  if (startsAt && startsAt > now) return "รอเริ่ม";
  if (endsAt && endsAt < now) return "หมดอายุ";
  return "กำลังใช้งาน";
}

export function discountSummary(rule) {
  const value = Math.max(Number(rule?.value || 0), 0);
  const type = rule?.discount_type === "amount" ? "amount" : "percent";
  const min = Math.max(Number(rule?.min_purchase_amount || 0), 0);
  const max = Math.max(Number(rule?.max_discount_amount || 0), 0);
  const parts = [];

  parts.push(type === "amount" ? `ลด ${money(value)} บาท` : `ลด ${value.toLocaleString("th-TH")}%`);

  if (min > 0) parts.push(`ขั้นต่ำ ${money(min)} บาท`);
  if (type === "percent" && max > 0) parts.push(`ลดสูงสุด ${money(max)} บาท`);
  if (rule?.requires_approval) parts.push("ต้องอนุมัติ");

  return parts.join(" · ");
}

export function estimateDiscount(rule, subtotal) {
  const amount = Math.max(Number(subtotal || 0), 0);
  const min = Math.max(Number(rule?.min_purchase_amount || 0), 0);
  if (amount <= 0 || amount < min) return 0;

  const value = Math.max(Number(rule?.value || 0), 0);
  const raw = rule?.discount_type === "amount" ? value : amount * (value / 100);
  const max = Math.max(Number(rule?.max_discount_amount || 0), 0);
  const capped = rule?.discount_type === "percent" && max > 0 ? Math.min(raw, max) : raw;

  return Math.min(amount, Math.max(capped, 0));
}

export function promotionSummary(rule) {
  const type = rule?.promotion_type;
  const buyQty = Math.max(Number(rule?.buy_qty || 0), 0);
  const getQty = Math.max(Number(rule?.get_qty || 0), 0);
  const min = Math.max(Number(rule?.min_purchase_amount || 0), 0);
  const reward = rule?.reward_text?.trim();

  if (type === "buy_x_get_y") {
    return `ซื้อ ${buyQty.toLocaleString("th-TH")} แถม ${getQty.toLocaleString("th-TH")}`;
  }
  if (type === "threshold") {
    return `ซื้อครบ ${money(min)} บาท${reward ? ` รับ ${reward}` : ""}`;
  }
  if (type === "price_drop") {
    return reward || "ราคาพิเศษรายสินค้า";
  }
  return reward || "แคมเปญหน้าร้าน";
}
