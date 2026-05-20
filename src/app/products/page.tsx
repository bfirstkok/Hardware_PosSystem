import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";

type ProductRow = {
  id: number;
  sku: string;
  barcode: string | null;
  name: string;
  image_url: string | null;
  retail_price: number;
  wholesale_price: number;
  stock_qty: number;
  min_stock: number;
  cost_price: number;
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

type ProductPrice = {
  retail_price: number;
  wholesale_price: number;
  cost_price: number;
};

const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const imageExtensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const maxImageSize = 5 * 1024 * 1024;

async function requireUser() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login");
  }

  return supabase;
}

function productError(message: string) {
  redirect(`/products?error=${encodeURIComponent(message)}`);
}

function textField(formData: FormData, key: string, label: string, maxLength: number) {
  const value = formData.get(key)?.toString().trim() ?? "";

  if (!value) {
    productError(`กรุณากรอก${label}`);
  }
  if (value.length > maxLength) {
    productError(`${label}ยาวเกิน ${maxLength} ตัวอักษร`);
  }

  return value;
}

function optionalUrlField(formData: FormData, key: string) {
  const value = formData.get(key)?.toString().trim() ?? "";
  if (!value) return null;

  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      productError("URL รูปสินค้าต้องเป็น http หรือ https");
    }
    if (value.length > 500) {
      productError("URL รูปสินค้ายาวเกิน 500 ตัวอักษร");
    }
    return url.toString();
  } catch {
    productError("URL รูปสินค้าไม่ถูกต้อง");
  }
}

function optionalIdField(formData: FormData, key: string, label: string) {
  const value = formData.get(key)?.toString();
  if (!value) return null;

  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    productError(`${label}ไม่ถูกต้อง`);
  }

  return id;
}

function numberField(formData: FormData, key: string, label: string) {
  const value = Number(formData.get(key) ?? 0);
  if (!Number.isFinite(value) || value < 0 || value > 99999999) {
    productError(`${label}ไม่ถูกต้อง`);
  }

  return value;
}

function positiveIdField(formData: FormData, key: string, label: string) {
  const id = Number(formData.get(key));
  if (!Number.isInteger(id) || id <= 0) {
    productError(`${label}ไม่ถูกต้อง`);
  }

  return id;
}

function validateImageFile(file: FormDataEntryValue | null) {
  if (!(file instanceof File) || file.size === 0) return null;

  if (file.size > maxImageSize) {
    productError("รูปสินค้าต้องมีขนาดไม่เกิน 5MB");
  }
  if (!allowedImageTypes.has(file.type)) {
    productError("รองรับเฉพาะรูป JPG, PNG หรือ WebP");
  }

  return file;
}

async function uploadProductImage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sku: string,
  imageFile: File | null,
) {
  if (!imageFile) return { imageUrl: null, warning: "" };

  const extension = imageExtensions[imageFile.type] ?? "jpg";
  const imagePath = `products/${sku}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from("product-images")
    .upload(imagePath, imageFile, {
      contentType: imageFile.type,
      upsert: true,
    });

  if (uploadError) {
    return { imageUrl: null, warning: "อัปโหลดรูปไม่สำเร็จ" };
  }

  const { data: publicImage } = supabase.storage.from("product-images").getPublicUrl(imagePath);
  return { imageUrl: publicImage.publicUrl, warning: "" };
}

async function createProduct(formData: FormData) {
  "use server";

  const supabase = await requireUser();

  const categoryId = optionalIdField(formData, "category_id", "หมวด");
  const unitId = optionalIdField(formData, "base_unit_id", "หน่วย");
  const name = textField(formData, "name", "ชื่อสินค้า", 160);
  const retailPrice = numberField(formData, "retail_price", "ราคาปลีก");
  const wholesalePrice = numberField(formData, "wholesale_price", "ราคาส่ง");
  const costPrice = numberField(formData, "cost_price", "ต้นทุน");
  const minStock = numberField(formData, "min_stock", "สต็อกขั้นต่ำ");
  const stockQty = numberField(formData, "stock_qty", "ยอดตั้งต้น");
  const datePart = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date())
    .replaceAll("-", "");
  const skuPrefix = `HW${datePart}`;
  const { data: latestProduct } = await supabase
    .from("products")
    .select("sku")
    .ilike("sku", `${skuPrefix}%`)
    .order("sku", { ascending: false })
    .limit(1)
    .maybeSingle();
  const latestSequence = Number(latestProduct?.sku?.slice(skuPrefix.length)) || 0;
  const sku = `${skuPrefix}${String(latestSequence + 1).padStart(4, "0")}`;
  const imageFile = validateImageFile(formData.get("image_file"));
  let imageUrl = optionalUrlField(formData, "image_url");
  const barcode = sku;

  const uploadResult = await uploadProductImage(supabase, sku, imageFile);
  if (uploadResult.imageUrl) {
    imageUrl = uploadResult.imageUrl;
  }

  const { error: insertError } = await supabase.from("products").insert({
    sku,
    barcode,
    name,
    image_url: imageUrl,
    category_id: categoryId,
    base_unit_id: unitId,
    retail_price: retailPrice,
    wholesale_price: wholesalePrice,
    cost_price: costPrice,
    min_stock: minStock,
    stock_qty: stockQty,
  });

  if (insertError) {
    productError("บันทึกสินค้าไม่สำเร็จ");
  }

  revalidatePath("/products");
  revalidatePath("/barcodes");
  revalidatePath("/dashboard");

  if (uploadResult.warning) {
    redirect(`/products?imageUpload=${encodeURIComponent(uploadResult.warning)}`);
  }
}

async function updateProduct(formData: FormData) {
  "use server";

  const supabase = await requireUser();
  const { data: userData } = await supabase.auth.getUser();
  const id = positiveIdField(formData, "id", "สินค้า");
  const categoryId = optionalIdField(formData, "category_id", "หมวด");
  const unitId = optionalIdField(formData, "base_unit_id", "หน่วย");
  const name = textField(formData, "name", "ชื่อสินค้า", 160);
  const retailPrice = numberField(formData, "retail_price", "ราคาปลีก");
  const wholesalePrice = numberField(formData, "wholesale_price", "ราคาส่ง");
  const costPrice = numberField(formData, "cost_price", "ต้นทุน");
  const minStock = numberField(formData, "min_stock", "สต็อกขั้นต่ำ");
  const sku = formData.get("sku")?.toString() || `product-${id}`;
  const imageFile = validateImageFile(formData.get("image_file"));
  let imageUrl = optionalUrlField(formData, "image_url");

  const uploadResult = await uploadProductImage(supabase, sku, imageFile);
  if (uploadResult.imageUrl) {
    imageUrl = uploadResult.imageUrl;
  }

  const { data: currentProduct, error: currentProductError } = await supabase
    .from("products")
    .select("retail_price, wholesale_price, cost_price")
    .eq("id", id)
    .maybeSingle();

  if (currentProductError || !currentProduct) {
    productError("ไม่พบสินค้าที่ต้องการแก้ไข");
  }

  const { error: updateError } = await supabase
    .from("products")
    .update({
      name,
      image_url: imageUrl,
      category_id: categoryId,
      base_unit_id: unitId,
      retail_price: retailPrice,
      wholesale_price: wholesalePrice,
      cost_price: costPrice,
      min_stock: minStock,
    })
    .eq("id", id);

  if (updateError) {
    productError("แก้ไขสินค้าไม่สำเร็จ");
  }

  const oldPrice = currentProduct as ProductPrice;
  const priceChanged =
    Number(oldPrice.retail_price) !== retailPrice ||
    Number(oldPrice.wholesale_price) !== wholesalePrice ||
    Number(oldPrice.cost_price) !== costPrice;

  if (priceChanged) {
    const { error: priceHistoryError } = await supabase.from("product_price_history").insert({
      product_id: id,
      old_retail_price: oldPrice.retail_price,
      new_retail_price: retailPrice,
      old_wholesale_price: oldPrice.wholesale_price,
      new_wholesale_price: wholesalePrice,
      old_cost_price: oldPrice.cost_price,
      new_cost_price: costPrice,
      changed_by: userData.user?.id ?? null,
    });

    if (priceHistoryError) {
      productError("บันทึกประวัติราคาไม่สำเร็จ");
    }
  }

  revalidatePath("/products");
  revalidatePath("/pos");
  revalidatePath("/barcodes");
  revalidatePath("/dashboard");
  revalidatePath("/product-history");

  if (uploadResult.warning) {
    redirect(`/products?imageUpload=${encodeURIComponent(uploadResult.warning)}`);
  }
}

async function deactivateProduct(formData: FormData) {
  "use server";

  const supabase = await requireUser();
  const id = positiveIdField(formData, "id", "สินค้า");

  const { error: updateError } = await supabase
    .from("products")
    .update({ is_active: false })
    .eq("id", id);

  if (updateError) {
    productError("ปิดใช้งานสินค้าไม่สำเร็จ");
  }

  revalidatePath("/products");
  revalidatePath("/pos");
  revalidatePath("/barcodes");
  revalidatePath("/dashboard");
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; imageUpload?: string }>;
}) {
  const notice = await searchParams;
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login");
  }

  const [{ data, error }, { data: categoryData }, { data: unitData }] = await Promise.all([
    supabase
      .from("products")
      .select(
        "id, sku, barcode, name, image_url, retail_price, wholesale_price, cost_price, min_stock, stock_qty, product_categories(name), units(short_name)",
      )
      .eq("is_active", true)
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

        {notice.error ? (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {notice.error}
          </div>
        ) : null}

        {error ? (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error.message}
            {error.message.includes("image_url") ? (
              <div className="mt-2">
                ต้องรัน migration <span className="font-mono">supabase/migrations/20260512_product_images.sql</span>{" "}
                ใน Supabase SQL Editor ก่อนใช้งานรูปสินค้า
              </div>
            ) : null}
          </div>
        ) : null}

        {notice.imageUpload ? (
          <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            บันทึกสินค้าแล้ว แต่อัปโหลดรูปไม่สำเร็จ: {notice.imageUpload}. ให้รัน SQL สำหรับ
            bucket `product-images` ใน Supabase ก่อนอัปโหลดรูปสินค้า
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
              <input
                disabled
                value="สร้างอัตโนมัติ"
                className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-slate-50 px-3 text-slate-500"
              />
            </label>
            <label className="text-sm font-medium">
              บาร์โค้ด
              <input
                disabled
                value="สร้างอัตโนมัติ"
                placeholder="ว่างไว้เพื่อสร้างอัตโนมัติ"
                className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-slate-50 px-3 text-slate-500"
              />
            </label>
            <label className="text-sm font-medium md:col-span-2">
              ชื่อสินค้า
              <input name="name" required className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3" />
            </label>
            <label className="text-sm font-medium md:col-span-2">
              รูปสินค้า (URL)
              <input
                name="image_url"
                type="url"
                placeholder="https://..."
                className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3"
              />
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
            <label className="text-sm font-medium md:col-span-2">
              อัปโหลดรูปสินค้า
              <input
                name="image_file"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="mt-2 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-950 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white"
              />
            </label>
          </div>
        </form>

        <div className="mt-6 overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left font-medium">รูป</th>
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
                  <td className="px-4 py-3">
                    <div className="size-14 overflow-hidden rounded-md border border-slate-200 bg-slate-100">
                      {item.image_url ? (
                        <div
                          className="h-full w-full bg-cover bg-center"
                          style={{ backgroundImage: `url("${item.image_url}")` }}
                          aria-label={item.name}
                        />
                      ) : (
                        <div className="grid h-full place-items-center text-xs font-semibold text-slate-400">
                          SKU
                        </div>
                      )}
                    </div>
                  </td>
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
                  <td className="whitespace-nowrap px-4 py-3 text-right">
                    <details className="group inline-block text-left">
                      <summary className="cursor-pointer list-none rounded-md border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50 group-open:fixed group-open:right-6 group-open:top-6 group-open:z-50 group-open:bg-white group-open:shadow-lg">
                        แก้ไข
                      </summary>
                      <div className="fixed inset-0 z-40 grid place-items-center bg-slate-950/45 p-4 text-left backdrop-blur-sm">
                        <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-2xl">
                        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-6 py-5">
                          <div>
                            <h3 className="font-semibold text-slate-950">แก้ไขสินค้า</h3>
                            <p className="mt-1 text-sm text-slate-500">{item.name}</p>
                          </div>
                          <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500">
                            {item.sku}
                          </span>
                        </div>
                        <div className="grid gap-5 p-6 lg:grid-cols-[220px_1fr]">
                          <div>
                            <div className="aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                              {item.image_url ? (
                                <div
                                  className="h-full w-full bg-cover bg-center"
                                  style={{ backgroundImage: `url("${item.image_url}")` }}
                                  aria-label={item.name}
                                />
                              ) : (
                                <div className="grid h-full place-items-center text-sm font-semibold text-slate-400">
                                  ไม่มีรูป
                                </div>
                              )}
                            </div>
                            <div className="mt-3 rounded-md bg-slate-50 p-3 text-xs text-slate-500">
                              รูปใหม่จะถูกนำไปใช้ในหน้าแคชเชียร์และหน้าบาร์โค้ดหลังบันทึก
                            </div>
                          </div>
                        <form action={updateProduct} className="grid gap-4 md:grid-cols-2">
                          <input type="hidden" name="id" value={item.id} />
                          <input type="hidden" name="sku" value={item.sku} />
                          <div className="md:col-span-2 rounded-lg border border-slate-200 bg-slate-50 p-4">
                            <div className="text-sm font-semibold text-slate-950">ข้อมูลหลัก</div>
                            <div className="mt-3 grid gap-3 md:grid-cols-2">
                          <label className="text-sm font-medium">
                            SKU
                            <input disabled value={item.sku} className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-slate-50 px-3 text-slate-500" />
                          </label>
                          <label className="text-sm font-medium">
                            บาร์โค้ด
                            <input disabled value={item.barcode ?? item.sku} className="mt-2 h-10 w-full rounded-md border border-slate-300 bg-slate-50 px-3 text-slate-500" />
                          </label>
                          <label className="text-sm font-medium md:col-span-2">
                            ชื่อสินค้า
                            <input name="name" required defaultValue={item.name} className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3" />
                          </label>
                            </div>
                          </div>
                          <div className="md:col-span-2 rounded-lg border border-slate-200 p-4">
                            <div className="text-sm font-semibold text-slate-950">รูปสินค้า</div>
                            <div className="mt-3 grid gap-3">
                          <label className="text-sm font-medium md:col-span-2">
                            รูปสินค้า (URL)
                            <input name="image_url" type="url" defaultValue={item.image_url ?? ""} className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3" />
                          </label>
                          <label className="text-sm font-medium md:col-span-2">
                            อัปโหลดรูปใหม่
                            <input
                              name="image_file"
                              type="file"
                              accept="image/png,image/jpeg,image/webp"
                              className="mt-2 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-slate-950 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white"
                            />
                          </label>
                            </div>
                          </div>
                          <div className="md:col-span-2 rounded-lg border border-slate-200 p-4">
                            <div className="text-sm font-semibold text-slate-950">หมวดและราคา</div>
                            <div className="mt-3 grid gap-3 md:grid-cols-2">
                          <label className="text-sm font-medium">
                            หมวด
                            <select name="category_id" defaultValue="" className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3">
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
                            <select name="base_unit_id" defaultValue="" className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3">
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
                            <input name="retail_price" type="number" min="0" step="0.01" defaultValue={Number(item.retail_price)} className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3" />
                          </label>
                          <label className="text-sm font-medium">
                            ราคาส่ง
                            <input name="wholesale_price" type="number" min="0" step="0.01" defaultValue={Number(item.wholesale_price)} className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3" />
                          </label>
                          <label className="text-sm font-medium">
                            ต้นทุน
                            <input name="cost_price" type="number" min="0" step="0.01" defaultValue={Number(item.cost_price)} className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3" />
                          </label>
                          <label className="text-sm font-medium">
                            สต๊อกขั้นต่ำ
                            <input name="min_stock" type="number" min="0" step="0.01" defaultValue={Number(item.min_stock)} className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3" />
                          </label>
                          <div className="md:col-span-2 flex justify-end">
                            <button type="submit" className="h-10 rounded-md bg-slate-950 px-4 text-sm font-medium text-white hover:bg-slate-800">
                              บันทึกแก้ไข
                            </button>
                          </div>
                            </div>
                          </div>
                        </form>
                        <form action={deactivateProduct} className="mt-3 border-t border-slate-200 pt-3 text-right">
                          <input type="hidden" name="id" value={item.id} />
                          <button type="submit" className="h-10 rounded-md border border-red-200 px-4 text-sm font-medium text-red-700 hover:bg-red-50">
                            ปิดใช้งานสินค้า
                          </button>
                        </form>
                        </div>
                      </div>
                      </div>
                    </details>
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
