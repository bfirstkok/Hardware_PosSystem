import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";

type ProductRow = {
  id: number;
  sku: string;
  barcode: string | null;
  name: string;
  retail_price: number;
  wholesale_price: number;
  stock_qty: number;
  product_categories: { name: string } | null;
  units: { short_name: string } | null;
};

type CategoryRow = {
  id: number;
  name: string;
};

type UnitRow = {
  id: number;
  name: string;
  short_name: string;
};

async function createProduct(formData: FormData) {
  "use server";

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login");
  }

  const categoryId = formData.get("category_id")?.toString();
  const unitId = formData.get("base_unit_id")?.toString();

  await supabase.from("products").insert({
    sku: formData.get("sku")?.toString().trim(),
    barcode: formData.get("barcode")?.toString().trim() || null,
    name: formData.get("name")?.toString().trim(),
    category_id: categoryId ? Number(categoryId) : null,
    base_unit_id: unitId ? Number(unitId) : null,
    retail_price: Number(formData.get("retail_price") ?? 0),
    wholesale_price: Number(formData.get("wholesale_price") ?? 0),
    cost_price: Number(formData.get("cost_price") ?? 0),
    min_stock: Number(formData.get("min_stock") ?? 0),
    stock_qty: Number(formData.get("stock_qty") ?? 0),
  });

  revalidatePath("/products");
  revalidatePath("/dashboard");
}

export default async function ProductsPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login");
  }

  const [{ data, error }, { data: categoryData }, { data: unitData }] = await Promise.all([
    supabase
      .from("products")
      .select(
        "id, sku, barcode, name, retail_price, wholesale_price, stock_qty, product_categories(name), units(short_name)",
      )
      .order("name"),
    supabase.from("product_categories").select("id, name").order("name"),
    supabase.from("units").select("id, name, short_name").order("name"),
  ]);

  const products = (data ?? []) as unknown as ProductRow[];
  const categories = (categoryData ?? []) as CategoryRow[];
  const units = (unitData ?? []) as UnitRow[];

  return (
    <AppShell>
      <main className="p-4 lg:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500">สินค้าและราคาขาย</p>
            <h1 className="mt-1 text-2xl font-semibold">Products</h1>
          </div>
          <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
            {products.length.toLocaleString("th-TH")} รายการ
          </div>
        </div>

        {error ? (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error.message}
          </div>
        ) : null}

        <form action={createProduct} className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">เพิ่มสินค้า</h2>
              <p className="text-sm text-slate-500">สร้าง SKU พร้อมราคาขายและยอดตั้งต้น</p>
            </div>
            <button
              type="submit"
              className="h-10 rounded-md bg-slate-950 px-4 text-sm font-medium text-white hover:bg-slate-800"
            >
              บันทึกสินค้า
            </button>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="text-sm font-medium">
              SKU
              <input name="sku" required className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3" />
            </label>
            <label className="text-sm font-medium">
              บาร์โค้ด
              <input name="barcode" className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3" />
            </label>
            <label className="text-sm font-medium md:col-span-2">
              ชื่อสินค้า
              <input name="name" required className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3" />
            </label>
            <label className="text-sm font-medium">
              หมวด
              <select name="category_id" className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3">
                <option value="">ไม่ระบุ</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium">
              หน่วย
              <select name="base_unit_id" className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3">
                <option value="">ไม่ระบุ</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.short_name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm font-medium">
              ราคาปลีก
              <input name="retail_price" type="number" min="0" step="0.01" defaultValue="0" className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3" />
            </label>
            <label className="text-sm font-medium">
              ราคาส่ง
              <input name="wholesale_price" type="number" min="0" step="0.01" defaultValue="0" className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3" />
            </label>
            <label className="text-sm font-medium">
              ต้นทุน
              <input name="cost_price" type="number" min="0" step="0.01" defaultValue="0" className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3" />
            </label>
            <label className="text-sm font-medium">
              สต็อกขั้นต่ำ
              <input name="min_stock" type="number" min="0" step="0.01" defaultValue="0" className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3" />
            </label>
            <label className="text-sm font-medium">
              ยอดตั้งต้น
              <input name="stock_qty" type="number" step="0.01" defaultValue="0" className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3" />
            </label>
          </div>
        </form>

        <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left font-medium">SKU</th>
                <th className="px-4 py-3 text-left font-medium">ชื่อสินค้า</th>
                <th className="px-4 py-3 text-left font-medium">หมวด</th>
                <th className="px-4 py-3 text-left font-medium">หน่วย</th>
                <th className="px-4 py-3 text-right font-medium">ปลีก</th>
                <th className="px-4 py-3 text-right font-medium">ส่ง</th>
                <th className="px-4 py-3 text-right font-medium">คงเหลือ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3 font-medium">{item.sku}</td>
                  <td className="min-w-60 px-4 py-3">
                    <div>{item.name}</div>
                    <div className="text-xs text-slate-500">{item.barcode ?? "ไม่มีบาร์โค้ด"}</div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3">{item.product_categories?.name ?? "-"}</td>
                  <td className="whitespace-nowrap px-4 py-3">{item.units?.short_name ?? "-"}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    {Number(item.retail_price).toLocaleString("th-TH")}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    {Number(item.wholesale_price).toLocaleString("th-TH")}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-right font-medium">
                    {Number(item.stock_qty).toLocaleString("th-TH")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </AppShell>
  );
}
