"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Banknote,
  Barcode,
  Boxes,
  Calculator,
  CreditCard,
  Minus,
  Pause,
  Plus,
  QrCode,
  ReceiptText,
  RotateCcw,
  Save,
  Search,
  ShoppingCart,
  Trash2,
  UserRound,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { createClient } from "@/lib/supabase/client";

type Product = {
  id: number;
  sku: string;
  barcode: string | null;
  name: string;
  image_url: string | null;
  retail_price: number;
  wholesale_price: number;
  stock_qty: number;
  product_categories: { name: string } | null;
  units: { short_name: string } | null;
};

type CartItem = Product & {
  qty: number;
  unitPrice: number;
};

type HeldBill = {
  id: string;
  customerName: string;
  items: CartItem[];
  createdAt: string;
};

const paymentOptions = [
  { value: "cash", label: "เงินสด", icon: Banknote },
  { value: "transfer", label: "โอน", icon: QrCode },
  { value: "qr", label: "QR", icon: QrCode },
  { value: "card", label: "บัตร", icon: CreditCard },
];

const quickCash = [100, 500, 1000, 2000, 5000];

function money(value: number) {
  return value.toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function quantity(value: number) {
  return value.toLocaleString("th-TH", {
    maximumFractionDigits: 2,
  });
}

function productInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
}

export default function PosPage() {
  const searchRef = useRef<HTMLInputElement>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [heldBills, setHeldBills] = useState<HeldBill[]>([]);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [priceMode, setPriceMode] = useState<"retail" | "wholesale">("retail");
  const [customerName, setCustomerName] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [cashReceived, setCashReceived] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadProducts() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("products")
        .select(
          "id, sku, barcode, name, image_url, retail_price, wholesale_price, stock_qty, product_categories(name), units(short_name)",
        )
        .eq("is_active", true)
        .order("name");

      if (error) {
        setMessage(error.message);
        return;
      }

      setProducts((data ?? []) as unknown as Product[]);
    }

    loadProducts();
    searchRef.current?.focus();
  }, []);

  const categories = useMemo(() => {
    const names = products
      .map((product) => product.product_categories?.name)
      .filter((name): name is string => Boolean(name));
    return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b, "th"));
  }, [products]);

  const visibleProducts = useMemo(() => {
    const value = query.trim().toLowerCase();

    return products.filter((product) => {
      const inCategory =
        activeCategory === "all" || product.product_categories?.name === activeCategory;
      const matchesQuery =
        !value ||
        product.name.toLowerCase().includes(value) ||
        product.sku.toLowerCase().includes(value) ||
        product.barcode?.toLowerCase().includes(value);

      return inCategory && matchesQuery;
    });
  }, [activeCategory, products, query]);

  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
  }, [cart]);

  const payableTotal = Math.max(0, subtotal - discountAmount);
  const changeAmount = paymentMethod === "cash" ? Math.max(0, cashReceived - payableTotal) : 0;
  const itemCount = cart.reduce((sum, item) => sum + item.qty, 0);

  function selectedPrice(product: Product) {
    if (priceMode === "wholesale" && Number(product.wholesale_price) > 0) {
      return Number(product.wholesale_price);
    }
    return Number(product.retail_price);
  }

  function addToCart(product: Product) {
    setMessage("");
    setCart((current) => {
      const found = current.find((item) => item.id === product.id);
      if (found) {
        return current.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item,
        );
      }
      return [...current, { ...product, qty: 1, unitPrice: selectedPrice(product) }];
    });
  }

  function scanOrSearch() {
    const value = query.trim().toLowerCase();
    if (!value) return;

    const exact = products.find(
      (product) => product.sku.toLowerCase() === value || product.barcode?.toLowerCase() === value,
    );

    if (exact) {
      addToCart(exact);
      setQuery("");
    }
  }

  function updateQty(productId: number, qty: number) {
    setCart((current) =>
      current
        .map((item) => (item.id === productId ? { ...item, qty } : item))
        .filter((item) => item.qty > 0),
    );
  }

  function updatePrice(productId: number, unitPrice: number) {
    setCart((current) =>
      current.map((item) =>
        item.id === productId ? { ...item, unitPrice: Math.max(0, unitPrice) } : item,
      ),
    );
  }

  function removeItem(productId: number) {
    setCart((current) => current.filter((item) => item.id !== productId));
  }

  function clearBill() {
    setCart([]);
    setCustomerName("");
    setReferenceNo("");
    setDiscountAmount(0);
    setCashReceived(0);
    setMessage("");
    searchRef.current?.focus();
  }

  function holdBill() {
    if (!cart.length) return;

    setHeldBills((current) => [
      {
        id: crypto.randomUUID(),
        customerName: customerName || "ลูกค้าหน้าร้าน",
        items: cart,
        createdAt: new Date().toISOString(),
      },
      ...current,
    ]);
    clearBill();
  }

  function restoreHeldBill(bill: HeldBill) {
    setCart(bill.items);
    setCustomerName(bill.customerName === "ลูกค้าหน้าร้าน" ? "" : bill.customerName);
    setHeldBills((current) => current.filter((item) => item.id !== bill.id));
    setMessage("");
  }

  async function checkout() {
    if (!cart.length || loading) return;

    setLoading(true);
    setMessage("");

    const supabase = createClient();
    const { data, error } = await supabase.rpc("complete_pos_sale", {
      payload: {
        customer_name: customerName.trim() || null,
        reference_no: referenceNo.trim() || null,
        payment_method: paymentMethod,
        discount_amount: discountAmount,
        paid_amount: paymentMethod === "cash" ? cashReceived : payableTotal,
        items: cart.map((item) => ({
          product_id: item.id,
          qty: item.qty,
          unit_price: item.unitPrice,
        })),
      },
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    clearBill();
    setMessage(`บันทึกการขายสำเร็จ: ${data}`);

    const { data: refreshed } = await supabase
      .from("products")
      .select(
        "id, sku, barcode, name, image_url, retail_price, wholesale_price, stock_qty, product_categories(name), units(short_name)",
      )
      .eq("is_active", true)
      .order("name");
    setProducts((refreshed ?? []) as unknown as Product[]);
  }

  return (
    <AppShell>
      <main className="min-h-screen bg-slate-100 text-slate-950">
      <header className="border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-md bg-emerald-700 text-white">
              <ShoppingCart size={22} />
            </div>
            <div>
              <p className="text-sm text-slate-500">ขายหน้าร้านร้านวัสดุก่อสร้าง</p>
              <h1 className="text-xl font-semibold">POS แคชเชียร์</h1>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/dashboard"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium hover:bg-slate-50"
            >
              <Boxes size={17} />
              Dashboard
            </Link>
            <button
              type="button"
              onClick={clearBill}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium hover:bg-slate-50"
            >
              <RotateCcw size={17} />
              ล้างบิล
            </button>
          </div>
        </div>
      </header>

      <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1fr)_460px]">
        <section className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
              <label className="flex h-12 items-center gap-2 rounded-md border border-slate-300 px-3 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100">
                <Search size={19} className="text-slate-400" />
                <input
                  ref={searchRef}
                  className="w-full outline-none"
                  placeholder="สแกนบาร์โค้ด หรือค้นหาชื่อสินค้า / SKU"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      scanOrSearch();
                    }
                  }}
                />
                <Barcode size={19} className="text-slate-400" />
              </label>

              <div className="grid grid-cols-2 rounded-md border border-slate-300 bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() => setPriceMode("retail")}
                  className={`h-10 rounded px-4 text-sm font-medium ${
                    priceMode === "retail" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"
                  }`}
                >
                  ปลีก
                </button>
                <button
                  type="button"
                  onClick={() => setPriceMode("wholesale")}
                  className={`h-10 rounded px-4 text-sm font-medium ${
                    priceMode === "wholesale" ? "bg-white text-slate-950 shadow-sm" : "text-slate-500"
                  }`}
                >
                  ส่ง
                </button>
              </div>
            </div>

            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setActiveCategory("all")}
                className={`h-9 shrink-0 rounded-md px-3 text-sm font-medium ${
                  activeCategory === "all"
                    ? "bg-slate-950 text-white"
                    : "border border-slate-300 bg-white text-slate-700"
                }`}
              >
                ทั้งหมด
              </button>
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setActiveCategory(category)}
                  className={`h-9 shrink-0 rounded-md px-3 text-sm font-medium ${
                    activeCategory === category
                      ? "bg-slate-950 text-white"
                      : "border border-slate-300 bg-white text-slate-700"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
            {visibleProducts.map((product) => {
              const unitPrice = selectedPrice(product);
              const lowStock = Number(product.stock_qty) <= 0;

              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => addToCart(product)}
                  disabled={lowStock}
                  className="overflow-hidden rounded-lg border border-slate-200 bg-white text-left transition hover:border-emerald-400 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-55"
                >
                  <div className="aspect-[4/3] bg-slate-100">
                    {product.image_url ? (
                      <div
                        className="h-full w-full bg-cover bg-center"
                        style={{ backgroundImage: `url("${product.image_url}")` }}
                        aria-label={product.name}
                      />
                    ) : (
                      <div className="grid h-full place-items-center bg-gradient-to-br from-slate-100 to-emerald-50">
                        <div className="grid size-16 place-items-center rounded-md bg-white text-lg font-semibold text-emerald-800 shadow-sm">
                          {productInitials(product.name)}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-medium text-slate-500">{product.sku}</div>
                      <div className="mt-1 line-clamp-2 font-semibold">{product.name}</div>
                    </div>
                  </div>
                  <div className="mt-4 flex items-end justify-between gap-3">
                    <div>
                      <div className="text-xs text-slate-500">
                        {product.product_categories?.name ?? "ไม่ระบุหมวด"} ·{" "}
                        {product.units?.short_name ?? "หน่วย"}
                      </div>
                      <div className="mt-1 text-xl font-semibold">{money(unitPrice)}</div>
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      คงเหลือ
                      <div className="text-sm font-semibold text-slate-800">
                        {quantity(Number(product.stock_qty))}
                      </div>
                    </div>
                  </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <aside className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <ReceiptText className="text-emerald-700" size={23} />
                <div>
                  <h2 className="font-semibold">บิลขาย</h2>
                  <p className="text-sm text-slate-500">
                    {cart.length} รายการ · {quantity(itemCount)} ชิ้น
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={holdBill}
                disabled={!cart.length}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Pause size={16} />
                พักบิล
              </button>
            </div>

            <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <label className="flex h-10 items-center gap-2 rounded-md border border-slate-300 px-3">
                <UserRound size={17} className="text-slate-400" />
                <input
                  className="w-full text-sm outline-none"
                  placeholder="ชื่อลูกค้า"
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                />
              </label>
              <label className="flex h-10 items-center gap-2 rounded-md border border-slate-300 px-3">
                <ReceiptText size={17} className="text-slate-400" />
                <input
                  className="w-full text-sm outline-none"
                  placeholder="เลขอ้างอิง / ใบเสนอราคา"
                  value={referenceNo}
                  onChange={(event) => setReferenceNo(event.target.value)}
                />
              </label>
            </div>
          </div>

          <div className="max-h-[calc(100vh-520px)] min-h-64 overflow-y-auto p-4">
            {cart.length ? (
              <div className="space-y-3">
                {cart.map((item) => (
                  <div key={item.id} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium">{item.name}</div>
                        <div className="text-sm text-slate-500">
                          {item.sku} · {item.units?.short_name ?? "หน่วย"}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="rounded-md p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        aria-label="ลบสินค้า"
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>

                    <div className="mt-3 grid grid-cols-[122px_1fr] gap-3">
                      <div className="flex h-10 items-center rounded-md border border-slate-300">
                        <button
                          type="button"
                          className="grid size-10 place-items-center"
                          onClick={() => updateQty(item.id, item.qty - 1)}
                          aria-label="ลดจำนวน"
                        >
                          <Minus size={16} />
                        </button>
                        <input
                          className="h-full w-10 border-x border-slate-300 text-center text-sm font-medium outline-none"
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={item.qty}
                          onChange={(event) => updateQty(item.id, Number(event.target.value))}
                        />
                        <button
                          type="button"
                          className="grid size-10 place-items-center"
                          onClick={() => updateQty(item.id, item.qty + 1)}
                          aria-label="เพิ่มจำนวน"
                        >
                          <Plus size={16} />
                        </button>
                      </div>

                      <label className="flex h-10 items-center rounded-md border border-slate-300 px-3 text-sm">
                        <span className="shrink-0 text-slate-500">ราคา</span>
                        <input
                          className="min-w-0 flex-1 text-right outline-none"
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unitPrice}
                          onChange={(event) => updatePrice(item.id, Number(event.target.value))}
                        />
                      </label>
                    </div>

                    <div className="mt-3 text-right font-semibold">
                      {money(item.qty * item.unitPrice)} บาท
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid h-64 place-items-center rounded-lg border border-dashed border-slate-300 text-center text-sm text-slate-500">
                <div>
                  <ShoppingCart className="mx-auto mb-3 text-slate-300" size={32} />
                  ยังไม่มีสินค้าในบิล
                </div>
              </div>
            )}
          </div>

          {heldBills.length ? (
            <div className="border-t border-slate-200 px-4 py-3">
              <div className="mb-2 text-sm font-medium">บิลที่พักไว้</div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {heldBills.map((bill) => (
                  <button
                    key={bill.id}
                    type="button"
                    onClick={() => restoreHeldBill(bill)}
                    className="shrink-0 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-left text-xs text-amber-900 hover:bg-amber-100"
                  >
                    <div className="font-semibold">{bill.customerName}</div>
                    <div>{bill.items.length} รายการ</div>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="border-t border-slate-200 p-4">
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm font-medium">
                ส่วนลด
                <input
                  className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-right"
                  type="number"
                  min="0"
                  step="0.01"
                  value={discountAmount}
                  onChange={(event) => setDiscountAmount(Math.max(0, Number(event.target.value)))}
                />
              </label>
              <label className="text-sm font-medium">
                รับเงิน
                <input
                  className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 text-right"
                  type="number"
                  min="0"
                  step="0.01"
                  value={cashReceived}
                  onChange={(event) => setCashReceived(Math.max(0, Number(event.target.value)))}
                />
              </label>
            </div>

            <div className="mt-3 grid grid-cols-5 gap-2">
              {quickCash.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => setCashReceived(amount)}
                  className="h-9 rounded-md border border-slate-300 text-xs font-medium hover:bg-slate-50"
                >
                  {amount.toLocaleString("th-TH")}
                </button>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-4 gap-2">
              {paymentOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setPaymentMethod(option.value)}
                    className={`flex h-11 items-center justify-center gap-1 rounded-md border text-sm font-medium ${
                      paymentMethod === option.value
                        ? "border-emerald-700 bg-emerald-50 text-emerald-800"
                        : "border-slate-300 bg-white text-slate-600"
                    }`}
                  >
                    <Icon size={16} />
                    {option.label}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 space-y-2 rounded-lg bg-slate-50 p-4 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">รวมสินค้า</span>
                <span>{money(subtotal)} บาท</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">ส่วนลด</span>
                <span>{money(discountAmount)} บาท</span>
              </div>
              <div className="flex items-center justify-between text-lg font-semibold">
                <span>ยอดสุทธิ</span>
                <span>{money(payableTotal)} บาท</span>
              </div>
              <div className="flex items-center justify-between text-emerald-700">
                <span>เงินทอน</span>
                <span>{money(changeAmount)} บาท</span>
              </div>
            </div>

            {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}

            <button
              type="button"
              onClick={checkout}
              disabled={!cart.length || loading}
              className="mt-4 inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-slate-950 font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? <Calculator size={18} /> : <Save size={18} />}
              {loading ? "กำลังบันทึก..." : "ชำระเงินและบันทึกบิล"}
            </button>
          </div>
        </aside>
      </div>
      </main>
    </AppShell>
  );
}
