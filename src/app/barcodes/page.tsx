import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/server";

type BarcodeProduct = {
  id: number;
  sku: string;
  barcode: string | null;
  name: string;
  image_url: string | null;
  retail_price: number;
};

const code39Patterns: Record<string, string> = {
  "0": "nnnwwnwnw",
  "1": "wnnwnnnnw",
  "2": "nnwwnnnnw",
  "3": "wnwwnnnnn",
  "4": "nnnwwnnnw",
  "5": "wnnwwnnnn",
  "6": "nnwwwnnnn",
  "7": "nnnwnnwnw",
  "8": "wnnwnnwnn",
  "9": "nnwwnnwnn",
  A: "wnnnnwnnw",
  B: "nnwnnwnnw",
  C: "wnwnnwnnn",
  D: "nnnnwwnnw",
  E: "wnnnwwnnn",
  F: "nnwnwwnnn",
  G: "nnnnnwwnw",
  H: "wnnnnwwnn",
  I: "nnwnnwwnn",
  J: "nnnnwwwnn",
  K: "wnnnnnnww",
  L: "nnwnnnnww",
  M: "wnwnnnnwn",
  N: "nnnnwnnww",
  O: "wnnnwnnwn",
  P: "nnwnwnnwn",
  Q: "nnnnnnwww",
  R: "wnnnnnwwn",
  S: "nnwnnnwwn",
  T: "nnnnwnwwn",
  U: "wwnnnnnnw",
  V: "nwwnnnnnw",
  W: "wwwnnnnnn",
  X: "nwnnwnnnw",
  Y: "wwnnwnnnn",
  Z: "nwwnwnnnn",
  "-": "nwnnnnwnw",
  ".": "wwnnnnwnn",
  " ": "nwwnnnwnn",
  $: "nwnwnwnnn",
  "/": "nwnwnnnwn",
  "+": "nwnnnwnwn",
  "%": "nnnwnwnwn",
  "*": "nwnnwnwnn",
};

function normalizeCode39(value: string) {
  const normalized = value.toUpperCase().replace(/[^0-9A-Z ./$%+-]/g, "");
  return normalized || "NO-CODE";
}

function Code39Barcode({ value }: { value: string }) {
  const code = normalizeCode39(value);
  const bars = `*${code}*`.split("").flatMap((character, characterIndex) => {
    const pattern = code39Patterns[character] ?? code39Patterns["-"];
    const modules = pattern.split("").map((width, moduleIndex) => ({
      bar: moduleIndex % 2 === 0,
      width: width === "w" ? 3 : 1,
      key: `${characterIndex}-${moduleIndex}`,
    }));

    if (characterIndex < code.length + 1) {
      modules.push({ bar: false, width: 1, key: `${characterIndex}-gap` });
    }

    return modules;
  });

  return (
    <div>
      <div className="flex h-16 w-full justify-center overflow-hidden bg-white">
        {bars.map((module) => (
          <span
            key={module.key}
            className={module.bar ? "bg-slate-950" : "bg-transparent"}
            style={{ width: `${module.width}px` }}
          />
        ))}
      </div>
      <div className="mt-2 text-center font-mono text-sm tracking-wide">{code}</div>
    </div>
  );
}

export default async function BarcodesPage() {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    redirect("/login");
  }

  const { data } = await supabase
    .from("products")
    .select("id, sku, barcode, name, image_url, retail_price")
    .eq("is_active", true)
    .order("name");

  const products = (data ?? []) as BarcodeProduct[];

  return (
    <AppShell>
      <main className="p-4 lg:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500">สินค้า / สโตร์</p>
            <h1 className="mt-1 text-2xl font-semibold">บาร์โค้ด</h1>
          </div>
          <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
            {products.length.toLocaleString("th-TH")} รายการ
          </div>
        </div>

        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">ฉลากบาร์โค้ดสินค้า</h2>
              <p className="text-sm text-slate-500">
                เพิ่มสินค้าและกำหนดบาร์โค้ดได้ที่เมนู เพิ่มสินค้า ถ้าไม่ระบุ ระบบหน้านี้จะใช้ SKU เป็นรหัสสำหรับพิมพ์ฉลาก
              </p>
            </div>
            <a
              href="/products"
              className="inline-flex h-10 items-center rounded-md bg-slate-950 px-4 text-sm font-medium text-white hover:bg-slate-800"
            >
              เพิ่มสินค้า
            </a>
          </div>
        </section>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {products.map((product) => {
            const code = product.barcode || product.sku;

            return (
              <div key={product.id} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="mb-4 aspect-[4/3] overflow-hidden rounded-md bg-slate-100">
                  {product.image_url ? (
                    <div
                      className="h-full w-full bg-cover bg-center"
                      style={{ backgroundImage: `url("${product.image_url}")` }}
                      aria-label={product.name}
                    />
                  ) : (
                    <div className="grid h-full place-items-center text-sm font-semibold text-slate-400">
                      ไม่มีรูป
                    </div>
                  )}
                </div>
                <div className="min-h-12">
                  <div className="text-sm font-semibold text-slate-950">{product.name}</div>
                  <div className="mt-1 text-xs text-slate-500">{product.sku}</div>
                </div>
                <div className="mt-4 rounded-md border border-slate-200 bg-white p-3">
                  <Code39Barcode value={code} />
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-slate-500">ราคาขาย</span>
                  <span className="font-semibold">
                    {Number(product.retail_price).toLocaleString("th-TH", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    บาท
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </AppShell>
  );
}
