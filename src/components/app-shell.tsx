import Link from "next/link";
import { Boxes, ClipboardList, LayoutDashboard, Package, ShoppingCart } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pos", label: "POS", icon: ShoppingCart },
  { href: "/products", label: "Products", icon: Package },
  { href: "/stock", label: "Stock", icon: Boxes },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white lg:block">
        <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-5">
          <ClipboardList className="text-emerald-700" size={24} />
          <div>
            <div className="font-semibold">Hardware POS</div>
            <div className="text-xs text-slate-500">Cloud store system</div>
          </div>
        </div>
        <nav className="space-y-1 p-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-950"
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-6">
          <div className="font-semibold">ระบบร้านวัสดุก่อสร้าง</div>
          <Link
            href="/pos"
            className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-medium text-white hover:bg-slate-800"
          >
            <ShoppingCart size={17} />
            เปิดหน้า POS
          </Link>
        </header>
        {children}
      </div>
    </div>
  );
}
