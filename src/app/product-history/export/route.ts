import {
  buildSaleLineLookup,
  mapPriceHistory,
  mapStockMovement,
  productHistoryToCsv,
} from "@/lib/product-history.mjs";
import { createClient } from "@/lib/supabase/server";

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

export const dynamic = "force-dynamic";

const movementTypes = ["all", "receive", "sale", "adjustment", "price_change"];

function dateInput(value: string | null) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
}

function selectedType(value: string | null) {
  return movementTypes.includes(value ?? "") ? value ?? "all" : "all";
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const searchParams = new URL(request.url).searchParams;
  const productId = Number(searchParams.get("product_id"));
  const hasProductFilter = Number.isInteger(productId) && productId > 0;
  const type = selectedType(searchParams.get("type"));
  const fromDate = dateInput(searchParams.get("from"));
  const toDate = dateInput(searchParams.get("to"));
  const fromDateTime = fromDate ? `${fromDate}T00:00:00+07:00` : null;
  const toDateTime = toDate ? `${toDate}T23:59:59+07:00` : null;

  let stockQuery = supabase
    .from("stock_movements")
    .select("id, product_id, movement_date, movement_type, qty_in, qty_out, ref_type, ref_id, note, created_by, products(sku, name)")
    .order("movement_date", { ascending: false })
    .limit(5000);

  let priceQuery = supabase
    .from("product_price_history")
    .select(
      "id, product_id, old_retail_price, new_retail_price, old_wholesale_price, new_wholesale_price, old_cost_price, new_cost_price, changed_by, changed_at, products(sku, name)",
    )
    .order("changed_at", { ascending: false })
    .limit(5000);

  if (hasProductFilter) {
    stockQuery = stockQuery.eq("product_id", productId);
    priceQuery = priceQuery.eq("product_id", productId);
  }
  if (type === "receive" || type === "sale") {
    stockQuery = stockQuery.eq("movement_type", type);
  }
  if (fromDateTime) {
    stockQuery = stockQuery.gte("movement_date", fromDateTime);
    priceQuery = priceQuery.gte("changed_at", fromDateTime);
  }
  if (toDateTime) {
    stockQuery = stockQuery.lte("movement_date", toDateTime);
    priceQuery = priceQuery.lte("changed_at", toDateTime);
  }

  const [stockResult, priceResult] = await Promise.all([
    type === "price_change" ? Promise.resolve({ data: [], error: null }) : stockQuery,
    type !== "all" && type !== "price_change" ? Promise.resolve({ data: [], error: null }) : priceQuery,
  ]);

  if (stockResult.error) {
    return new Response(stockResult.error.message, { status: 500 });
  }
  if (priceResult.error) {
    return new Response(priceResult.error.message, { status: 500 });
  }

  const stockRows = (stockResult.data ?? []) as unknown as StockMovementRow[];
  const saleStockRows = stockRows.filter((item) => item.movement_type === "sale" && item.ref_id);
  const saleIds = [...new Set(saleStockRows.map((item) => Number(item.ref_id)))];
  const saleProductIds = [...new Set(saleStockRows.map((item) => item.product_id))];
  const { data: saleLineData, error: saleLineError } =
    saleIds.length && saleProductIds.length
      ? await supabase
          .from("sale_items")
          .select("sale_id, product_id, unit_price, sales(sale_no)")
          .in("sale_id", saleIds)
          .in("product_id", saleProductIds)
      : { data: [], error: null };

  if (saleLineError) {
    return new Response(saleLineError.message, { status: 500 });
  }

  const saleLines = buildSaleLineLookup((saleLineData ?? []) as unknown as SaleLineRow[]);
  const currentUser = { id: userData.user.id, email: userData.user.email };
  const stockMovements = stockRows
    .map((item) => mapStockMovement(item, saleLines, currentUser))
    .filter((item) => type === "all" || item.type === type);
  const priceChanges = ((priceResult.data ?? []) as unknown as PriceHistoryRow[]).map((item) =>
    mapPriceHistory(item, currentUser),
  );
  const historyItems = [...stockMovements, ...priceChanges]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5000);
  const csv = productHistoryToCsv(historyItems);
  const date = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="product-history-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
