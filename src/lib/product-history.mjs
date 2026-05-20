export function quantity(value) {
  return Number(value).toLocaleString("th-TH", { maximumFractionDigits: 2 });
}

export function money(value) {
  return Number(value).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function actorLabel(actorId, currentUserId, currentEmail) {
  if (!actorId) return "-";
  if (actorId === currentUserId) return currentEmail ?? "ผู้ใช้ปัจจุบัน";
  return actorId.slice(0, 8);
}

export function movementLabel(type) {
  if (type === "receive") return "รับเข้า";
  if (type === "sale") return "ขายออก";
  if (type === "void_return") return "คืนจากยกเลิก";
  if (type === "refund_return") return "คืนจากคืนเงิน";
  if (type === "price_change") return "แก้ไขราคา";
  return "ปรับยอด";
}

export function movementBadgeClass(type) {
  if (type === "receive") return "bg-emerald-50 text-emerald-700";
  if (type === "sale") return "bg-sky-50 text-sky-700";
  if (type === "void_return") return "bg-rose-50 text-rose-700";
  if (type === "refund_return") return "bg-orange-50 text-orange-700";
  if (type === "price_change") return "bg-amber-50 text-amber-700";
  return "bg-slate-100 text-slate-700";
}

function returnReason(note, prefix) {
  return note?.startsWith(prefix) ? note.slice(prefix.length).trim() : "";
}

export function stockMovementType(item) {
  if (item.movement_type === "receive" && item.ref_type === "sales") {
    if (item.note?.startsWith("Void sale:")) return "void_return";
    if (item.note?.startsWith("Refund sale:")) return "refund_return";
  }
  if (item.movement_type === "receive") return "receive";
  if (item.movement_type === "sale") return "sale";
  return "adjustment";
}

export function saleLineKey(saleId, productId) {
  return `${saleId ?? 0}-${productId}`;
}

export function buildSaleLineLookup(saleLines) {
  return new Map(saleLines.map((item) => [saleLineKey(item.sale_id, item.product_id), item]));
}

export function priceChangeDetail(item) {
  const changes = [
    ["ปลีก", item.old_retail_price, item.new_retail_price],
    ["ส่ง", item.old_wholesale_price, item.new_wholesale_price],
    ["ต้นทุน", item.old_cost_price, item.new_cost_price],
  ]
    .filter(([, oldPrice, newPrice]) => Number(oldPrice) !== Number(newPrice))
    .map(([label, oldPrice, newPrice]) => `${label} ${money(Number(oldPrice))} → ${money(Number(newPrice))}`);

  return changes.join(" / ") || "ราคาไม่เปลี่ยน";
}

export function mapStockMovement(item, saleLines, currentUser) {
  const saleLine = saleLines.get(saleLineKey(item.ref_id, item.product_id));
  const type = stockMovementType(item);
  const saleRef = saleLine?.sales?.sale_no ?? `sales #${item.ref_id}`;
  const voidReason = returnReason(item.note, "Void sale:");
  const refundReason = returnReason(item.note, "Refund sale:");

  return {
    id: `stock-${item.id}`,
    date: item.movement_date,
    productSku: item.products?.sku ?? "-",
    productName: item.products?.name ?? "-",
    type,
    qtyIn: Number(item.qty_in),
    qtyOut: Number(item.qty_out),
    detail:
      type === "sale"
        ? `ราคาขายต่อหน่วย ${money(Number(saleLine?.unit_price ?? 0))}`
        : type === "void_return"
          ? `คืนสต๊อกจากยกเลิก${voidReason ? `: ${voidReason}` : ""}`
          : type === "refund_return"
            ? `คืนสต๊อกจากคืนเงิน${refundReason ? `: ${refundReason}` : ""}`
        : item.note || item.movement_type,
    actor: actorLabel(item.created_by, currentUser.id, currentUser.email),
    ref:
      type === "sale" || type === "void_return" || type === "refund_return"
        ? saleRef
        : item.ref_type && item.ref_id
          ? `${item.ref_type} #${item.ref_id}`
          : item.ref_type ?? "-",
  };
}

export function mapPriceHistory(item, currentUser) {
  return {
    id: `price-${item.id}`,
    date: item.changed_at,
    productSku: item.products?.sku ?? "-",
    productName: item.products?.name ?? "-",
    type: "price_change",
    qtyIn: 0,
    qtyOut: 0,
    detail: priceChangeDetail(item),
    actor: actorLabel(item.changed_by, currentUser.id, currentUser.email),
    ref: "products",
  };
}

function safeSpreadsheetText(value) {
  if (typeof value === "number") return String(value);

  const text = String(value ?? "");
  if (/^[\s]*[=+\-@]/.test(text)) return `'${text}`;
  return text;
}

function csvCell(value) {
  const text = safeSpreadsheetText(value);
  if (/[",\r\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function csvDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleString("sv-SE", {
    timeZone: "Asia/Bangkok",
    hour12: false,
  });
}

export function productHistoryToCsv(historyItems) {
  const headers = [
    "date",
    "product_sku",
    "product_name",
    "type",
    "qty_in",
    "qty_out",
    "detail",
    "reference",
    "actor",
  ];
  const rows = historyItems.map((item) => [
    csvDate(item.date),
    item.productSku,
    item.productName,
    movementLabel(item.type),
    item.qtyIn || "",
    item.qtyOut || "",
    item.detail,
    item.ref,
    item.actor,
  ]);

  return "\uFEFF" + [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
}
