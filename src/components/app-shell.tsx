"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BadgePercent,
  Banknote,
  Barcode,
  Boxes,
  Building2,
  ClipboardList,
  FileBarChart,
  FileText,
  Gift,
  History,
  LayoutDashboard,
  MonitorPlay,
  Package,
  ReceiptText,
  ScanLine,
  Settings2,
  ShoppingCart,
  Store,
  TabletSmartphone,
  Truck,
  UserRound,
  UsersRound,
} from "lucide-react";

const navGroups = [
  {
    label: "หน้าร้าน",
    items: [{ href: "/pos", label: "แคชเชียร์", icon: ShoppingCart }],
  },
  {
    label: "เอกสาร / รายงาน",
    items: [
      { href: "/dashboard", label: "แดชบอร์ด", icon: LayoutDashboard },
      { href: "/reports", label: "รายงาน", icon: FileBarChart },
      { href: "/documents", label: "เอกสาร", icon: FileText },
      { href: "/sales-history", label: "ประวัติขาย", icon: ReceiptText },
      { href: "/product-history", label: "ประวัติสินค้า", icon: History },
      { href: "/expenses", label: "ค่าใช้จ่าย", icon: Banknote },
    ],
  },
  {
    label: "สินค้า / สโตร์",
    items: [
      { href: "/stock", label: "สต๊อก", icon: Boxes },
      { href: "/products", label: "เพิ่มสินค้า", icon: Package },
      { href: "/barcodes", label: "บาร์โค้ด", icon: Barcode },
      { href: "/expiry", label: "วันหมดอายุ", icon: ScanLine },
    ],
  },
  {
    label: "โปรโมชั่น",
    items: [
      { href: "/promotions", label: "โปรโมชั่น", icon: Gift },
      { href: "/discounts", label: "ส่วนลด", icon: BadgePercent },
    ],
  },
  {
    label: "CRM",
    items: [
      { href: "/customers", label: "ลูกค้า", icon: UserRound },
      { href: "/points", label: "แลกสะสมแต้ม", icon: Gift },
      { href: "/points-settings", label: "ตั้งค่าสะสมแต้ม", icon: Settings2 },
    ],
  },
  {
    label: "บริหาร",
    items: [
      { href: "/branches", label: "สาขา", icon: Building2 },
      { href: "/employees", label: "พนักงาน", icon: UsersRound },
      { href: "/suppliers", label: "ผู้ผลิต", icon: Truck },
      { href: "/pos-devices", label: "เครื่อง POS", icon: TabletSmartphone },
      { href: "/activities", label: "กิจกรรม", icon: Activity },
      { href: "/table-monitor", label: "มอนิเตอร์โต๊ะ", icon: MonitorPlay },
      { href: "/devices", label: "อุปกรณ์ที่เข้าสู่ระบบ", icon: Store },
    ],
  },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-slate-200 bg-white lg:block">
        <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-5">
          <ClipboardList className="text-emerald-700" size={24} />
          <div>
            <div className="font-semibold">Hardware POS</div>
            <div className="text-xs text-slate-500">ระบบร้านวัสดุก่อสร้าง</div>
          </div>
        </div>
        <nav className="h-[calc(100vh-4rem)] space-y-5 overflow-y-auto px-3 py-4">
          {navGroups.map((group) => (
            <div key={group.label}>
              <div className="px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                {group.label}
              </div>
              <div className="mt-2 space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`flex min-h-10 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium ${
                        active
                          ? "bg-emerald-50 text-emerald-800"
                          : "text-slate-700 hover:bg-slate-100 hover:text-slate-950"
                      }`}
                    >
                      <Icon size={18} />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>
      <div className="lg:pl-72">
        <header className="sticky top-0 z-10 flex min-h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:px-6">
          <div>
            <div className="font-semibold">ระบบร้านวัสดุก่อสร้าง</div>
            <div className="text-xs text-slate-500">จัดการหน้าร้าน เอกสาร สต๊อก ลูกค้า และบริหาร</div>
          </div>
          <Link
            href="/pos"
            className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-medium text-white hover:bg-slate-800"
          >
            <ShoppingCart size={17} />
            เปิดหน้าขาย
          </Link>
        </header>
        {children}
      </div>
    </div>
  );
}
