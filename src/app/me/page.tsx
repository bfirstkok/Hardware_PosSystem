import { KeyRound, ReceiptText, UserRound } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { requireRouteAccess } from "@/lib/staff-session";
import { createClient } from "@/lib/supabase/server";

export default async function MePage() {
  const staff = await requireRouteAccess("/me");
  const supabase = await createClient();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);

  const { data: todaySales } = await supabase
    .from("sales")
    .select("id, sale_no, total_amount, payment_method, sale_date")
    .eq("created_by", staff.user_id)
    .gte("sale_date", startOfDay.toISOString())
    .lt("sale_date", endOfDay.toISOString())
    .order("sale_date", { ascending: false })
    .limit(10);
  const totalSales = (todaySales ?? []).reduce((sum, sale) => sum + Number(sale.total_amount ?? 0), 0);

  return (
    <AppShell currentStaff={staff}>
      <main className="p-4 lg:p-6">
        <div>
          <p className="text-sm text-slate-500">โปรไฟล์</p>
          <h1 className="mt-1 text-2xl font-semibold">ข้อมูลของฉัน</h1>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_1.2fr]">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="grid size-12 place-items-center rounded-md bg-slate-900 text-white">
                <UserRound size={24} />
              </div>
              <div>
                <h2 className="font-semibold">{staff.display_name}</h2>
                <p className="text-sm uppercase text-slate-500">{staff.role}</p>
              </div>
            </div>

            <dl className="mt-5 grid gap-3 text-sm">
              {[
                ["รหัสพนักงาน", staff.employee_code],
                ["ตำแหน่ง", staff.job_title ?? "-"],
                ["สาขา", staff.branch_name ?? "สาขาหลัก"],
                ["สถานะบัญชี", staff.account_status],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2">
                  <dt className="text-slate-500">{label}</dt>
                  <dd className="font-medium">{value}</dd>
                </div>
              ))}
            </dl>

            <button
              type="button"
              className="mt-5 inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-medium hover:bg-slate-50"
            >
              <KeyRound size={16} />
              เปลี่ยนรหัสผ่าน
            </button>
          </section>

          <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="font-semibold">ยอดขายของฉันวันนี้</h2>
                <p className="text-sm text-slate-500">{(todaySales ?? []).length} บิล</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-semibold">
                  {totalSales.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                </div>
                <div className="text-xs text-slate-500">บาท</div>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {todaySales?.length ? (
                todaySales.map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between px-5 py-3 text-sm">
                    <div className="flex items-center gap-3">
                      <ReceiptText size={16} className="text-slate-500" />
                      <div>
                        <div className="font-medium">{sale.sale_no}</div>
                        <div className="text-xs text-slate-500">{sale.payment_method}</div>
                      </div>
                    </div>
                    <div className="font-semibold">
                      {Number(sale.total_amount ?? 0).toLocaleString("th-TH", {
                        minimumFractionDigits: 2,
                      })}
                    </div>
                  </div>
                ))
              ) : (
                <p className="px-5 py-6 text-sm text-slate-500">วันนี้ยังไม่มีบิลของคุณ</p>
              )}
            </div>
          </section>
        </div>
      </main>
    </AppShell>
  );
}
