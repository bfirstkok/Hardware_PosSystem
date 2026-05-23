import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { AppShell } from "@/components/app-shell";
import { requireActionAccess, requireRouteAccess } from "@/lib/staff-session";
import { createClient } from "@/lib/supabase/server";

type StockMovementRow = {
  id: number;
  movement_date: string;
  movement_type: string;
  qty_in: number;
  qty_out: number;
  products: { sku: string; name: string } | null;
};

type ProductOption = {
  id: number;
  sku: string;
  name: string;
  stock_qty: number;
};

function stockError(message: string) {
  redirect(`/stock?error=${encodeURIComponent(message)}`);
}

function positiveNumberField(formData: FormData, key: string, label: string) {
  const value = Number(formData.get(key));
  if (!Number.isFinite(value) || value <= 0 || value > 99999999) {
    stockError(`${label}ไม่ถูกต้อง`);
  }

  return value;
}

function positiveIdField(formData: FormData, key: string, label: string) {
  const id = Number(formData.get(key));
  if (!Number.isInteger(id) || id <= 0) {
    stockError(`${label}ไม่ถูกต้อง`);
  }

  return id;
}

function noteField(formData: FormData) {
  const note = formData.get("note")?.toString().trim() ?? "";
  if (note.length > 500) {
    stockError("หมายเหตุยาวเกิน 500 ตัวอักษร");
  }

  return note;
}

async function receiveStock(formData: FormData) {
  "use server";

  await requireActionAccess("stock.adjust_basic");
  const supabase = await createClient();

  const { error } = await supabase.rpc("receive_stock", {
    payload: {
      product_id: positiveIdField(formData, "product_id", "สินค้า"),
      qty: positiveNumberField(formData, "qty", "จำนวนรับเข้า"),
      note: noteField(formData),
    },
  });

  if (error) {
    stockError("บันทึกรับสินค้าไม่สำเร็จ");
  }

  revalidatePath("/stock");
  revalidatePath("/products");
  revalidatePath("/dashboard");
}

export default async function StockPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const notice = await searchParams;
  const staff = await requireRouteAccess("/stock");
  const supabase = await createClient();

  const [{ data }, { data: productData }] = await Promise.all([
    supabase
      .from("stock_movements")
      .select("id, movement_date, movement_type, qty_in, qty_out, products(sku, name)")
      .order("movement_date", { ascending: false })
      .limit(30),
    supabase
      .from("products")
      .select("id, sku, name, stock_qty")
      .eq("is_active", true)
      .order("name"),
  ]);

  const movements = (data ?? []) as unknown as StockMovementRow[];
  const products = (productData ?? []) as ProductOption[];

  return (
    <AppShell currentStaff={staff}>
      <main className="p-4 lg:p-6">
        <p className="text-sm text-slate-500">ประวัติสินค้าเข้าออกล่าสุด</p>
        <h1 className="mt-1 text-2xl font-semibold">Stock</h1>

        {notice.error ? (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {notice.error}
          </div>
        ) : null}

        <form action={receiveStock} className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">รับสินค้าเข้า</h2>
              <p className="text-sm text-slate-500">เพิ่มยอดคงเหลือและบันทึกประวัติสต็อก</p>
            </div>
            <button
              type="submit"
              className="h-10 rounded-md bg-slate-950 px-4 text-sm font-medium text-white hover:bg-slate-800"
            >
              บันทึกรับเข้า
            </button>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-[1fr_160px_1fr]">
            <label className="text-sm font-medium">
              สินค้า
              <select name="product_id" required className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3">
                <option value="">เลือกสินค้า</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} ({product.sku}) - คงเหลือ {Number(product.stock_qty).toLocaleString("th-TH")}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium">
              จำนวนรับเข้า
              <input name="qty" required type="number" min="0.01" step="0.01" className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3" />
            </label>
            <label className="text-sm font-medium">
              หมายเหตุ
              <input name="note" className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3" />
            </label>
          </div>
        </form>

        <div className="mt-6 rounded-lg border border-slate-200 bg-white">
          <div className="divide-y divide-slate-100">
            {movements.length ? (
              movements.map((item) => (
                <div key={item.id} className="grid gap-2 px-5 py-3 text-sm md:grid-cols-4">
                  <div>{new Date(item.movement_date).toLocaleString("th-TH")}</div>
                  <div className="font-medium">{item.products?.name ?? "-"}</div>
                  <div>{item.movement_type}</div>
                  <div className="text-right">
                    เข้า {Number(item.qty_in).toLocaleString("th-TH")} / ออก{" "}
                    {Number(item.qty_out).toLocaleString("th-TH")}
                  </div>
                </div>
              ))
            ) : (
              <p className="px-5 py-6 text-sm text-slate-500">ยังไม่มีประวัติสต็อก</p>
            )}
          </div>
        </div>
      </main>
    </AppShell>
  );
}
