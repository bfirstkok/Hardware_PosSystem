import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login");
  }

  const [{ count: productCount }, { count: saleCount }, { data: lowStock }] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }),
    supabase.from("sales").select("id", { count: "exact", head: true }),
    supabase
      .from("products")
      .select("id, sku, name, stock_qty, min_stock")
      .eq("is_active", true)
      .lt("stock_qty", 10)
      .order("stock_qty")
      .limit(5),
  ]);

  return (
    <AppShell>
      <main className="p-4 lg:p-6">
        <div>
          <p className="text-sm text-slate-500">เข้าสู่ระบบด้วย {userData.user.email}</p>
          <h1 className="mt-1 text-2xl font-semibold">Dashboard</h1>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <MetricCard label="จำนวนสินค้า" value={productCount ?? 0} />
          <MetricCard label="จำนวนบิลขาย" value={saleCount ?? 0} />
          <MetricCard label="สินค้าใกล้หมด" value={lowStock?.length ?? 0} />
        </div>

        <section className="mt-6 rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-semibold">สินค้าใกล้หมด</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {lowStock?.length ? (
              lowStock.map((item) => (
                <div key={item.id} className="flex items-center justify-between px-5 py-3 text-sm">
                  <div>
                    <div className="font-medium">{item.name}</div>
                    <div className="text-slate-500">{item.sku}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{item.stock_qty}</div>
                    <div className="text-xs text-slate-500">ขั้นต่ำ {item.min_stock}</div>
                  </div>
                </div>
              ))
            ) : (
              <p className="px-5 py-6 text-sm text-slate-500">ยังไม่มีข้อมูลสินค้าใกล้หมด</p>
            )}
          </div>
        </section>
      </main>
    </AppShell>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="text-sm text-slate-500">{label}</div>
      <div className="mt-2 text-3xl font-semibold">{value.toLocaleString("th-TH")}</div>
    </div>
  );
}
