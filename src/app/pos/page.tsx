"use client";

import { useEffect, useMemo, useState } from "react";
import { Minus, Plus, Search, ShoppingCart, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Product = {
  id: number;
  sku: string;
  barcode: string | null;
  name: string;
  retail_price: number;
  stock_qty: number;
};

type CartItem = Product & {
  qty: number;
};

export default function PosPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [query, setQuery] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadProducts() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("products")
        .select("id, sku, barcode, name, retail_price, stock_qty")
        .eq("is_active", true)
        .order("name");

      if (!error) {
        setProducts((data ?? []) as Product[]);
      }
    }

    loadProducts();
  }, []);

  const visibleProducts = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value) return products;

    return products.filter((product) => {
      return (
        product.name.toLowerCase().includes(value) ||
        product.sku.toLowerCase().includes(value) ||
        product.barcode?.toLowerCase().includes(value)
      );
    });
  }, [products, query]);

  const total = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.qty * Number(item.retail_price), 0);
  }, [cart]);

  function addToCart(product: Product) {
    setMessage("");
    setCart((current) => {
      const found = current.find((item) => item.id === product.id);
      if (found) {
        return current.map((item) =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item,
        );
      }
      return [...current, { ...product, qty: 1 }];
    });
  }

  function updateQty(productId: number, change: number) {
    setCart((current) =>
      current
        .map((item) => (item.id === productId ? { ...item, qty: item.qty + change } : item))
        .filter((item) => item.qty > 0),
    );
  }

  function removeItem(productId: number) {
    setCart((current) => current.filter((item) => item.id !== productId));
  }

  async function checkout() {
    if (!cart.length || loading) return;

    setLoading(true);
    setMessage("");

    const supabase = createClient();
    const { data, error } = await supabase.rpc("complete_pos_sale", {
      payload: {
        payment_method: paymentMethod,
        items: cart.map((item) => ({
          product_id: item.id,
          qty: item.qty,
          unit_price: Number(item.retail_price),
        })),
      },
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setCart([]);
    setMessage(`บันทึกการขายสำเร็จ: ${data}`);

    const { data: refreshed } = await supabase
      .from("products")
      .select("id, sku, barcode, name, retail_price, stock_qty")
      .eq("is_active", true)
      .order("name");
    setProducts((refreshed ?? []) as Product[]);
  }

  return (
    <main className="grid min-h-screen gap-4 bg-slate-100 p-4 text-slate-950 lg:grid-cols-[1fr_430px]">
      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm text-slate-500">หน้าขายสินค้า</p>
              <h1 className="text-2xl font-semibold">POS</h1>
            </div>
            <a href="/dashboard" className="text-sm font-medium text-emerald-700 hover:text-emerald-900">
              กลับ Dashboard
            </a>
          </div>
          <label className="mt-4 flex h-11 items-center gap-2 rounded-md border border-slate-300 px-3">
            <Search size={18} className="text-slate-400" />
            <input
              className="w-full outline-none"
              placeholder="ค้นหาชื่อสินค้า, SKU หรือบาร์โค้ด"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
          {visibleProducts.map((product) => (
            <button
              key={product.id}
              onClick={() => addToCart(product)}
              className="min-h-32 rounded-lg border border-slate-200 p-4 text-left hover:border-emerald-400 hover:bg-emerald-50"
            >
              <div className="text-sm font-medium text-slate-500">{product.sku}</div>
              <div className="mt-1 font-semibold">{product.name}</div>
              <div className="mt-3 flex items-end justify-between gap-3">
                <span className="text-lg font-semibold">
                  {Number(product.retail_price).toLocaleString("th-TH")} บาท
                </span>
                <span className="text-xs text-slate-500">
                  คงเหลือ {Number(product.stock_qty).toLocaleString("th-TH")}
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      <aside className="rounded-lg border border-slate-200 bg-white">
        <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-4">
          <ShoppingCart className="text-emerald-700" size={22} />
          <div>
            <h2 className="font-semibold">รายการขาย</h2>
            <p className="text-sm text-slate-500">{cart.length} รายการ</p>
          </div>
        </div>

        <div className="max-h-[calc(100vh-285px)] min-h-72 overflow-y-auto p-4">
          {cart.length ? (
            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-sm text-slate-500">{item.sku}</div>
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
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div className="flex items-center rounded-md border border-slate-300">
                      <button className="p-2" onClick={() => updateQty(item.id, -1)} aria-label="ลดจำนวน">
                        <Minus size={16} />
                      </button>
                      <span className="w-10 text-center text-sm font-medium">{item.qty}</span>
                      <button className="p-2" onClick={() => updateQty(item.id, 1)} aria-label="เพิ่มจำนวน">
                        <Plus size={16} />
                      </button>
                    </div>
                    <div className="text-right font-semibold">
                      {(item.qty * Number(item.retail_price)).toLocaleString("th-TH")} บาท
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid h-72 place-items-center rounded-lg border border-dashed border-slate-300 text-sm text-slate-500">
              ยังไม่มีสินค้าในบิล
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 p-4">
          <label className="block text-sm font-medium">
            ช่องทางชำระเงิน
            <select
              className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3"
              value={paymentMethod}
              onChange={(event) => setPaymentMethod(event.target.value)}
            >
              <option value="cash">เงินสด</option>
              <option value="transfer">โอน</option>
              <option value="qr">QR</option>
              <option value="card">บัตร</option>
            </select>
          </label>

          <div className="mt-4 flex items-center justify-between text-lg font-semibold">
            <span>รวมสุทธิ</span>
            <span>{total.toLocaleString("th-TH")} บาท</span>
          </div>

          {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}

          <button
            onClick={checkout}
            disabled={!cart.length || loading}
            className="mt-4 h-12 w-full rounded-md bg-slate-950 font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "กำลังบันทึก..." : "ชำระเงิน"}
          </button>
        </div>
      </aside>
    </main>
  );
}
