import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ArrowDownCircle, ArrowUpCircle, BadgeCheck, Gift, History, Search, Settings2, UsersRound } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import {
  dateTimeLabel,
  isMissingCrmTableError,
  money,
  pointTransactionLabels,
  type PointTransactionType,
} from "@/lib/crm";
import { requireRouteAccess } from "@/lib/staff-session";
import { createClient } from "@/lib/supabase/server";

type CustomerOption = {
  id: number;
  member_code: string;
  full_name: string;
  phone: string | null;
  points_balance: number;
  member_status: string;
  is_active: boolean;
};

type PointTransactionRow = {
  id: number;
  customer_id: number;
  transaction_type: PointTransactionType;
  points: number;
  amount: number;
  reference_no: string | null;
  note: string | null;
  created_at: string;
  customers: { full_name: string; member_code: string } | { full_name: string; member_code: string }[] | null;
};

type Notice = {
  error?: string;
  saved?: string;
  q?: string;
};

function pointsError(message: string): never {
  redirect(`/points?error=${encodeURIComponent(message)}`);
}

function idField(formData: FormData, key = "customer_id") {
  const id = Number(formData.get(key));
  if (!Number.isInteger(id) || id <= 0) pointsError("ลูกค้าไม่ถูกต้อง");
  return id;
}

function transactionTypeField(formData: FormData): PointTransactionType {
  const value = formData.get("transaction_type")?.toString();
  if (value === "earn" || value === "redeem" || value === "adjust") return value;
  pointsError("ประเภทรายการแต้มไม่ถูกต้อง");
}

function positiveNumberField(formData: FormData, key: string, label: string) {
  const value = Number(formData.get(key) ?? 0);
  if (!Number.isFinite(value) || value <= 0 || value > 99999999) pointsError(`${label}ไม่ถูกต้อง`);
  return value;
}

function optionalTextField(formData: FormData, key: string, label: string, maxLength: number) {
  const value = formData.get(key)?.toString().trim() ?? "";
  if (!value) return null;
  if (value.length > maxLength) pointsError(`${label}ยาวเกิน ${maxLength} ตัวอักษร`);
  return value;
}

async function adjustPoints(formData: FormData) {
  "use server";

  const staff = await requireRouteAccess("/points");
  const supabase = await createClient();
  const customerId = idField(formData);
  const transactionType = transactionTypeField(formData);
  const rawPoints = Math.floor(positiveNumberField(formData, "points", "แต้ม"));
  const signedPoints = transactionType === "redeem" ? -rawPoints : rawPoints;
  const amount = Number(formData.get("amount") ?? 0);

  if (!Number.isFinite(amount) || amount < 0 || amount > 99999999) pointsError("มูลค่าไม่ถูกต้อง");

  const { data: customer, error: customerError } = await supabase
    .from("customers")
    .select("id, full_name, points_balance, is_active, member_status")
    .eq("id", customerId)
    .maybeSingle();

  if (customerError || !customer) pointsError("ไม่พบลูกค้า");
  if (!customer.is_active || customer.member_status !== "active") pointsError("ลูกค้านี้ยังไม่ใช่สมาชิกใช้งาน");

  const nextBalance = Number(customer.points_balance ?? 0) + signedPoints;
  if (nextBalance < 0) pointsError("แต้มไม่พอสำหรับแลก");

  const { error: updateError } = await supabase
    .from("customers")
    .update({ points_balance: nextBalance })
    .eq("id", customerId);

  if (updateError) pointsError("ปรับแต้มไม่สำเร็จ");

  const { error: insertError } = await supabase.from("customer_point_transactions").insert({
    customer_id: customerId,
    transaction_type: transactionType,
    points: signedPoints,
    amount,
    reference_no: optionalTextField(formData, "reference_no", "เลขอ้างอิง", 80),
    note: optionalTextField(formData, "note", "หมายเหตุ", 300),
    created_by: staff.user_id,
  });

  if (insertError) pointsError("บันทึกประวัติแต้มไม่สำเร็จ");

  revalidatePath("/points");
  revalidatePath("/customers");
  redirect("/points?saved=1");
}

function customerName(row: PointTransactionRow) {
  const customer = Array.isArray(row.customers) ? row.customers[0] : row.customers;
  return customer ? `${customer.full_name} (${customer.member_code})` : `ลูกค้า #${row.customer_id}`;
}

function signedPointLabel(points: number) {
  return `${points > 0 ? "+" : ""}${points.toLocaleString("th-TH")}`;
}

function MetricCard({ icon: Icon, label, value }: { icon: typeof Gift; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Icon size={17} />
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-slate-950">{value}</div>
    </div>
  );
}

export default async function PointsPage({
  searchParams,
}: {
  searchParams: Promise<Notice>;
}) {
  const notice = await searchParams;
  const staff = await requireRouteAccess("/points");
  const supabase = await createClient();
  const q = (notice.q ?? "").trim().toLowerCase();

  const customersResult = await supabase
    .from("customers")
    .select("id, member_code, full_name, phone, points_balance, member_status, is_active")
    .order("full_name")
    .limit(300);
  const transactionsResult = await supabase
    .from("customer_point_transactions")
    .select("id, customer_id, transaction_type, points, amount, reference_no, note, created_at, customers(full_name, member_code)")
    .order("created_at", { ascending: false })
    .limit(80);

  const missingTable = isMissingCrmTableError(customersResult.error) || isMissingCrmTableError(transactionsResult.error);
  const customers = ((customersResult.data ?? []) as CustomerOption[]).filter((item) => {
    if (!q) return true;
    return [item.member_code, item.full_name, item.phone]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(q));
  });
  const activeCustomers = customers.filter((item) => item.is_active && item.member_status === "active");
  const transactions = (transactionsResult.data ?? []) as PointTransactionRow[];
  const totalPoints = customers.reduce((sum, item) => sum + Number(item.points_balance ?? 0), 0);
  const redeemedPoints = transactions
    .filter((item) => item.points < 0)
    .reduce((sum, item) => sum + Math.abs(Number(item.points ?? 0)), 0);

  return (
    <AppShell currentStaff={staff}>
      <main className="p-4 lg:p-6">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm text-slate-500">CRM</p>
              <h1 className="mt-1 text-2xl font-semibold">แลกสะสมแต้ม</h1>
            </div>
            <div className="flex gap-2">
              <Link
                href="/customers"
                className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-medium hover:bg-slate-50"
              >
                <UsersRound size={17} />
                ลูกค้า
              </Link>
              <Link
                href="/points-settings"
                className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-900 px-3 text-sm font-medium text-white hover:bg-slate-800"
              >
                <Settings2 size={17} />
                ตั้งค่าแต้ม
              </Link>
            </div>
          </div>

          {notice.error ? (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {notice.error}
            </div>
          ) : null}
          {notice.saved ? (
            <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              บันทึกแต้มแล้ว
            </div>
          ) : null}
          {missingTable ? (
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              ยังไม่พบตาราง CRM ให้รัน `supabase/migrations/202605260001_crm_customers_points.sql` ก่อน
            </div>
          ) : null}

          <section className="mt-6 grid gap-3 md:grid-cols-3">
            <MetricCard icon={BadgeCheck} label="สมาชิกใช้งาน" value={activeCustomers.length.toLocaleString("th-TH")} />
            <MetricCard icon={Gift} label="แต้มคงเหลือรวม" value={totalPoints.toLocaleString("th-TH")} />
            <MetricCard icon={ArrowDownCircle} label="แต้มที่แลกแล้วล่าสุด" value={redeemedPoints.toLocaleString("th-TH")} />
          </section>

          <section className="mt-6 grid gap-6 lg:grid-cols-[420px_1fr]">
            <form action={adjustPoints} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-center gap-2">
                <Gift size={18} className="text-slate-500" />
                <h2 className="font-semibold">ทำรายการแต้ม</h2>
              </div>
              <div className="mt-4 grid gap-3">
                <label className="text-sm font-medium">
                  ลูกค้า
                  <select
                    name="customer_id"
                    required
                    className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-slate-700"
                  >
                    <option value="">เลือกลูกค้า</option>
                    {activeCustomers.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.full_name} / {item.member_code} / {item.points_balance.toLocaleString("th-TH")} แต้ม
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-medium">
                  รายการ
                  <select
                    name="transaction_type"
                    defaultValue="earn"
                    className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-slate-700"
                  >
                    {Object.entries(pointTransactionLabels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="text-sm font-medium">
                    แต้ม
                    <input
                      name="points"
                      type="number"
                      min="1"
                      step="1"
                      required
                      className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-slate-700"
                    />
                  </label>
                  <label className="text-sm font-medium">
                    มูลค่า/ยอดขาย
                    <input
                      name="amount"
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={0}
                      className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-slate-700"
                    />
                  </label>
                </div>
                <label className="text-sm font-medium">
                  เลขอ้างอิง
                  <input
                    name="reference_no"
                    maxLength={80}
                    placeholder="เช่น SALE-..."
                    className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-slate-700"
                  />
                </label>
                <label className="text-sm font-medium">
                  หมายเหตุ
                  <textarea
                    name="note"
                    rows={3}
                    maxLength={300}
                    className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-700"
                  />
                </label>
              </div>
              <button
                type="submit"
                className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
              >
                <ArrowUpCircle size={17} />
                บันทึกรายการแต้ม
              </button>
            </form>

            <section className="rounded-lg border border-slate-200 bg-white">
              <div className="border-b border-slate-200 p-4">
                <form className="relative">
                  <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    name="q"
                    defaultValue={notice.q ?? ""}
                    placeholder="ค้นสมาชิกเพื่อทำรายการ"
                    className="h-10 w-full rounded-md border border-slate-300 pl-9 pr-3 text-sm outline-none focus:border-slate-700"
                  />
                </form>
              </div>
              <div className="max-h-[520px] overflow-y-auto">
                {customers.length ? (
                  <div className="divide-y divide-slate-100">
                    {customers.slice(0, 80).map((item) => (
                      <div key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
                        <div>
                          <div className="font-medium text-slate-950">{item.full_name}</div>
                          <div className="text-xs text-slate-500">
                            {item.member_code} {item.phone ? `/ ${item.phone}` : ""}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold">{item.points_balance.toLocaleString("th-TH")}</div>
                          <div className="text-xs text-slate-500">แต้ม</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-5 py-10 text-center text-sm text-slate-500">
                    ยังไม่มีสมาชิกใช้งาน ให้เพิ่มที่หน้า ลูกค้า ก่อน
                  </div>
                )}
              </div>
            </section>
          </section>

          <section className="mt-6 rounded-lg border border-slate-200 bg-white">
            <div className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
              <History size={17} className="text-slate-500" />
              <h2 className="font-semibold">ประวัติแต้มล่าสุด</h2>
            </div>
            {transactions.length ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">เวลา</th>
                      <th className="px-4 py-3 text-left font-medium">ลูกค้า</th>
                      <th className="px-4 py-3 text-left font-medium">รายการ</th>
                      <th className="px-4 py-3 text-right font-medium">แต้ม</th>
                      <th className="px-4 py-3 text-right font-medium">มูลค่า</th>
                      <th className="px-4 py-3 text-left font-medium">อ้างอิง</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {transactions.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="whitespace-nowrap px-4 py-3">{dateTimeLabel(item.created_at)}</td>
                        <td className="min-w-64 px-4 py-3 font-medium">{customerName(item)}</td>
                        <td className="whitespace-nowrap px-4 py-3">{pointTransactionLabels[item.transaction_type]}</td>
                        <td
                          className={`whitespace-nowrap px-4 py-3 text-right font-semibold ${
                            item.points < 0 ? "text-red-700" : "text-emerald-700"
                          }`}
                        >
                          {signedPointLabel(item.points)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right">{money(item.amount)}</td>
                        <td className="min-w-44 px-4 py-3">
                          <div>{item.reference_no ?? "-"}</div>
                          {item.note ? <div className="text-xs text-slate-500">{item.note}</div> : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-5 py-10 text-center text-sm text-slate-500">
                ยังไม่มีประวัติแต้ม
              </div>
            )}
          </section>
        </div>
      </main>
    </AppShell>
  );
}
