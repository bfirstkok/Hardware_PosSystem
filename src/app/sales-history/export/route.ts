import { createClient } from "@/lib/supabase/server";
import { canPerformAction } from "@/lib/permissions";
import { getCurrentStaff } from "@/lib/staff-session";
import {
  buildSalesExportFilters,
  refundStatuses,
  salesToCsv,
  voidStatuses,
} from "@/lib/sales-history-export.mjs";

type SaleItemRow = {
  id: number;
  qty: number;
  unit_price: number;
  line_total: number;
  products: { sku: string; name: string } | null;
};

type PaymentRow = {
  id: number;
  payment_method: string;
  amount: number;
  reference_no: string | null;
};

type SaleRow = {
  id: number;
  sale_no: string;
  sale_date: string;
  subtotal: number;
  discount_amount: number;
  total_amount: number;
  payment_method: string;
  status: string;
  client_invoice_no: string | null;
  offline_created_at: string | null;
  created_by: string | null;
  sale_items: SaleItemRow[];
  payments: PaymentRow[];
};

export const dynamic = "force-dynamic";

const saleSelectBase =
  "id, sale_no, sale_date, subtotal, discount_amount, total_amount, payment_method, status, created_by, sale_items(id, qty, unit_price, line_total, products(sku, name)), payments(id, payment_method, amount, reference_no)";
const saleSelectWithOffline =
  "id, sale_no, sale_date, subtotal, discount_amount, total_amount, payment_method, status, client_invoice_no, offline_created_at, created_by, sale_items(id, qty, unit_price, line_total, products(sku, name)), payments(id, payment_method, amount, reference_no)";

export async function GET(request: Request) {
  const staff = await getCurrentStaff();

  if (!staff) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!canPerformAction(staff.role, "reports.export")) {
    return new Response("Forbidden", { status: 403 });
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const searchParams = new URL(request.url).searchParams;
  const { range, selectedPayment, selectedStatus } = buildSalesExportFilters(searchParams);

  function createSalesQuery(selectColumns: string) {
    let query = supabase
      .from("sales")
      .select(selectColumns)
      .gte("sale_date", range.start.toISOString())
      .lt("sale_date", range.end.toISOString());

    if (selectedPayment !== "all") {
      query = query.eq("payment_method", selectedPayment);
    }

    if (selectedStatus === "completed") {
      query = query.eq("status", "completed");
    } else if (selectedStatus === "void") {
      query = query.in("status", voidStatuses);
    } else if (selectedStatus === "refund") {
      query = query.in("status", refundStatuses);
    }

    return query.order("sale_date", { ascending: false }).limit(1000);
  }

  let { data, error } = await createSalesQuery(saleSelectWithOffline);

  if (
    error &&
    (error.code === "42703" ||
      error.message.includes("client_invoice_no") ||
      error.message.includes("offline_created_at"))
  ) {
    const fallback = await createSalesQuery(saleSelectBase);
    data = fallback.data;
    error = fallback.error;
  }

  if (error) {
    return new Response(error.message, { status: 500 });
  }

  const sales = ((data ?? []) as unknown as Partial<SaleRow>[]).map((sale) => ({
    client_invoice_no: null,
    offline_created_at: null,
    ...sale,
  })) as SaleRow[];
  const csv = salesToCsv(sales, userData.user.id, userData.user.email);
  const date = new Date().toISOString().slice(0, 10);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sales-history-${date}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
