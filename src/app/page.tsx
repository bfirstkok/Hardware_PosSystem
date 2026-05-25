import Link from "next/link";
import { Boxes, LayoutDashboard, ShoppingCart } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col justify-center px-6 py-10">
        <div className="max-w-3xl">
          <p className="text-sm font-medium uppercase tracking-[0.18em] text-emerald-700">
            Hardware POS
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight md:text-6xl">
            ระบบขายหน้าร้านสำหรับร้านฮาร์ดแวร์และวัสดุก่อสร้าง
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
            Next.js + Supabase สำหรับขายสินค้า ตัดสต็อก ดูรายการสินค้า
            และต่อยอดเป็นระบบส่งของ ลูกหนี้ และรายงานเจ้าของร้านได้
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/pos"
            className="inline-flex h-11 items-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-medium text-white hover:bg-slate-800"
          >
            <ShoppingCart size={18} />
            เข้าสู่ระบบ POS
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex h-11 items-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-medium hover:bg-white"
          >
            <LayoutDashboard size={18} />
            Dashboard
          </Link>
        </div>

        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {[
            ["ขายเร็ว", "ค้นหาสินค้า เพิ่มเข้าบิล และปิดการขายได้จากหน้า POS"],
            ["สต็อกชัด", "ตัดสต็อกผ่าน transaction พร้อมบันทึกประวัติการเคลื่อนไหว"],
            ["โตต่อได้", "เพิ่มลูกค้า ส่งของ เครดิต และรายงานได้บน Supabase"],
          ].map(([title, description]) => (
            <div key={title} className="rounded-lg border border-slate-200 bg-white p-5">
              <Boxes className="text-emerald-700" size={22} />
              <h2 className="mt-4 font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
