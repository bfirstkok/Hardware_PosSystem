"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  BadgePercent,
  Banknote,
  Barcode,
  Boxes,
  Building2,
  ChevronDown,
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

const sidebarAccent = {
  groupActive: "border-slate-900 bg-slate-900 text-white shadow-sm",
  hover: "hover:border-slate-300 hover:bg-slate-200 hover:text-slate-950",
  ring: "focus-visible:ring-slate-500",
};

const navGroups = [
  {
    label: "หน้าร้าน",
    accent: sidebarAccent,
    items: [{ href: "/pos", label: "แคชเชียร์", icon: ShoppingCart }],
  },
  {
    label: "เอกสาร / รายงาน",
    accent: sidebarAccent,
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
    accent: sidebarAccent,
    items: [
      { href: "/stock", label: "สต๊อก", icon: Boxes },
      { href: "/products", label: "เพิ่มสินค้า", icon: Package },
      { href: "/barcodes", label: "บาร์โค้ด", icon: Barcode },
      { href: "/expiry", label: "วันหมดอายุ", icon: ScanLine },
    ],
  },
  {
    label: "โปรโมชั่น",
    accent: sidebarAccent,
    items: [
      { href: "/promotions", label: "โปรโมชั่น", icon: Gift },
      { href: "/discounts", label: "ส่วนลด", icon: BadgePercent },
    ],
  },
  {
    label: "CRM",
    accent: sidebarAccent,
    items: [
      { href: "/customers", label: "ลูกค้า", icon: UserRound },
      { href: "/points", label: "แลกสะสมแต้ม", icon: Gift },
      { href: "/points-settings", label: "ตั้งค่าสะสมแต้ม", icon: Settings2 },
    ],
  },
  {
    label: "บริหาร",
    accent: sidebarAccent,
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

function LinkPendingIndicator() {
  const { pending } = useLinkStatus();

  return (
    <span
      aria-hidden="true"
      className={`ml-auto size-2 shrink-0 rounded-full bg-current transition-opacity ${
        pending ? "animate-pulse opacity-70" : "opacity-0"
      }`}
    />
  );
}

function Sidebar({ sidebarRef }: { sidebarRef: React.RefObject<HTMLElement | null> }) {
  const pathname = usePathname();
  const activeGroupLabel = useMemo(
    () => navGroups.find((group) => group.items.some((item) => item.href === pathname))?.label,
    [pathname]
  );
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [selectedGroupLabel, setSelectedGroupLabel] = useState<string | null>(null);

  const toggleGroup = (label: string) => {
    setSelectedGroupLabel(label);
    setOpenGroups((current) => ({
      ...current,
      [label]: !current[label],
    }));
  };

  const handleNavClick = (groupLabel: string) => {
    setSelectedGroupLabel(groupLabel);
    setOpenGroups((current) => ({
      ...current,
      ...(activeGroupLabel ? { [activeGroupLabel]: true } : {}),
      [groupLabel]: true,
    }));
  };

  return (
    <nav ref={sidebarRef} className="h-[calc(100vh-4rem)] space-y-5 overflow-y-auto px-3 py-4" data-testid="sidebar-nav">
      {navGroups.map((group, index) => {
        const hasActiveItem = group.label === activeGroupLabel;
        const selected = group.label === (selectedGroupLabel ?? activeGroupLabel);
        const open = openGroups[group.label] ?? hasActiveItem;
        const panelId = `sidebar-group-${index}`;

        return (
          <div key={group.label}>
            <button
              type="button"
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => toggleGroup(group.label)}
              className={`flex min-h-9 w-full items-center justify-between rounded-md border px-3 text-left text-xs font-semibold uppercase tracking-wide outline-none transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 ${
                selected
                  ? group.accent.groupActive
                  : `border-transparent bg-slate-50 text-slate-600 ${group.accent.hover}`
              } ${group.accent.ring}`}
            >
              <span className="truncate">{group.label}</span>
              <ChevronDown
                size={15}
                className={`shrink-0 transition-transform ${open ? "rotate-0" : "-rotate-90"}`}
                aria-hidden="true"
              />
            </button>
            {open ? (
              <div id={panelId} className="mt-2 space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => handleNavClick(group.label)}
                      className={`flex min-h-10 items-center gap-3 rounded-md border border-transparent px-3 py-2 text-sm font-medium text-slate-700 outline-none transition-colors hover:border-slate-200 hover:bg-slate-100 hover:text-slate-950 focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.99] ${group.accent.ring}`}
                      aria-current={active ? "page" : undefined}
                    >
                      <Icon size={18} className="text-slate-500" />
                      <span className="truncate">{item.label}</span>
                      <LinkPendingIndicator />
                    </Link>
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const sidebarRef = useRef<HTMLElement>(null);

  // บันทึก scroll position ของ sidebar เมื่อ scroll
  useLayoutEffect(() => {
    const sidebar = sidebarRef.current;
    if (!sidebar) return;

    const handleScroll = () => {
      sessionStorage.setItem("sidebar-scroll", sidebar.scrollTop.toString());
    };

    sidebar.addEventListener("scroll", handleScroll);
    return () => sidebar.removeEventListener("scroll", handleScroll);
  }, []);

  // Restore scroll position เมื่อ component mount
  useLayoutEffect(() => {
    const sidebar = sidebarRef.current;
    if (!sidebar) return;

    const stored = sessionStorage.getItem("sidebar-scroll");
    if (stored) {
      sidebar.scrollTop = parseInt(stored, 10);
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white lg:block">
        <div className="flex h-16 items-center gap-3 border-b border-slate-200 bg-slate-100 px-5">
          <div className="flex size-10 items-center justify-center rounded-md bg-slate-900 text-white">
            <ClipboardList size={23} />
          </div>
          <div>
            <div className="font-semibold text-slate-950">Hardware POS</div>
            <div className="text-xs text-slate-600">ระบบร้านวัสดุก่อสร้าง</div>
          </div>
        </div>
        <Sidebar sidebarRef={sidebarRef} />
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 flex min-h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:px-6">
          <div>
            <div className="font-semibold">ระบบร้านวัสดุก่อสร้าง</div>
            <div className="text-xs text-slate-500">จัดการหน้าร้าน เอกสาร สต๊อก ลูกค้า และบริหาร</div>
          </div>
          <Link
            href="/pos"
            className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-900 px-3 text-sm font-medium text-white outline-none transition-colors hover:bg-slate-700 focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 active:scale-[0.99]"
          >
            <ShoppingCart size={17} />
            เปิดหน้าขาย
            <LinkPendingIndicator />
          </Link>
        </header>
        {children}
      </div>
    </div>
  );
}
