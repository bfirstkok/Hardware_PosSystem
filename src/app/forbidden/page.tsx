import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { getCurrentStaff, getStaffHomePath } from "@/lib/staff-session";

export default async function ForbiddenPage() {
  const staff = await getCurrentStaff();
  const homePath = getStaffHomePath(staff);

  return (
    <AppShell currentStaff={staff}>
      <main className="grid min-h-[calc(100vh-4rem)] place-items-center p-4 lg:p-6">
        <section className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
          <div className="mx-auto grid size-12 place-items-center rounded-md bg-red-50 text-red-700">
            <ShieldAlert size={24} />
          </div>
          <h1 className="mt-4 text-xl font-semibold">ไม่มีสิทธิ์เข้าถึง</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            บัญชีนี้ยังไม่ได้รับสิทธิ์สำหรับหน้านี้ กลับไปหน้าหลักตามบทบาทของคุณ
          </p>
          <Link
            href={homePath}
            className="mt-5 inline-flex h-10 items-center justify-center rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-700"
          >
            กลับหน้าหลัก
          </Link>
        </section>
      </main>
    </AppShell>
  );
}
