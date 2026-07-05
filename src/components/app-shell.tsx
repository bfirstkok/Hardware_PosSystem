"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  BadgePercent,
  Barcode,
  Boxes,
  ChevronDown,
  ClipboardList,
  FileBarChart,
  Gift,
  History,
  LayoutDashboard,
  Package,
  ReceiptText,
  ShoppingCart,
  Store,
  UserRound,
  UsersRound,
  LogOut,
} from "lucide-react";
import { checkDeviceAccess } from "@/lib/device-access-actions";
import { canAccessRoute, type StaffRole } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/client";
import type { CurrentStaff } from "@/lib/staff-session";

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
      { href: "/sales-history", label: "ประวัติขาย", icon: ReceiptText },
      { href: "/product-history", label: "ประวัติสินค้า", icon: History },
    ],
  },
  {
    label: "สินค้า / สโตร์",
    accent: sidebarAccent,
    items: [
      { href: "/stock", label: "สต๊อก", icon: Boxes },
      { href: "/products", label: "เพิ่มสินค้า", icon: Package },
      { href: "/barcodes", label: "บาร์โค้ด", icon: Barcode },
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
    label: "บริหาร",
    accent: sidebarAccent,
    items: [
      { href: "/employees", label: "พนักงาน", icon: UsersRound },
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

function Sidebar({
  sidebarRef,
  role,
}: {
  sidebarRef: React.RefObject<HTMLElement | null>;
  role: StaffRole | null;
}) {
  const pathname = usePathname();
  const visibleRole = role ?? "cashier";
  const visibleGroups = useMemo(
    () =>
      navGroups
        .map((group) => ({
          ...group,
          items: group.items.filter((item) => canAccessRoute(visibleRole, item.href)),
        }))
        .filter((group) => group.items.length > 0),
    [visibleRole]
  );
  const activeGroupLabel = useMemo(
    () => visibleGroups.find((group) => group.items.some((item) => item.href === pathname))?.label,
    [pathname, visibleGroups]
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
      {visibleGroups.map((group, index) => {
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

export function AppShell({
  children,
  currentStaff,
}: {
  children: React.ReactNode;
  currentStaff?: CurrentStaff | null;
}) {
  const sidebarRef = useRef<HTMLElement>(null);
  const router = useRouter();
  const [accessMessage, setAccessMessage] = useState("");
  const [staff, setStaff] = useState<CurrentStaff | null>(currentStaff ?? null);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

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

  useEffect(() => {
    let cancelled = false;

    async function verifyDeviceAccess() {
      const deviceKey = localStorage.getItem("hardware-pos-current-device-id");
      if (!deviceKey) return;

      // ponytail: เช็คซ้ำทุก 5 นาทีพอ (เดิมยิง server ทุกครั้งที่เปลี่ยนหน้า) —
      // การ block/revoke เครื่องจะมีผลช้าสุด 5 นาที ถ้าต้อง realtime ค่อยเปลี่ยนเป็น supabase realtime
      const DEVICE_CHECK_TTL_MS = 5 * 60 * 1000;
      const lastChecked = Number(sessionStorage.getItem("device-access-checked-at") ?? 0);
      if (Date.now() - lastChecked < DEVICE_CHECK_TTL_MS) return;

      let result;
      try {
        result = await checkDeviceAccess(deviceKey);
      } catch {
        return;
      }
      if (result.allowed) {
        sessionStorage.setItem("device-access-checked-at", Date.now().toString());
      }
      if (cancelled || result.allowed) return;

      setAccessMessage(result.message);
      const supabase = createClient();
      await supabase.auth.signOut();
      router.replace(`/login?device=${encodeURIComponent(result.reason)}`);
      router.refresh();
    }

    verifyDeviceAccess();

    return () => {
      cancelled = true;
    };
  }, [router]);

  useEffect(() => {
    if (currentStaff) return;

    let cancelled = false;

    async function loadStaff() {
      const supabase = createClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data } = await supabase
        .from("staff_profiles")
        .select("*")
        .eq("user_id", userData.user.id)
        .maybeSingle();

      if (!cancelled && data?.account_status === "active") {
        setStaff({
          ...data,
          email: data.auth_email,
          branch_name: null,
          permission_overrides: data.permission_overrides ?? {},
        } as CurrentStaff);
      }
    }

    loadStaff().catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [currentStaff]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      {accessMessage ? (
        <div className="fixed inset-x-0 top-0 z-50 border-b border-red-200 bg-red-50 px-4 py-3 text-center text-sm font-medium text-red-700">
          {accessMessage} กำลังออกจากระบบ
        </div>
      ) : null}
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
        <Sidebar sidebarRef={sidebarRef} role={staff?.role ?? null} />
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 flex min-h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:px-6">
          <div>
            <div className="font-semibold">ระบบร้านวัสดุก่อสร้าง</div>
            <div className="text-xs text-slate-500">จัดการหน้าร้าน เอกสาร สต๊อก ลูกค้า และบริหาร</div>
          </div>
          <div className="flex items-center gap-2">
            {staff ? (
              <Link
                href="/me"
                className="hidden min-h-10 items-center gap-2 rounded-md border border-slate-200 px-3 text-left text-sm hover:bg-slate-50 md:flex"
              >
                <UserRound size={17} className="text-slate-500" />
                <span>
                  <span className="block max-w-36 truncate font-medium">{staff.display_name}</span>
                  <span className="block text-xs uppercase text-slate-500">{staff.role}</span>
                </span>
                <LinkPendingIndicator />
              </Link>
            ) : null}
            <Link
              href="/pos"
              className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-900 px-3 text-sm font-medium text-white outline-none transition-colors hover:bg-slate-700 focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 active:scale-[0.99]"
            >
              <ShoppingCart size={17} />
              เปิดหน้าขาย
              <LinkPendingIndicator />
            </Link>
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex size-10 items-center justify-center rounded-md border border-slate-200 text-slate-600 outline-none transition-colors hover:bg-slate-50 hover:text-slate-950 focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2"
              aria-label="ออกจากระบบ"
              title="ออกจากระบบ"
            >
              <LogOut size={17} />
            </button>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
