export const paymentOptions = ["all", "cash", "transfer", "qr", "card"];
export const statusOptions = ["all", "completed", "void", "refund"];
export const periodOptions = ["day", "week", "month", "year"];
export const voidStatuses = ["void", "voided", "canceled", "cancelled"];
export const refundStatuses = ["refund", "refunded"];

export function bangkokDateParts(date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    year: Number(value.year),
    month: Number(value.month),
    day: Number(value.day),
  };
}

export function bangkokMidnightUtc(year, month, day) {
  return new Date(Date.UTC(year, month - 1, day, -7));
}

export function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function parseDateInput(value) {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const [, year, month, day] = match;
  return bangkokMidnightUtc(Number(year), Number(month), Number(day));
}

export function periodRange(period, now = new Date()) {
  const today = bangkokDateParts(now);
  const currentDay = new Date(Date.UTC(today.year, today.month - 1, today.day));
  const dayOfWeek = currentDay.getUTCDay();
  const mondayOffset = (dayOfWeek + 6) % 7;

  if (period === "week") {
    const weekStartDay = addDays(currentDay, -mondayOffset);
    const start = bangkokMidnightUtc(
      weekStartDay.getUTCFullYear(),
      weekStartDay.getUTCMonth() + 1,
      weekStartDay.getUTCDate(),
    );
    return { start, end: addDays(start, 7) };
  }

  if (period === "month") {
    return {
      start: bangkokMidnightUtc(today.year, today.month, 1),
      end: bangkokMidnightUtc(today.year, today.month + 1, 1),
    };
  }

  if (period === "year") {
    return {
      start: bangkokMidnightUtc(today.year, 1, 1),
      end: bangkokMidnightUtc(today.year + 1, 1, 1),
    };
  }

  const start = bangkokMidnightUtc(today.year, today.month, today.day);
  return { start, end: addDays(start, 1) };
}

export function selectedRange(searchParams, now = new Date()) {
  const from = parseDateInput(searchParams.get("from"));
  const to = parseDateInput(searchParams.get("to"));

  if (from && to) {
    if (to < from) return { start: to, end: addDays(from, 1) };
    return { start: from, end: addDays(to, 1) };
  }

  if (from) return { start: from, end: addDays(from, 1) };
  if (to) return { start: to, end: addDays(to, 1) };

  const requestedPeriod = searchParams.get("period");
  const period = periodOptions.includes(requestedPeriod) ? requestedPeriod : "day";
  return periodRange(period, now);
}

export function buildSalesExportFilters(searchParams, now = new Date()) {
  const requestedPayment = searchParams.get("payment");
  const requestedStatus = searchParams.get("status");

  return {
    range: selectedRange(searchParams, now),
    selectedPayment: paymentOptions.includes(requestedPayment) ? requestedPayment : "all",
    selectedStatus: statusOptions.includes(requestedStatus) ? requestedStatus : "all",
  };
}

function csvCell(value) {
  const text = value == null ? "" : safeSpreadsheetText(value);
  if (/[",\r\n]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
  return text;
}

function safeSpreadsheetText(value) {
  if (typeof value === "number") return String(value);

  const text = String(value);
  if (/^[\s]*[=+\-@]/.test(text)) return `'${text}`;
  return text;
}

function csvDate(value) {
  if (!value) return "";
  return new Date(value).toLocaleString("sv-SE", {
    timeZone: "Asia/Bangkok",
    hour12: false,
  });
}

function cashierLabel(createdBy, currentUserId, currentEmail) {
  if (!createdBy) return "";
  if (createdBy === currentUserId) return currentEmail ?? "current_user";
  return `User ${createdBy.slice(0, 8)}`;
}

export function salesToCsv(sales, currentUserId, currentEmail) {
  const headers = [
    "sale_no",
    "sale_date",
    "status",
    "payment_method",
    "subtotal",
    "discount_amount",
    "total_amount",
    "cashier_user_id",
    "cashier_display_name",
    "client_invoice_no",
    "offline_created_at",
    "item_sku",
    "item_name",
    "item_qty",
    "item_unit_price",
    "item_line_total",
    "payment_rows",
  ];

  const rows = sales.flatMap((sale) => {
    const paymentRows = sale.payments
      .map((payment) =>
        [payment.payment_method, payment.amount, safeSpreadsheetText(payment.reference_no)]
          .filter(Boolean)
          .join(":"),
      )
      .join(" | ");

    if (!sale.sale_items.length) {
      return [
        [
          sale.sale_no,
          csvDate(sale.sale_date),
          sale.status,
          sale.payment_method,
          sale.subtotal,
          sale.discount_amount,
          sale.total_amount,
          sale.created_by,
          cashierLabel(sale.created_by, currentUserId, currentEmail),
          sale.client_invoice_no,
          csvDate(sale.offline_created_at),
          "",
          "",
          "",
          "",
          "",
          paymentRows,
        ],
      ];
    }

    return sale.sale_items.map((item) => [
      sale.sale_no,
      csvDate(sale.sale_date),
      sale.status,
      sale.payment_method,
      sale.subtotal,
      sale.discount_amount,
      sale.total_amount,
      sale.created_by,
      cashierLabel(sale.created_by, currentUserId, currentEmail),
      sale.client_invoice_no,
      csvDate(sale.offline_created_at),
      item.products?.sku,
      item.products?.name,
      item.qty,
      item.unit_price,
      item.line_total,
      paymentRows,
    ]);
  });

  return "\uFEFF" + [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
}
