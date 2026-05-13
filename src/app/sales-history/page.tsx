import { redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";

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
  created_by: string | null;
  sale_items: SaleItemRow[];
  payments: PaymentRow[];
};

type Period = "day" | "week" | "month" | "year";
type PaymentFilter = "all" | "cash" | "transfer" | "qr" | "card";
type StatusFilter = "all" | "completed" | "void" | "refund";
type DateRange = {
  start: Date;
  end: Date;
};

const paymentLabels: Record<string, string> = {
  cash: "เงินสด",
  transfer: "โอน",
  qr: "QR",
  card: "บัตรเครดิต",
};

const statusLabels: Record<string, string> = {
  completed: "สำเร็จ",
  void: "ยกเลิก",
  voided: "ยกเลิก",
  canceled: "ยกเลิก",
  cancelled: "ยกเลิก",
  refund: "คืนเงิน",
  refunded: "คืนเงิน",
};

const periodOptions: { value: Period; label: string }[] = [
  { value: "day", label: "รายวัน" },
  { value: "week", label: "สัปดาห์" },
  { value: "month", label: "เดือน" },
  { value: "year", label: "ปี" },
];

const paymentFilterOptions: { value: PaymentFilter; label: string }[] = [
  { value: "all", label: "ทุกช่องทาง" },
  { value: "cash", label: "เงินสด" },
  { value: "transfer", label: "โอน" },
  { value: "qr", label: "QR" },
  { value: "card", label: "บัตรเครดิต" },
];

const statusFilterOptions: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "ทุกสถานะ" },
  { value: "completed", label: "สำเร็จ" },
  { value: "void", label: "ยกเลิก" },
  { value: "refund", label: "คืนเงิน" },
];

const voidStatuses = ["void", "voided", "canceled", "cancelled"];
const refundStatuses = ["refund", "refunded"];

function money(value: number) {
  return Number(value).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function quantity(value: number) {
  return Number(value).toLocaleString("th-TH", {
    maximumFractionDigits: 2,
  });
}

function paymentLabel(value: string) {
  return paymentLabels[value] ?? value;
}

function statusLabel(value: string) {
  return statusLabels[value] ?? value;
}

function isPaymentFilter(value?: string): value is PaymentFilter {
  return paymentFilterOptions.some((option) => option.value === value);
}

function isStatusFilter(value?: string): value is StatusFilter {
  return statusFilterOptions.some((option) => option.value === value);
}

function saleMatchesStatus(sale: SaleRow, status: StatusFilter) {
  if (status === "completed") return sale.status === "completed";
  if (status === "void") return voidStatuses.includes(sale.status);
  if (status === "refund") return refundStatuses.includes(sale.status);
  return true;
}

function cashierLabel(createdBy: string | null, currentUserId: string, currentEmail?: string) {
  if (!createdBy) return "-";
  if (createdBy === currentUserId) return currentEmail ?? "บัญชีปัจจุบัน";
  return `User ${createdBy.slice(0, 8)}`;
}

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

export default async function SalesHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{
    period?: string;
    from?: string;
    to?: string;
    payment?: string;
    status?: string;
  }>;
}) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login");
  }

  const params = await searchParams;
  const selectedPeriod = periodOptions.some((option) => option.value === params.period)
    ? (params.period as Period)
    : "day";
  const selectedPayment = isPaymentFilter(params.payment) ? params.payment : "all";
  const selectedStatus = isStatusFilter(params.status) ? params.status : "all";
  const selectedCustomRange = customRange(params.from, params.to);
  const range = selectedCustomRange ?? periodRange(selectedPeriod);
  const rangeLabel = formatRangeLabel(
    range.start,
    range.end,
    selectedCustomRange ? undefined : selectedPeriod,
  );
  const fromValue = selectedCustomRange ? formatDateInput(range.start) : (params.from ?? "");
  const toValue = selectedCustomRange ? formatDateInput(addDays(range.end, -1)) : (params.to ?? "");

  const periodHref = (period: Period) => {
    const nextParams = new URLSearchParams({ period });

    if (selectedPayment !== "all") nextParams.set("payment", selectedPayment);
    if (selectedStatus !== "all") nextParams.set("status", selectedStatus);

    return `/sales-history?${nextParams.toString()}`;
  };

  let salesQuery = supabase
    .from("sales")
    .select(
      "id, sale_no, sale_date, subtotal, discount_amount, total_amount, payment_method, status, created_by, sale_items(id, qty, unit_price, line_total, products(sku, name)), payments(id, payment_method, amount, reference_no)",
    )
    .gte("sale_date", range.start.toISOString())
    .lt("sale_date", range.end.toISOString());

  if (selectedPayment !== "all") {
    salesQuery = salesQuery.eq("payment_method", selectedPayment);
  }

  if (selectedStatus === "completed") {
    salesQuery = salesQuery.eq("status", "completed");
  } else if (selectedStatus === "void") {
    salesQuery = salesQuery.in("status", voidStatuses);
  } else if (selectedStatus === "refund") {
    salesQuery = salesQuery.in("status", refundStatuses);
  }

  const { data, error } = await salesQuery
    .order("sale_date", { ascending: false })
    .limit(200);

  const sales = (data ?? []) as unknown as SaleRow[];
  const completedSales = sales.filter((sale) => sale.status === "completed");
  const totalRevenue = completedSales.reduce((sum, sale) => sum + Number(sale.total_amount), 0);
  const totalItems = completedSales.reduce(
    (sum, sale) => sum + sale.sale_items.reduce((itemSum, item) => itemSum + Number(item.qty), 0),
    0,
  );
  const voidSaleCount = sales.filter((sale) => saleMatchesStatus(sale, "void")).length;
  const refundSaleCount = sales.filter((sale) => saleMatchesStatus(sale, "refund")).length;

  return (
    <AppShell>
      <main className="p-4 lg:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500">เอกสาร / รายงาน</p>
            <h1 className="mt-1 text-2xl font-semibold">ประวัติขาย</h1>
          </div>
          <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
            {sales.length.toLocaleString("th-TH")} บิล
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3">
          <div>
            <div className="text-sm font-medium text-slate-950">{rangeLabel}</div>
            <div className="text-xs text-slate-500">
              {selectedCustomRange ? "กรองตามวันที่ที่เลือก" : "เลือกช่วงเร็วหรือกำหนดวันที่เอง"} ·
              แสดงสูงสุด 200 บิล
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <form action="/sales-history" className="flex flex-wrap items-end gap-2">
              <input name="period" type="hidden" value={selectedPeriod} />
              <label className="text-xs font-medium text-slate-600">
                จากวันที่
                <input
                  name="from"
                  type="date"
                  defaultValue={fromValue}
                  className="mt-1 h-9 rounded-md border border-slate-300 px-3 text-sm text-slate-950"
                />
              </label>
              <label className="text-xs font-medium text-slate-600">
                ถึงวันที่
                <input
                  name="to"
                  type="date"
                  defaultValue={toValue}
                  className="mt-1 h-9 rounded-md border border-slate-300 px-3 text-sm text-slate-950"
                />
              </label>
              <label className="text-xs font-medium text-slate-600">
                ช่องทางชำระเงิน
                <select
                  name="payment"
                  defaultValue={selectedPayment}
                  className="mt-1 h-9 rounded-md border border-slate-300 px-3 text-sm text-slate-950"
                >
                  {paymentFilterOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-medium text-slate-600">
                สถานะบิล
                <select
                  name="status"
                  defaultValue={selectedStatus}
                  className="mt-1 h-9 rounded-md border border-slate-300 px-3 text-sm text-slate-950"
                >
                  {statusFilterOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="submit"
                className="h-9 rounded-md bg-slate-950 px-3 text-sm font-medium text-white hover:bg-slate-800"
              >
                กรอง
              </button>
              {selectedCustomRange ? (
                <Link
                  href={
                    selectedPayment === "all" && selectedStatus === "all"
                      ? "/sales-history"
                      : `/sales-history?${new URLSearchParams({
                          ...(selectedPayment !== "all" ? { payment: selectedPayment } : {}),
                          ...(selectedStatus !== "all" ? { status: selectedStatus } : {}),
                        }).toString()}`
                  }
                  className="grid h-9 place-items-center rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
                >
                  ล้าง
                </Link>
              ) : null}
            </form>
            <div className="grid grid-cols-4 rounded-md border border-slate-300 bg-slate-50 p-1">
              {periodOptions.map((option) => {
                const active = !selectedCustomRange && option.value === selectedPeriod;

                return (
                  <Link
                    key={option.value}
                    href={periodHref(option.value)}
                    className={`grid h-9 min-w-16 place-items-center rounded px-3 text-sm font-medium ${
                      active ? "bg-white text-slate-950 shadow-sm" : "text-slate-500 hover:text-slate-950"
                    }`}
                  >
                    {option.label}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {error ? (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error.message}
          </div>
        ) : null}

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <MetricCard label="จำนวนบิล" value={`${sales.length.toLocaleString("th-TH")} บิล`} />
          <MetricCard label="ยอดขายสุทธิ" value={`${money(totalRevenue)} บาท`} />
          <MetricCard
            label="สินค้า / ยกเลิก / คืนเงิน"
            value={`${quantity(totalItems)} ชิ้น · ${voidSaleCount.toLocaleString("th-TH")} / ${refundSaleCount.toLocaleString("th-TH")} บิล`}
          />
        </div>

        <section className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="grid gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3 text-sm font-medium text-slate-600 lg:grid-cols-[160px_1fr_140px_160px_160px]">
            <div>วันที่</div>
            <div>เลขที่บิล</div>
            <div>ชำระเงิน</div>
            <div>แคชเชียร์</div>
            <div className="text-right">ยอดสุทธิ</div>
          </div>

          <div className="divide-y divide-slate-100">
            {sales.length ? (
              sales.map((sale) => (
                <details key={sale.id} className="group">
                  <summary className="grid cursor-pointer list-none gap-3 px-5 py-4 text-sm hover:bg-slate-50 lg:grid-cols-[160px_1fr_140px_160px_160px]">
                    <div className="text-slate-600">
                      {new Date(sale.sale_date).toLocaleString("th-TH")}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-950">{sale.sale_no}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {sale.sale_items.length.toLocaleString("th-TH")} รายการ
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div>{paymentLabel(sale.payment_method)}</div>
                      <StatusBadge status={sale.status} />
                    </div>
                    <div className="truncate">
                      {cashierLabel(sale.created_by, userData.user.id, userData.user.email)}
                    </div>
                    <div className="font-semibold text-slate-950 lg:text-right">
                      {money(sale.total_amount)} บาท
                    </div>
                  </summary>

                  <div className="bg-slate-50 px-5 pb-5">
                    <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
                      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                        <div className="grid grid-cols-[1fr_90px_110px_120px] gap-3 border-b border-slate-200 bg-white px-4 py-3 text-xs font-medium text-slate-500">
                          <div>สินค้า</div>
                          <div className="text-right">จำนวน</div>
                          <div className="text-right">ราคา</div>
                          <div className="text-right">รวม</div>
                        </div>
                        <div className="divide-y divide-slate-100">
                          {sale.sale_items.map((item) => (
                            <div
                              key={item.id}
                              className="grid grid-cols-[1fr_90px_110px_120px] gap-3 px-4 py-3 text-sm"
                            >
                              <div>
                                <div className="font-medium">{item.products?.name ?? "-"}</div>
                                <div className="mt-1 text-xs text-slate-500">
                                  {item.products?.sku ?? "-"}
                                </div>
                              </div>
                              <div className="text-right">{quantity(item.qty)}</div>
                              <div className="text-right">{money(item.unit_price)}</div>
                              <div className="text-right font-medium">{money(item.line_total)}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
                        <div className="font-semibold">สรุปบิล</div>
                        <div className="mt-4 space-y-2">
                          <SummaryRow label="ยอดก่อนลด" value={`${money(sale.subtotal)} บาท`} />
                          <SummaryRow label="ส่วนลด" value={`${money(sale.discount_amount)} บาท`} />
                          <SummaryRow label="ยอดสุทธิ" value={`${money(sale.total_amount)} บาท`} strong />
                        </div>
                        <div className="mt-4 border-t border-slate-200 pt-4">
                          <div className="text-xs font-medium text-slate-500">Payment</div>
                          {sale.payments.length ? (
                            <div className="mt-2 space-y-2">
                              {sale.payments.map((payment) => (
                                <div key={payment.id} className="rounded-md bg-slate-50 p-3">
                                  <div className="flex justify-between gap-3">
                                    <span>{paymentLabel(payment.payment_method)}</span>
                                    <span className="font-medium">{money(payment.amount)} บาท</span>
                                  </div>
                                  {payment.reference_no ? (
                                    <div className="mt-1 break-words text-xs text-slate-500">
                                      {payment.reference_no}
                                    </div>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="mt-2 text-slate-500">ไม่มีข้อมูลชำระเงิน</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </details>
              ))
            ) : (
              <p className="px-5 py-8 text-center text-sm text-slate-500">ยังไม่มีประวัติขาย</p>
            )}
          </div>
        </section>
      </main>
    </AppShell>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-semibold">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const tone = status === "completed" ? "emerald" : refundStatuses.includes(status) ? "amber" : "rose";
  const className =
    tone === "emerald"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : tone === "amber"
        ? "bg-amber-50 text-amber-700 ring-amber-200"
        : "bg-rose-50 text-rose-700 ring-rose-200";

  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${className}`}>
      {statusLabel(status)}
    </span>
  );
}

function SummaryRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between gap-3 ${strong ? "font-semibold" : ""}`}>
      <span className="text-slate-500">{label}</span>
      <span>{value}</span>
    </div>
  );
}
