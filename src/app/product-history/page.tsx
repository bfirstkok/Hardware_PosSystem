import { redirect } from "next/navigation";
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
  type: "receive" | "sale" | "adjustment" | "price_change";
  qtyIn: number;
  qtyOut: number;
  detail: string;
  actor: string;
  ref: string;
};

const movementTypes = [
  { value: "all", label: "ทุกประเภท" },
  { value: "receive", label: "รับเข้า" },
  { value: "sale", label: "ขายออก" },
  { value: "adjustment", label: "ปรับยอดสต๊อก" },
  { value: "price_change", label: "แก้ไขราคา" },
];

function dateInput(value?: string) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function exportHref(filters: { product_id?: string; type?: string; from?: string; to?: string }) {
  const params = new URLSearchParams();
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
  const fromDate = dateInput(filters.from);
  const toDate = dateInput(filters.to);
  const fromDateTime = fromDate ? `${fromDate}T00:00:00+07:00` : null;
  const toDateTime = toDate ? `${toDate}T23:59:59+07:00` : null;

  let stockQuery = supabase
    .from("stock_movements")
    .select("id, product_id, movement_date, movement_type, qty_in, qty_out, ref_type, ref_id, note, created_by, products(sku, name)")
    .order("movement_date", { ascending: false })
    .limit(100);

  let priceQuery = supabase
    .from("product_price_history")
    .select(
      "id, product_id, old_retail_price, new_retail_price, old_wholesale_price, new_wholesale_price, old_cost_price, new_cost_price, changed_by, changed_at, products(sku, name)",
    )
    .order("changed_at", { ascending: false })
    .limit(100);

  if (hasProductFilter) {
    stockQuery = stockQuery.eq("product_id", selectedProductId);
    priceQuery = priceQuery.eq("product_id", selectedProductId);
  }
  if (selectedType === "receive" || selectedType === "sale") {
    stockQuery = stockQuery.eq("movement_type", selectedType);
  }
  if (fromDateTime) {
    stockQuery = stockQuery.gte("movement_date", fromDateTime);
    priceQuery = priceQuery.gte("changed_at", fromDateTime);
  }
  if (toDateTime) {
    stockQuery = stockQuery.lte("movement_date", toDateTime);
    priceQuery = priceQuery.lte("changed_at", toDateTime);
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
  const saleStockRows = stockRows.filter((item) => item.movement_type === "sale" && item.ref_id);
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

  return (
    <AppShell>
      <main className="p-4 lg:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500">เอกสาร / รายงาน</p>
            <h1 className="mt-1 text-2xl font-semibold">ประวัติสินค้า</h1>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={exportHref(filters)}
              className="grid h-10 place-items-center rounded-md border border-slate-300 bg-white px-4 text-sm font-medium hover:bg-slate-50"
            >
              ดาวน์โหลด CSV
            </a>
            <div className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm">
              {historyItems.length.toLocaleString("th-TH")} รายการ
            </div>
          </div>
        </div>

        <form className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1fr_180px_160px_160px_auto]">
            <label className="text-sm font-medium">
              สินค้า
              <select name="product_id" defaultValue={hasProductFilter ? selectedProductId : ""} className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3">
                <option value="">ทุกสินค้า</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} ({product.sku})
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium">
              ประเภท
              <select name="type" defaultValue={selectedType} className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3">
                {movementTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium">
              ตั้งแต่
              <input name="from" type="date" defaultValue={fromDate} className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3" />
            </label>
            <label className="text-sm font-medium">
              ถึง
              <input name="to" type="date" defaultValue={toDate} className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3" />
            </label>
            <div className="flex items-end gap-2">
              <button type="submit" className="h-10 rounded-md bg-slate-950 px-4 text-sm font-medium text-white hover:bg-slate-800">
                ค้นหา
              </button>
              <a href="/product-history" className="grid h-10 place-items-center rounded-md border border-slate-300 px-4 text-sm font-medium hover:bg-slate-50">
                ล้าง
              </a>
            </div>
          </div>
        </form>

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
      </main>
    </AppShell>
  );
}
