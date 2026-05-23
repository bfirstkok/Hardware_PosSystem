import { BadgeCheck, Building2, Clock, KeyRound, ListFilter, ShieldCheck, UsersRound } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { requireRouteAccess } from "@/lib/staff-session";
import { createClient } from "@/lib/supabase/server";
import { createEmployeeAction } from "./actions";

const tabs = [
  { label: "รายชื่อ", icon: UsersRound },
  { label: "คำเชิญ", icon: Clock },
  { label: "บทบาท/สิทธิ์", icon: ShieldCheck },
  { label: "สาขา", icon: Building2 },
  { label: "กิจกรรม", icon: ListFilter },
  { label: "Login/session", icon: KeyRound },
];

const rolePreview = [
  ["cashier", "หน้าร้าน, ดูสินค้า/stock, ประวัติขายตัวเอง, stock basic"],
  ["manager", "จัดการสินค้า, รายงาน/export ตามสาขา, จัดการ cashier"],
  ["owner", "ทุกเมนู ทุกสาขา จัดการ staff ทุก role"],
];

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; created?: string }>;
}) {
  const notice = await searchParams;
  const staff = await requireRouteAccess("/employees");
  const supabase = await createClient();
  const { data: employees, error } = await supabase
    .from("staff_profiles")
    .select("user_id, employee_code, display_name, phone, job_title, role, account_status, employment_status, branches:primary_branch_id(name)")
    .order("employee_code");
  const employeeRows =
    employees?.map((employee) => {
      const branch = Array.isArray(employee.branches) ? employee.branches[0] : employee.branches;

      return {
        ...employee,
        branchName: branch?.name ?? "สาขาหลัก",
      };
    }) ?? [];

  return (
    <AppShell currentStaff={staff}>
      <main className="p-4 lg:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500">บริหาร</p>
            <h1 className="mt-1 text-2xl font-semibold">พนักงาน</h1>
          </div>
        </div>

        {notice.error ? (
          <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {notice.error}
          </div>
        ) : null}
        {notice.created ? (
          <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            เพิ่มพนักงานสำเร็จ: {notice.created}
          </div>
        ) : null}

        <section className="mt-6 rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="flex gap-2 overflow-x-auto border-b border-slate-200 p-3">
            {tabs.map((tab) => {
              const Icon = tab.icon;

              return (
                <button
                  key={tab.label}
                  className="inline-flex h-10 shrink-0 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="grid gap-4 p-5 xl:grid-cols-[1.4fr_1fr]">
            <div>
              <form action={createEmployeeAction} className="mb-5 rounded-md border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">เพิ่มพนักงานจริง</h2>
                    <p className="text-sm text-slate-500">
                      ระบบจะสร้าง Auth user, staff profile และสาขาหลักให้อัตโนมัติ
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <label className="text-sm font-medium">
                    ชื่อพนักงาน
                    <input
                      name="display_name"
                      required
                      maxLength={120}
                      className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-slate-700"
                    />
                  </label>
                  <label className="text-sm font-medium">
                    เบอร์โทร
                    <input
                      name="phone"
                      maxLength={32}
                      className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-slate-700"
                    />
                  </label>
                  <label className="text-sm font-medium">
                    ตำแหน่ง
                    <input
                      name="job_title"
                      maxLength={80}
                      placeholder="พนักงานขายหน้าร้าน"
                      className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-slate-700"
                    />
                  </label>
                  <label className="text-sm font-medium">
                    Role
                    <select
                      name="role"
                      defaultValue="cashier"
                      className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-slate-700"
                    >
                      <option value="cashier">cashier</option>
                      {staff.role === "owner" ? (
                        <>
                          <option value="manager">manager</option>
                          <option value="owner">owner</option>
                        </>
                      ) : null}
                    </select>
                  </label>
                  <label className="text-sm font-medium">
                    รหัสผ่านเริ่มต้น
                    <input
                      name="password"
                      required
                      minLength={6}
                      maxLength={72}
                      type="password"
                      className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-slate-700"
                    />
                  </label>
                  <div className="flex items-end">
                    <button className="h-10 w-full rounded-md bg-slate-900 px-4 text-sm font-medium text-white shadow-sm hover:bg-slate-700">
                      เพิ่มพนักงาน
                    </button>
                  </div>
                </div>
              </form>

              <div className="grid gap-3 md:grid-cols-3">
                {["ค้นชื่อ/รหัส/เบอร์", "Role", "Status"].map((label) => (
                  <div key={label} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                    <div className="text-xs text-slate-500">{label}</div>
                    <div className="mt-1 text-sm font-medium text-slate-900">พร้อมต่อข้อมูลจริง</div>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-md border border-dashed border-slate-300 p-6 text-center">
                {error ? (
                  <>
                    <UsersRound className="mx-auto text-red-400" size={28} />
                    <h2 className="mt-3 font-semibold">อ่านข้อมูล staff_profiles ไม่ได้</h2>
                    <p className="mt-2 text-sm leading-6 text-red-600">{error.message}</p>
                  </>
                ) : employeeRows.length ? (
                  <div className="overflow-x-auto text-left">
                    <table className="w-full min-w-[760px] text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                          <th className="px-3 py-2 font-semibold">รหัส</th>
                          <th className="px-3 py-2 font-semibold">ชื่อ</th>
                          <th className="px-3 py-2 font-semibold">Role</th>
                          <th className="px-3 py-2 font-semibold">ตำแหน่ง</th>
                          <th className="px-3 py-2 font-semibold">สาขา</th>
                          <th className="px-3 py-2 font-semibold">บัญชี</th>
                          <th className="px-3 py-2 font-semibold">งาน</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {employeeRows.map((employee) => (
                          <tr key={employee.user_id}>
                            <td className="px-3 py-3 font-semibold">{employee.employee_code}</td>
                            <td className="px-3 py-3">
                              <div className="font-medium">{employee.display_name}</div>
                              <div className="text-xs text-slate-500">{employee.phone ?? "-"}</div>
                            </td>
                            <td className="px-3 py-3 uppercase">{employee.role}</td>
                            <td className="px-3 py-3">{employee.job_title ?? "-"}</td>
                            <td className="px-3 py-3">{employee.branchName}</td>
                            <td className="px-3 py-3">{employee.account_status}</td>
                            <td className="px-3 py-3">{employee.employment_status}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <>
                    <UsersRound className="mx-auto text-slate-400" size={28} />
                    <h2 className="mt-3 font-semibold">ยังไม่มีข้อมูลพนักงานใน staff_profiles</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      ต้องสร้าง Auth users ให้ตรงกับ seed ก่อน แล้วค่อยรัน `supabase/seed_staff_mockup.sql`
                    </p>
                  </>
                )}
              </div>
            </div>

            <aside className="rounded-md border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2">
                <BadgeCheck size={18} className="text-emerald-700" />
                <h2 className="font-semibold">Role preview</h2>
              </div>
              <div className="mt-4 space-y-3">
                {rolePreview.map(([role, description]) => (
                  <div key={role} className="rounded-md border border-slate-200 bg-white p-3">
                    <div className="text-sm font-semibold uppercase">{role}</div>
                    <p className="mt-1 text-sm leading-6 text-slate-600">{description}</p>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </section>
      </main>
    </AppShell>
  );
}
