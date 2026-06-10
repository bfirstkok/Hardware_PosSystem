"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Banknote,
  Barcode,
  Boxes,
  Calculator,
  CreditCard,
  CalendarClock,
  Minus,
  Maximize2,
  Minimize2,
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
import {
  addPendingSale,
  countPendingSales,
  pendingSalesForSync,
  type PendingSale,
  type PosSalePayload,
  updatePendingSale,
} from "@/lib/offline-sales";
import { filterProducts, MAX_VISIBLE_PRODUCTS } from "@/lib/pos-products.mjs";
import type { CurrentStaff } from "@/lib/staff-session";
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

type Customer = {
  id: number;
  member_code: string;
  full_name: string;
  phone: string | null;
  member_status: "active" | "paused" | "blocked";
  points_balance: number;
  is_active: boolean;
};

type LoyaltySettings = {
  earn_amount: number;
  earn_points: number;
  is_active: boolean;
};

type SoldItem = {
  productId: number;
  qty: number;
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
const productSelect =
  "id, sku, barcode, name, image_url, retail_price, wholesale_price, stock_qty, product_categories(name), units(short_name)";

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

export default function PosClient({ currentStaff }: { currentStaff: CurrentStaff }) {
  const searchRef = useRef<HTMLInputElement>(null);
  const pageRef = useRef<HTMLElement>(null);
  const checkoutIdempotencyKeyRef = useRef<string | null>(null);
  const syncInProgressRef = useRef(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [heldBills, setHeldBills] = useState<HeldBill[]>([]);
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [priceMode, setPriceMode] = useState<"retail" | "wholesale">("retail");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerQuery, setCustomerQuery] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [loyaltySettings, setLoyaltySettings] = useState<LoyaltySettings | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [cashReceived, setCashReceived] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [currentDateTime, setCurrentDateTime] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false);
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    async function loadProducts() {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("products")
        .select(productSelect)
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

  useEffect(() => {
    async function loadCustomers() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("customers")
          .select("id, member_code, full_name, phone, member_status, points_balance, is_active")
          .eq("is_active", true)
          .eq("member_status", "active")
          .order("full_name")
          .limit(300);

        if (error) return;
        setCustomers((data ?? []) as Customer[]);
      } catch {
        setCustomers([]);
      }
    }

    void loadCustomers();
  }, []);

  useEffect(() => {
    async function loadLoyaltySettings() {
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("loyalty_settings")
          .select("earn_amount, earn_points, is_active")
          .eq("id", 1)
          .maybeSingle();

        if (error || !data) return;
        setLoyaltySettings(data as LoyaltySettings);
      } catch {
        setLoyaltySettings(null);
      }
    }

    void loadLoyaltySettings();
  }, []);

  useEffect(() => {
    const updateClock = () => {
      setCurrentDateTime(
        new Intl.DateTimeFormat("th-TH", {
          dateStyle: "full",
          timeStyle: "medium",
        }).format(new Date()),
      );
    };

    updateClock();
    const timer = window.setInterval(updateClock, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    handleFullscreenChange();
    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const categories = useMemo(() => {
    const names = products
      .map((product) => product.product_categories?.name)
      .filter((name): name is string => Boolean(name));
    return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b, "th"));
  }, [products]);

  const visibleProducts = useMemo(
    () =>
      filterProducts(products, {
        activeCategory,
        query: deferredQuery,
      }) as Product[],
    [activeCategory, deferredQuery, products],
  );

  const visibleCustomers = useMemo(() => {
    const digits = customerQuery.replace(/\D/g, "");
    if (!digits) return customers.slice(0, 6);

    return customers
      .filter((customer) => (customer.phone ?? "").replace(/\D/g, "").includes(digits))
      .slice(0, 8);
  }, [customerQuery, customers]);

  const productLookup = useMemo(() => {
    const lookup = new Map<string, Product>();
    for (const product of products) {
      lookup.set(product.sku.toLowerCase(), product);
      if (product.barcode) lookup.set(product.barcode.toLowerCase(), product);
    }
    return lookup;
  }, [products]);

  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.qty * item.unitPrice, 0);
  }, [cart]);

  const payableTotal = Math.max(0, subtotal - discountAmount);
  const earnedPoints =
    selectedCustomer && loyaltySettings?.is_active
      ? Math.floor(payableTotal / Number(loyaltySettings.earn_amount || 1)) * Number(loyaltySettings.earn_points || 0)
      : 0;
  const changeAmount = paymentMethod === "cash" ? Math.max(0, cashReceived - payableTotal) : 0;
  const itemCount = cart.reduce((sum, item) => sum + item.qty, 0);

  function selectedPrice(product: Product) {
    if (priceMode === "wholesale" && Number(product.wholesale_price) > 0) {
      return Number(product.wholesale_price);
    }
    return Number(product.retail_price);
  }

  function applySoldStock(soldItems: SoldItem[]) {
    const soldQtyByProduct = new Map(soldItems.map((item) => [item.productId, item.qty]));

    setProducts((current) =>
      current.map((product) => {
        const soldQty = soldQtyByProduct.get(product.id);
        if (!soldQty) return product;

        return {
          ...product,
          stock_qty: Math.max(0, Number(product.stock_qty) - soldQty),
        };
      }),
    );
  }

  async function refreshSoldProducts(soldItems: SoldItem[]) {
    const soldIds = soldItems.map((item) => item.productId);
    if (!soldIds.length) return;

    const supabase = createClient();
    const { data } = await supabase
      .from("products")
      .select(productSelect)
      .in("id", soldIds);

    if (!data?.length) return;

    const refreshedById = new Map(
      ((data ?? []) as unknown as Product[]).map((product) => [product.id, product]),
    );

    setProducts((current) =>
      current.map((product) => refreshedById.get(product.id) ?? product),
    );
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

    const exact = productLookup.get(value);

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
    setSelectedCustomer(null);
    setCustomerQuery("");
    setCustomerName("");
    setReferenceNo("");
    setDiscountAmount(0);
    setCashReceived(0);
    setMessage("");
    searchRef.current?.focus();
  }

  function selectCustomer(customer: Customer) {
    setSelectedCustomer(customer);
    setCustomerName(customer.full_name);
    setCustomerQuery(customer.phone ?? "");
    setMessage("");
  }

  function clearCustomer() {
    setSelectedCustomer(null);
    setCustomerQuery("");
    setCustomerName("");
  }

  async function createMemberCode() {
    const datePart = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Bangkok",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .format(new Date())
      .replaceAll("-", "");
    const prefix = `CUS${datePart}`;
    const supabase = createClient();
    const { data } = await supabase
      .from("customers")
      .select("member_code")
      .ilike("member_code", `${prefix}%`)
      .order("member_code", { ascending: false })
      .limit(1)
      .maybeSingle();
    const latest = Number(data?.member_code?.slice(prefix.length)) || 0;
    return `${prefix}${String(latest + 1).padStart(4, "0")}`;
  }

  async function registerCustomer() {
    const phone = customerQuery.trim();
    const fullName = customerName.trim();
    if (!phone) {
      setMessage("กรุณากรอกเบอร์โทรลูกค้า");
      return;
    }
    if (!fullName) {
      setMessage("กรุณากรอกชื่อลูกค้าเพื่อสมัครสมาชิก");
      return;
    }

    setLoading(true);
    setMessage("");
    try {
      const supabase = createClient();
      const memberCode = await createMemberCode();
      const { data, error } = await supabase
        .from("customers")
        .insert({
          member_code: memberCode,
          full_name: fullName,
          phone,
          customer_type: "retail",
          member_status: "active",
          points_balance: 0,
          is_active: true,
          created_by: currentStaff.user_id,
        })
        .select("id, member_code, full_name, phone, member_status, points_balance, is_active")
        .single();

      if (error) throw error;
      const customer = data as Customer;
      setCustomers((current) => [customer, ...current]);
      selectCustomer(customer);
      setMessage(`สมัครสมาชิกแล้ว: ${customer.full_name}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "สมัครสมาชิกไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  async function awardMemberPoints(customer: Customer, saleNo: string, points: number) {
    if (points <= 0) return 0;

    const supabase = createClient();
    const { data, error } = await supabase.rpc("award_customer_points", {
      request_amount: payableTotal,
      request_customer_id: customer.id,
      request_points: points,
      request_reference_no: saleNo,
    });

    if (error) throw error;
    return Number(data ?? 0);
  }

  function salePayload(): PosSalePayload {
    return {
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
    };
  }

  const submitSaleOnline = useCallback(async (
    payload: PosSalePayload,
    pendingSale?: PendingSale,
    idempotencyKey?: string,
  ) => {
    const supabase = createClient();
    const { data, error } = await supabase.rpc("complete_pos_sale", {
      payload: {
        ...payload,
        idempotency_key: pendingSale?.offline_sale_id ?? idempotencyKey ?? crypto.randomUUID(),
        client_invoice_no: pendingSale?.client_invoice_no ?? null,
        offline_created_at: pendingSale?.offline_created_at ?? null,
      },
    });

    if (error) throw error;
    return data as string;
  }, []);

  const syncPendingSales = useCallback(async () => {
    if (!navigator.onLine || syncInProgressRef.current) return;

    syncInProgressRef.current = true;

    try {
      const pendingSales = await pendingSalesForSync();
      if (!pendingSales.length) {
        setPendingSyncCount(0);
        return;
      }

      for (const sale of pendingSales) {
        await updatePendingSale(sale.offline_sale_id, {
          sync_status: "syncing",
          sync_attempts: sale.sync_attempts + 1,
        });

        try {
          const saleNo = await submitSaleOnline(sale.payload, sale);
          await updatePendingSale(sale.offline_sale_id, {
            sync_status: "synced",
            server_sale_no: saleNo,
            synced_at: new Date().toISOString(),
            last_sync_error: undefined,
          });
        } catch (error) {
          await updatePendingSale(sale.offline_sale_id, {
            sync_status: "failed",
            last_sync_error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      setPendingSyncCount(await countPendingSales());
    } finally {
      syncInProgressRef.current = false;
    }
  }, [submitSaleOnline]);

  useEffect(() => {
    async function refreshPendingCount() {
      setPendingSyncCount(await countPendingSales());
    }

    function handleOnline() {
      setIsOnline(true);
      void syncPendingSales();
    }

    function handleOffline() {
      setIsOnline(false);
    }

    void refreshPendingCount();
    const syncTimer = window.setTimeout(() => {
      setIsOnline(navigator.onLine);
      if (navigator.onLine) void syncPendingSales();
    }, 0);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.clearTimeout(syncTimer);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [syncPendingSales]);

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
    setSelectedCustomer(null);
    setCustomerQuery("");
    setCustomerName(bill.customerName === "ลูกค้าหน้าร้าน" ? "" : bill.customerName);
    setHeldBills((current) => current.filter((item) => item.id !== bill.id));
    setMessage("");
  }

  async function toggleFullscreen() {
    if (document.fullscreenElement) {
      await document.exitFullscreen();
      return;
    }

    await pageRef.current?.requestFullscreen();
  }

  async function checkout() {
    if (!cart.length || loading) return;
    if (paymentMethod === "cash" && cashReceived < payableTotal) {
      setMessage("รับเงินสดน้อยกว่ายอดสุทธิ");
      return;
    }

    setLoading(true);
    setMessage("");
    const soldItems = cart.map((item) => ({
      productId: item.id,
      qty: item.qty,
    }));

    const payload = salePayload();
    const customerForSale = selectedCustomer;
    const pointsForSale = earnedPoints;

    if (!navigator.onLine) {
      const pendingSale = await addPendingSale(payload);
      checkoutIdempotencyKeyRef.current = null;
      setLoading(false);
      setPendingSyncCount(await countPendingSales());
      clearBill();
      applySoldStock(soldItems);
      setMessage(`บันทึก Offline แล้ว รอ Sync: ${pendingSale.client_invoice_no} / แต้มสมาชิกยังไม่ถูกบันทึก`);
      return;
    }

    try {
      checkoutIdempotencyKeyRef.current ??= crypto.randomUUID();
      const saleNo = await submitSaleOnline(payload, undefined, checkoutIdempotencyKeyRef.current);
      let pointMessage = "";
      if (customerForSale && pointsForSale > 0) {
        const nextBalance = await awardMemberPoints(customerForSale, saleNo, pointsForSale);
        pointMessage = ` / สะสม ${pointsForSale.toLocaleString("th-TH")} แต้ม รวม ${nextBalance.toLocaleString("th-TH")} แต้ม`;
      }
      checkoutIdempotencyKeyRef.current = null;
      setLoading(false);
      clearBill();
      applySoldStock(soldItems);
      setMessage(`บันทึกการขายสำเร็จ: ${saleNo}${pointMessage}`);
      await refreshSoldProducts(soldItems);
      await syncPendingSales();
    } catch (error) {
      setLoading(false);
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <AppShell>
      <main ref={pageRef} className="min-h-screen bg-slate-100 text-slate-950">
        <div className={`mx-auto flex w-full flex-col gap-2 p-2 ${isFullscreen ? "h-screen" : ""}`}>
          <div className="overflow-hidden rounded border border-slate-200 bg-white text-slate-950 shadow-sm">
            <div className={`flex flex-wrap items-center justify-between gap-3 px-3 py-2 ${isFullscreen ? "py-1" : ""}`}>
              <div className="flex items-center gap-3">
                <div className="grid size-11 place-items-center rounded-sm bg-emerald-700 text-white shadow-sm">
                  <ShoppingCart size={23} />
                </div>
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                    Hardware POS
                  </div>
                  <h1 className={`text-lg font-semibold leading-tight ${isFullscreen ? "text-base" : ""}`}>แคชเชียร์ร้านวัสดุก่อสร้าง</h1>
                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                    <CalendarClock size={14} />
                    <span>{currentDateTime || "-"}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-sm">
                <div
                  className={`inline-flex h-9 items-center gap-2 rounded border px-3 font-medium ${
                    isOnline
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-amber-200 bg-amber-50 text-amber-900"
                  }`}
                >
                  {isOnline ? "Online" : "Offline"}
                  {pendingSyncCount ? `· รอ Sync ${pendingSyncCount}` : ""}
                </div>
                <Link
                  href="/dashboard"
                  className="inline-flex h-9 items-center gap-2 rounded border border-slate-300 bg-white px-3 font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Boxes size={16} />
                  Reports
                </Link>
                <button
                  type="button"
                  onClick={clearBill}
                  className="inline-flex h-9 items-center gap-2 rounded border border-slate-300 bg-white px-3 font-medium text-slate-700 hover:bg-slate-50"
                >
                  <RotateCcw size={16} />
                  Clear Sales
                </button>
                <button
                  type="button"
                  onClick={() => void toggleFullscreen()}
                  className="inline-flex h-9 items-center gap-2 rounded border border-slate-300 bg-white px-3 font-medium text-slate-700 hover:bg-slate-50"
                >
                  {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                  {isFullscreen ? "Exit Full" : "Full Screen"}
                </button>
              </div>
            </div>
          </div>

          <div className={`grid gap-2 xl:grid-cols-[minmax(0,1fr)_420px] 2xl:grid-cols-[minmax(0,1fr)_460px] ${isFullscreen ? "flex-1 min-h-0" : ""}`}>
            <section className="overflow-hidden rounded border border-slate-200 bg-white shadow-[0_6px_18px_rgba(0,0,0,0.08)]">
              <div className="border-b border-slate-200 bg-white px-3 py-2">
                <div className="flex flex-wrap items-center gap-2">
                  <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded border border-slate-300 bg-white px-3 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100">
                    <Search size={18} className="text-slate-400" />
                    <input
                      ref={searchRef}
                      className="w-full bg-transparent outline-none"
                      placeholder="Scan / Swipe หรือค้นหาสินค้า, SKU, บาร์โค้ด"
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.preventDefault();
                          scanOrSearch();
                        }
                      }}
                    />
                    <Barcode size={18} className="text-slate-400" />
                  </label>

                  <div className="grid grid-cols-2 rounded border border-slate-300 bg-slate-50 p-1">
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

                <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                  <button
                    type="button"
                    onClick={() => setActiveCategory("all")}
                    className={`h-9 shrink-0 rounded px-3 text-sm font-medium ${
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
                      className={`h-9 shrink-0 rounded px-3 text-sm font-medium ${
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

              {visibleProducts.length >= MAX_VISIBLE_PRODUCTS ? (
                <div className="border-b border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                  แสดงสูงสุด {MAX_VISIBLE_PRODUCTS.toLocaleString("th-TH")} รายการ ปรับคำค้นหาเพื่อเจอสินค้าเร็วขึ้น
                </div>
              ) : null}

              <div className={`p-2 ${isFullscreen ? "flex-1 min-h-0 overflow-y-auto" : ""}`}>
                <div className="grid gap-1 grid-cols-[repeat(auto-fill,minmax(170px,1fr))] 2xl:grid-cols-[repeat(auto-fill,minmax(190px,1fr))]">
                  {visibleProducts.map((product) => {
                    const unitPrice = selectedPrice(product);
                    const lowStock = Number(product.stock_qty) <= 0;

                    return (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => addToCart(product)}
                        disabled={lowStock}
                        className={`group flex min-h-33 flex-col overflow-hidden rounded border text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                          lowStock ? "border-slate-200 bg-white" : "border-slate-200 bg-white hover:border-emerald-400 hover:bg-emerald-50"
                        }`}
                      >
                        <div className="grid h-16 place-items-center bg-slate-100 text-slate-600">
                          {product.image_url ? (
                            <div
                              className="h-full w-full bg-cover bg-center"
                              style={{ backgroundImage: `url("${product.image_url}")` }}
                              aria-label={product.name}
                            />
                          ) : (
                            <div className="grid size-10 place-items-center rounded bg-white text-xs font-semibold text-emerald-800 shadow-sm">
                              {productInitials(product.name)}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-1 flex-col justify-between px-2 py-2">
                          <div className="space-y-0.5">
                            <div className="text-[11px] font-medium text-slate-500">{product.sku}</div>
                            <div className="line-clamp-2 text-xs font-semibold leading-tight text-slate-900">
                              {product.name}
                            </div>
                          </div>

                          <div className="mt-2 flex items-end justify-between gap-2 text-[11px] text-slate-600">
                            <div>
                              <div>{product.product_categories?.name ?? "วัสดุก่อสร้าง"}</div>
                              <div className="font-medium text-slate-800">{money(unitPrice)}</div>
                            </div>
                            <div className="text-right">
                              <div>คงเหลือ</div>
                              <div className="font-semibold text-slate-800">{quantity(Number(product.stock_qty))}</div>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>

            <aside className={`overflow-hidden rounded border border-slate-200 bg-white shadow-[0_6px_18px_rgba(0,0,0,0.08)] ${isFullscreen ? "flex h-full min-h-0 flex-col" : ""}`}>
              <div className={`border-b border-slate-200 bg-white px-3 py-2 ${isFullscreen ? "py-1" : ""}`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold">บิลขาย</h2>
                    <p className="text-xs text-slate-600">
                      {cart.length} รายการ · {quantity(itemCount)} ชิ้น
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={holdBill}
                    disabled={!cart.length}
                    className="inline-flex h-9 items-center gap-2 rounded border border-slate-300 bg-white px-3 text-sm font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Pause size={16} />
                    พักบิล
                  </button>
                </div>

                <div className="mt-3 grid gap-2">
                  <label className="flex h-10 items-center gap-2 rounded border border-slate-300 bg-white px-3">
                    <UserRound size={16} className="text-slate-400" />
                    <input
                      className="w-full bg-transparent text-sm outline-none"
                      placeholder="ค้นลูกค้าด้วยเบอร์โทร"
                      value={customerQuery}
                      onChange={(event) => {
                        setCustomerQuery(event.target.value);
                        setSelectedCustomer(null);
                        setCustomerName("");
                      }}
                    />
                  </label>
                  {selectedCustomer ? (
                    <div className="flex items-center justify-between gap-2 rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">
                      <div className="min-w-0">
                        <div className="truncate font-semibold">{selectedCustomer.full_name}</div>
                        <div className="text-xs">
                          {selectedCustomer.phone ?? "-"} / {selectedCustomer.points_balance.toLocaleString("th-TH")} แต้ม
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={clearCustomer}
                        className="shrink-0 rounded border border-emerald-200 bg-white px-2 py-1 text-xs font-medium text-emerald-800"
                      >
                        ล้าง
                      </button>
                    </div>
                  ) : customerQuery ? (
                    <div className="max-h-36 overflow-y-auto rounded border border-slate-200 bg-white">
                      {visibleCustomers.length ? (
                        visibleCustomers.map((customer) => (
                          <button
                            key={customer.id}
                            type="button"
                            onClick={() => selectCustomer(customer)}
                            className="flex w-full items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 text-left text-sm last:border-b-0 hover:bg-slate-50"
                          >
                            <span className="min-w-0">
                              <span className="block truncate font-medium">{customer.full_name}</span>
                              <span className="block text-xs text-slate-500">
                                {customer.phone ?? "-"} / {customer.member_code}
                              </span>
                            </span>
                            <span className="shrink-0 rounded bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                              เลือก
                            </span>
                          </button>
                        ))
                      ) : (
                        <div className="space-y-2 px-3 py-3">
                          <div className="text-sm font-medium text-slate-700">ไม่พบเบอร์นี้ สมัครสมาชิกด่วน</div>
                          <input
                            className="h-9 w-full rounded border border-slate-300 px-3 text-sm outline-none focus:border-emerald-500"
                            placeholder="ชื่อลูกค้า"
                            value={customerName}
                            onChange={(event) => setCustomerName(event.target.value)}
                          />
                          <button
                            type="button"
                            onClick={() => void registerCustomer()}
                            disabled={loading}
                            className="h-9 w-full rounded bg-emerald-700 text-sm font-medium text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                          >
                            สมัครสมาชิก
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500">พิมพ์เบอร์แล้วกดเลือกลูกค้า</div>
                  )}
                  <label className="flex h-10 items-center gap-2 rounded border border-slate-300 bg-white px-3">
                    <ReceiptText size={16} className="text-slate-400" />
                    <input
                      className="w-full bg-transparent text-sm outline-none"
                      placeholder="เลขอ้างอิง / ใบเสนอราคา"
                      value={referenceNo}
                      onChange={(event) => setReferenceNo(event.target.value)}
                    />
                  </label>
                </div>
              </div>

              <div className={`max-h-[calc(100vh-465px)] min-h-64 overflow-y-auto p-3 ${isFullscreen ? "flex-1 min-h-0" : ""}`}>
                {cart.length ? (
                  <div className="space-y-2">
                    {cart.map((item) => (
                      <div key={item.id} className="rounded border border-slate-200 bg-white p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate font-medium">{item.name}</div>
                            <div className="text-sm text-slate-500">
                              {item.sku} · {item.units?.short_name ?? "หน่วย"}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                            aria-label="ลบสินค้า"
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>

                        <div className="mt-3 grid grid-cols-[122px_1fr] gap-2">
                          <div className="flex h-10 items-center rounded border border-slate-300 bg-white">
                            <button
                              type="button"
                              className="grid size-10 place-items-center"
                              onClick={() => updateQty(item.id, item.qty - 1)}
                              aria-label="ลดจำนวน"
                            >
                              <Minus size={16} />
                            </button>
                            <input
                              className="h-full w-10 border-x border-slate-300 bg-white text-center text-sm font-medium outline-none"
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

                          <label className="flex h-10 items-center rounded border border-slate-300 bg-white px-3 text-sm">
                            <span className="shrink-0 text-slate-500">ราคา</span>
                            <input
                              className="min-w-0 flex-1 bg-transparent text-right outline-none"
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.unitPrice}
                              onChange={(event) => updatePrice(item.id, Number(event.target.value))}
                            />
                          </label>
                        </div>

                        <div className="mt-2 text-right text-sm font-semibold">
                          {money(item.qty * item.unitPrice)} บาท
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid h-64 place-items-center rounded border border-dashed border-slate-300 bg-white text-center text-sm text-slate-500">
                    <div>
                      <ShoppingCart className="mx-auto mb-3 text-slate-300" size={32} />
                      ยังไม่มีสินค้าในบิล
                    </div>
                  </div>
                )}
              </div>

              {heldBills.length ? (
                <div className="border-t border-slate-200 px-3 py-2">
                  <div className="mb-2 text-sm font-medium">บิลที่พักไว้</div>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {heldBills.map((bill) => (
                      <button
                        key={bill.id}
                        type="button"
                        onClick={() => restoreHeldBill(bill)}
                        className="shrink-0 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-left text-xs text-amber-900 hover:bg-amber-100"
                      >
                        <div className="font-semibold">{bill.customerName}</div>
                        <div>{bill.items.length} รายการ</div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className={`border-t border-slate-200 bg-slate-50 px-3 py-3 ${isFullscreen ? "mt-auto" : ""}`}>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-sm font-medium">
                    ส่วนลด
                    <input
                      className="mt-1 h-10 w-full rounded border border-slate-300 bg-white px-3 text-right outline-none"
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
                      className="mt-1 h-10 w-full rounded border border-slate-300 bg-white px-3 text-right outline-none"
                      type="number"
                      min="0"
                      step="0.01"
                      value={cashReceived}
                      onChange={(event) => setCashReceived(Math.max(0, Number(event.target.value)))}
                    />
                  </label>
                </div>

                <div className="mt-3 grid grid-cols-5 gap-1">
                  {quickCash.map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => setCashReceived(amount)}
                      className="h-9 rounded border border-slate-300 bg-white text-xs font-medium hover:bg-slate-50"
                    >
                      {amount.toLocaleString("th-TH")}
                    </button>
                  ))}
                </div>

                <div className="mt-3 grid grid-cols-4 gap-2">
                  {paymentOptions.map((option) => {
                    const Icon = option.icon;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setPaymentMethod(option.value)}
                        className={`flex h-10 items-center justify-center gap-1 rounded border text-sm font-medium ${
                          paymentMethod === option.value
                            ? "border-emerald-700 bg-emerald-50 text-emerald-800"
                            : "border-slate-300 bg-white text-slate-600"
                        }`}
                      >
                        <Icon size={15} />
                        {option.label}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-3 space-y-2 rounded border border-slate-200 bg-white p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">รวมสินค้า</span>
                    <span>{money(subtotal)} บาท</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">ส่วนลด</span>
                    <span>{money(discountAmount)} บาท</span>
                  </div>
                  {selectedCustomer ? (
                    <div className="flex items-center justify-between text-emerald-800">
                      <span>สมาชิก</span>
                      <span>
                        {selectedCustomer.full_name} / +{earnedPoints.toLocaleString("th-TH")} แต้ม
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-slate-500">
                      <span>สมาชิก</span>
                      <span>ไม่ได้เลือก</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between text-lg font-semibold">
                    <span>ยอดสุทธิ</span>
                    <span>{money(payableTotal)} บาท</span>
                  </div>
                  <div className="flex items-center justify-between text-emerald-800">
                    <span>เงินทอน</span>
                    <span>{money(changeAmount)} บาท</span>
                  </div>
                </div>

                {message ? <p className="mt-2 text-sm text-slate-600">{message}</p> : null}

                <button
                  type="button"
                  onClick={checkout}
                  disabled={!cart.length || loading}
                  className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded bg-slate-950 font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? <Calculator size={18} /> : <Save size={18} />}
                  {loading ? "กำลังบันทึก..." : "ชำระเงินและบันทึกบิล"}
                </button>
              </div>
            </aside>
          </div>
        </div>
      </main>
    </AppShell>
  );
}
