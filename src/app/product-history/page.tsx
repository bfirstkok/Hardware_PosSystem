import { redirect } from "next/navigation";
import Link from "next/link";
import { CalendarDays, Download, History, RotateCcw, SlidersHorizontal } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import {
  buildSaleLineLookup,
  mapPriceHistory,
  mapStockMovement,
  movementBadgeClass,
  movementLabel,
  quantity,
} from "@/lib/product-history.mjs";
import { createClient } from "@/lib/supabase/server";

type ProductOption = {
  id: number;
  sku: string;
  name: string;
};

type StockMovementRow = {
  id: number;
  product_id: number;
  movement_date: string;
  movement_type: string;
  qty_in: number;
  qty_out: number;
  ref_type: string | null;
  ref_id: number | null;
  note: string | null;
  created_by: string | null;
  products: { sku: string; name: string } | null;
};

type SaleLineRow = {
  sale_id: number;
  product_id: number;
  unit_price: number;
  sales: { sale_no: string } | null;
};

type PriceHistoryRow = {
  id: number;
  product_id: number;
  old_retail_price: number;
  new_retail_price: number;
  old_wholesale_price: number;
  new_wholesale_price: number;
  old_cost_price: number;
  new_cost_price: number;
  changed_by: string | null;
  changed_at: string;
  products: { sku: string; name: string } | null;
};

type HistoryItem = {
  id: string;
  date: string;
  productSku: string;
  productName: string;
  type: "receive" | "sale" | "void_return" | "refund_return" | "adjustment" | "price_change";
  qtyIn: number;
  qtyOut: number;
  detail: string;
  actor: string;
  ref: string;
};

type Period = "day" | "week" | "month" | "year";
type DateRange = {
  start: Date;
  end: Date;
};

const periodOptions: { value: Period; label: string }[] = [
  { value: "day", label: "รายวัน" },
  { value: "week", label: "สัปดาห์" },
  { value: "month", label: "เดือน" },
  { value: "year", label: "ปี" },
];

const movementTypes = [
  { value: "all", label: "ทุกประเภท" },
  { value: "receive", label: "รับเข้า" },
  { value: "sale", label: "ขายออก" },
  { value: "void_return", label: "คืนจากยกเลิก" },
  { value: "refund_return", label: "คืนจากคืนเงิน" },
  { value: "adjustment", label: "ปรับยอดสต๊อก" },
  { value: "price_change", label: "แก้ไขราคา" },
];

function bangkokDateParts(date: Date) {
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

function bangkokMidnightUtc(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day, -7));
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function formatDateInput(date: Date) {
  const parts = bangkokDateParts(date);
  return [
    String(parts.year).padStart(4, "0"),
    String(parts.month).padStart(2, "0"),
    String(parts.day).padStart(2, "0"),
  ].join("-");
}

function parseDateInput(value?: string) {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const [, year, month, day] = match;
  return bangkokMidnightUtc(Number(year), Number(month), Number(day));
}

function periodRange(period: Period) {
  const today = bangkokDateParts(new Date());
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

function customRange(from?: string, to?: string): DateRange | null {
  const start = parseDateInput(from);
  const rawEnd = parseDateInput(to);

  if (!start && !rawEnd) return null;

  if (start && rawEnd) {
    if (rawEnd < start) return { start: rawEnd, end: addDays(start, 1) };
    return { start, end: addDays(rawEnd, 1) };
  }

  if (start) return { start, end: addDays(start, 1) };
  if (rawEnd) return { start: rawEnd, end: addDays(rawEnd, 1) };

  return null;
}

function formatRangeLabel(start: Date, end: Date, period?: Period) {
  const dateFormat = new Intl.DateTimeFormat("th-TH", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  if (period === "day") return dateFormat.format(start);
  if (period === "month") {
    return new Intl.DateTimeFormat("th-TH", {
      timeZone: "Asia/Bangkok",
      month: "long",
      year: "numeric",
    }).format(start);
  }
  if (period === "year") {
    return new Intl.DateTimeFormat("th-TH", {
      timeZone: "Asia/Bangkok",
      year: "numeric",
    }).format(start);
  }

  return `${dateFormat.format(start)} - ${dateFormat.format(addDays(end, -1))}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function exportHref(filters: { product_id?: string; type?: string; from?: string; to?: string; period?: string }) {
  const params = new URLSearchParams();
  if (filters.period) params.set("period", filters.period);
  if (filters.product_id) params.set("product_id", filters.product_id);
  if (filters.type) params.set("type", filters.type);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);

  const query = params.toString();
  return query ? `/product-history/export?${query}` : "/product-history/export";
}

export default async function ProductHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{
    product_id?: string;
    type?: string;
    from?: string;
    to?: string;
    period?: string;
  }>;
}) {
  const filters = await searchParams;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login");
  }

  const selectedProductId = Number(filters.product_id);
  const hasProductFilter = Number.isInteger(selectedProductId) && selectedProductId > 0;
  const selectedType = movementTypes.some((type) => type.value === filters.type) ? filters.type ?? "all" : "all";
  const selectedPeriod = periodOptions.some((option) => option.value === filters.period)
    ? (filters.period as Period)
    : "day";
  const selectedCustomRange = customRange(filters.from, filters.to);
  const range = selectedCustomRange ?? periodRange(selectedPeriod);
  const rangeLabel = formatRangeLabel(range.start, range.end, selectedCustomRange ? undefined : selectedPeriod);
  const fromDate = selectedCustomRange ? formatDateInput(range.start) : (filters.from ?? "");
  const toDate = selectedCustomRange ? formatDateInput(addDays(range.end, -1)) : (filters.to ?? "");

  const periodHref = (period: Period) => {
    const params = new URLSearchParams({ period });

    if (hasProductFilter) params.set("product_id", String(selectedProductId));
    if (selectedType !== "all") params.set("type", selectedType);

    return `/product-history?${params.toString()}`;
  };

  let stockQuery = supabase
    .from("stock_movements")
    .select("id, product_id, movement_date, movement_type, qty_in, qty_out, ref_type, ref_id, note, created_by, products(sku, name)")
    .gte("movement_date", range.start.toISOString())
    .lt("movement_date", range.end.toISOString())
    .order("movement_date", { ascending: false })
    .limit(100);

  let priceQuery = supabase
    .from("product_price_history")
    .select(
      "id, product_id, old_retail_price, new_retail_price, old_wholesale_price, new_wholesale_price, old_cost_price, new_cost_price, changed_by, changed_at, products(sku, name)",
    )
    .gte("changed_at", range.start.toISOString())
    .lt("changed_at", range.end.toISOString())
    .order("changed_at", { ascending: false })
    .limit(100);

  if (hasProductFilter) {
    stockQuery = stockQuery.eq("product_id", selectedProductId);
    priceQuery = priceQuery.eq("product_id", selectedProductId);
  }
  if (selectedType === "receive" || selectedType === "sale") {
    stockQuery = stockQuery.eq("movement_type", selectedType);
  }
  if (selectedType === "void_return" || selectedType === "refund_return") {
    stockQuery = stockQuery.eq("movement_type", "receive").eq("ref_type", "sales");
  }
  const [{ data: productsData }, stockResult, priceResult] = await Promise.all([
    supabase.from("products").select("id, sku, name").eq("is_active", true).order("name"),
    selectedType === "price_change" ? Promise.resolve({ data: [], error: null }) : stockQuery,
    selectedType !== "all" && selectedType !== "price_change" ? Promise.resolve({ data: [], error: null }) : priceQuery,
  ]);

  const products = (productsData ?? []) as ProductOption[];
  const stockError = stockResult.error;
  const priceError = priceResult.error;
  const stockRows = (stockResult.data ?? []) as unknown as StockMovementRow[];
  const saleStockRows = stockRows.filter((item) => item.ref_type === "sales" && item.ref_id);
  const saleIds = [...new Set(saleStockRows.map((item) => Number(item.ref_id)))];
  const saleProductIds = [...new Set(saleStockRows.map((item) => item.product_id))];
  const { data: saleLineData } =
    saleIds.length && saleProductIds.length
      ? await supabase
          .from("sale_items")
          .select("sale_id, product_id, unit_price, sales(sale_no)")
          .in("sale_id", saleIds)
          .in("product_id", saleProductIds)
      : { data: [] };
  const saleLines = buildSaleLineLookup((saleLineData ?? []) as unknown as SaleLineRow[]);

  const stockMovements = stockRows
    .map((item) => mapStockMovement(item, saleLines, userData.user) as HistoryItem)
    .filter((item) => selectedType === "all" || item.type === selectedType);

  const priceChanges = ((priceResult.data ?? []) as unknown as PriceHistoryRow[]).map(
    (item) => mapPriceHistory(item, userData.user) as HistoryItem,
  );

  const historyItems = [...stockMovements, ...priceChanges]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 100);
  const stockInTotal = historyItems.reduce((sum, item) => sum + item.qtyIn, 0);
  const stockOutTotal = historyItems.reduce((sum, item) => sum + item.qtyOut, 0);
  const priceChangeCount = historyItems.filter((item) => item.type === "price_change").length;
  const stockReturnCount = historyItems.filter((item) => item.type === "void_return" || item.type === "refund_return").length;

  return (
    <AppShell>
      <main className="p-4 lg:p-6">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm text-slate-500">เอกสาร / รายงาน</p>
              <h1 className="mt-1 text-2xl font-semibold text-slate-950">ประวัติสินค้า</h1>
            </div>
            <div className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm">
              <History className="h-4 w-4" aria-hidden="true" />
              {historyItems.length.toLocaleString("th-TH")} รายการ
            </div>
          </div>

          <section className="mt-5 overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 p-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-slate-200 bg-white text-slate-600">
                  <CalendarDays className="h-4 w-4" aria-hidden="true" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-950">{rangeLabel}</div>
                  <div className="mt-1 text-xs text-slate-500">แสดงสูงสุด 100 รายการ</div>
                </div>
              </div>
              <div className="grid grid-cols-4 rounded-md border border-slate-300 bg-white p-1">
                {periodOptions.map((option) => {
                  const active = !selectedCustomRange && option.value === selectedPeriod;

                  return (
                    <Link
                      key={option.value}
                      href={periodHref(option.value)}
                      className={`grid h-9 min-w-16 place-items-center rounded px-3 text-sm font-medium ${
                        active ? "bg-slate-950 text-white" : "text-slate-500 hover:bg-slate-50 hover:text-slate-950"
                      }`}
                    >
                      {option.label}
                    </Link>
                  );
                })}
              </div>
            </div>

            <form action="/product-history" className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-[1.6fr_1fr_160px_160px_auto] xl:items-end">
              <input name="period" type="hidden" value={selectedPeriod} />
              <label className="text-xs font-medium text-slate-600">
                สินค้า
                <select
                  name="product_id"
                  defaultValue={hasProductFilter ? selectedProductId : ""}
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950"
                >
                  <option value="">ทุกสินค้า</option>
                  {products.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.sku})
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-medium text-slate-600">
                ประเภท
                <select
                  name="type"
                  defaultValue={selectedType}
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950"
                >
                  {movementTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-medium text-slate-600">
                ตั้งแต่
                <input
                  name="from"
                  type="date"
                  defaultValue={fromDate}
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950"
                />
              </label>
              <label className="text-xs font-medium text-slate-600">
                ถึง
                <input
                  name="to"
                  type="date"
                  defaultValue={toDate}
                  className="mt-1 h-10 w-full rounded-md border border-slate-300 px-3 text-sm text-slate-950"
                />
              </label>
              <div className="flex gap-2 md:col-span-2 xl:col-span-1">
                <button
                  type="submit"
                  className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-medium text-white hover:bg-slate-800 xl:flex-none"
                >
                  <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
                  กรอง
                </button>
                <a
                  href={exportHref({
                    ...filters,
                    period: selectedCustomRange ? undefined : selectedPeriod,
                    from: selectedCustomRange ? fromDate : undefined,
                    to: selectedCustomRange ? toDate : undefined,
                  })}
                  className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-md border border-emerald-300 bg-emerald-50 px-4 text-sm font-medium text-emerald-800 hover:bg-emerald-100 xl:flex-none"
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  CSV
                </a>
                {hasProductFilter || selectedType !== "all" || selectedCustomRange ? (
                  <a
                    href="/product-history"
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
                  >
                    <RotateCcw className="h-4 w-4" aria-hidden="true" />
                    ล้าง
                  </a>
                ) : null}
              </div>
            </form>
          </section>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="จำนวนรายการ" value={`${historyItems.length.toLocaleString("th-TH")} รายการ`} />
            <MetricCard label="รับเข้า" value={`${quantity(stockInTotal)} ชิ้น`} />
            <MetricCard label="ขายออก" value={`${quantity(stockOutTotal)} ชิ้น`} emphasis />
            <MetricCard
              label="แก้ราคา / คืนสต๊อก"
              value={`${priceChangeCount.toLocaleString("th-TH")} / ${stockReturnCount.toLocaleString("th-TH")} รายการ`}
            />
          </div>

          {stockError || priceError ? (
            <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              {priceError ? (
                <div>
                  ยังอ่าน `product_price_history` ไม่ได้ ให้รัน migration{" "}
                  <span className="font-mono">supabase/migrations/202605190001_product_price_history.sql</span>
                </div>
              ) : null}
              {stockError ? <div>{stockError.message}</div> : null}
            </div>
          ) : null}

          <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="min-w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">วันที่</th>
                  <th className="px-4 py-3 text-left font-medium">สินค้า</th>
                  <th className="px-4 py-3 text-left font-medium">ประเภท</th>
                  <th className="px-4 py-3 text-right font-medium">เข้า</th>
                  <th className="px-4 py-3 text-right font-medium">ออก</th>
                  <th className="px-4 py-3 text-left font-medium">รายละเอียด</th>
                  <th className="px-4 py-3 text-left font-medium">อ้างอิง</th>
                  <th className="px-4 py-3 text-left font-medium">ผู้ทำรายการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {historyItems.length ? (
                  historyItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-4 py-3">{formatDate(item.date)}</td>
                      <td className="min-w-64 px-4 py-3">
                        <div className="font-medium text-slate-950">{item.productName}</div>
                        <div className="text-xs text-slate-500">{item.productSku}</div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${movementBadgeClass(item.type)}`}>
                          {movementLabel(item.type)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-emerald-700">
                        {item.qtyIn ? quantity(item.qtyIn) : "-"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right text-sky-700">
                        {item.qtyOut ? quantity(item.qtyOut) : "-"}
                      </td>
                      <td className="min-w-72 px-4 py-3 text-slate-600">{item.detail}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">{item.ref}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">{item.actor}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                      ยังไม่มีประวัติตามเงื่อนไข
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </AppShell>
  );
}

function MetricCard({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return (
    <div className={`rounded-lg border bg-white p-4 ${emphasis ? "border-emerald-200" : "border-slate-200"}`}>
      <div className="text-sm text-slate-500">{label}</div>
      <div className={`mt-2 text-xl font-semibold ${emphasis ? "text-emerald-800" : "text-slate-950"}`}>
        {value}
      </div>
    </div>
  );
}
