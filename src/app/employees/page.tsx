import { createClient as createSupabaseAdminClient, type SupabaseClient } from "@supabase/supabase-js";
import Link from "next/link";
import { Archive, BadgeCheck, Download, ListFilter, Save, Search, ShieldCheck, UserPlus, UsersRound } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import {
  EMPLOYEE_PAGE_SIZE,
  employeeMatchesFilters,
  employeeRoleOptions,
  employeeSearchOrFilter,
  employeeStatusOptions,
  normalizeEmployeeFilters,
} from "@/lib/employees-export.mjs";
import { pageHref, paginationState, parsePage } from "@/lib/pagination.mjs";
import { staffAccountStatusOptions, staffEmploymentStatusOptions } from "@/lib/staff-admin-rules.mjs";
import { staffCodePrefixes } from "@/lib/staff-code";
import { type CurrentStaff, requireRouteAccess } from "@/lib/staff-session";
import { createClient } from "@/lib/supabase/server";
import { archiveEmployeeAction, createEmployeeAction, updateEmployeeAction } from "./actions";

const tabs = [
  { label: "เพิ่มพนักงาน", icon: UserPlus },
  { label: "รายชื่อพนักงาน", icon: UsersRound },
  { label: "บทบาท/สิทธิ์", icon: ShieldCheck },
];

const rolePreview = [
  ["cashier", `${staffCodePrefixes.cashier}001 เป็นต้นไป: หน้าร้าน, ดูสินค้า/stock, ประวัติขาย, stock basic`],
  ["manager", `${staffCodePrefixes.manager}001 เป็นต้นไป: จัดการสินค้า, รายงาน/export, จัดการ cashier`],
  ["owner", `${staffCodePrefixes.owner}001 เป็นต้นไป: ทุกเมนู ทุกสาขา จัดการ staff ทุก role`],
];

const accountStatusLabel: Record<string, string> = {
  invited: "เชิญแล้ว",
  active: "ใช้งาน",
  suspended: "ระงับ",
  archived: "เก็บถาวร",
};

const employmentStatusLabel: Record<string, string> = {
  probation: "ทดลองงาน",
  full_time: "ประจำ",
  part_time: "พาร์ทไทม์",
  resigned: "ลาออก",
};

type EmployeeRow = {
  user_id: string;
  auth_email: string;
  employee_code: string;
  display_name: string;
  phone: string | null;
  job_title: string | null;
  role: string;
  account_status: string;
  employment_status: string;
  branches: { name: string } | { name: string }[] | null;
};
type EmployeeViewRow = EmployeeRow & { branchName: string };
type EmployeeFilters = { q: string; role: string; status: string };

function createStaffListAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) return null;

  return createSupabaseAdminClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

async function listEmployees(staff: CurrentStaff, filters: EmployeeFilters, from: number, to: number) {
  const sessionClient = await createClient();
  const client = createStaffListAdminClient() ?? sessionClient;
  let query = (client as SupabaseClient)
    .from("staff_profiles")
    .select(
      "user_id, auth_email, employee_code, display_name, phone, job_title, role, account_status, employment_status, branches:primary_branch_id(name)",
      { count: "exact" },
    )
    .order("employee_code");

  if (staff.role === "manager") {
    query = query.eq("role", "cashier");
  } else if (filters.role !== "all") {
    query = query.eq("role", filters.role);
  }

  if (filters.status !== "all") {
    query = query.eq("account_status", filters.status);
  }

  const searchFilter = employeeSearchOrFilter(filters.q);
  if (searchFilter) {
    query = query.or(searchFilter);
  }

  query = query.range(from, to);

  const { data, error, count } = await query;

  return {
    error,
    count: count ?? 0,
    rows:
      ((data as EmployeeRow[] | null) ?? []).map((employee) => {
        const branch = Array.isArray(employee.branches) ? employee.branches[0] : employee.branches;

        return {
          ...employee,
          branchName: branch?.name ?? "สาขาหลัก",
        };
      }) ?? [],
  };
}

async function countEmployees(staff: CurrentStaff) {
  const sessionClient = await createClient();
  const client = createStaffListAdminClient() ?? sessionClient;

  const countBy = async (filters: { role?: string; account_status?: string }) => {
    let query = (client as SupabaseClient).from("staff_profiles").select("user_id", { count: "exact", head: true });

    if (staff.role === "manager") {
      query = query.eq("role", "cashier");
    }

    if (filters.role) query = query.eq("role", filters.role);
    if (filters.account_status) query = query.eq("account_status", filters.account_status);

    const { count } = await query;
    return count ?? 0;
  };

  const [total, active, cashier, manager] = await Promise.all([
    countBy({}),
    countBy({ account_status: "active" }),
    countBy({ role: "cashier" }),
    staff.role === "owner" ? countBy({ role: "manager" }) : Promise.resolve(0),
  ]);

  return { total, active, cashier, manager };
}

function employeesExportHref(filters: { q: string; role: string; status: string }) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.role !== "all") params.set("role", filters.role);
  if (filters.status !== "all") params.set("status", filters.status);

  const query = params.toString();
  return query ? `/employees/export?${query}` : "/employees/export";
}

function editableRolesFor(staff: CurrentStaff) {
  return staff.role === "owner" ? ["cashier", "manager", "owner"] : ["cashier"];
}

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; created?: string; updated?: string; q?: string; role?: string; status?: string; page?: string }>;
}) {
  const notice = await searchParams;
  const staff = await requireRouteAccess("/employees");
  const filters = normalizeEmployeeFilters(new URLSearchParams({
    ...(notice.q ? { q: notice.q } : {}),
    ...(notice.role ? { role: notice.role } : {}),
    ...(notice.status ? { status: notice.status } : {}),
  }));
  const selectedPage = parsePage(notice.page);
  const initialPage = paginationState({
    page: selectedPage,
    pageSize: EMPLOYEE_PAGE_SIZE,
    totalItems: selectedPage * EMPLOYEE_PAGE_SIZE,
  });
  let { rows: employeeRows, error, count: filteredCount } = await listEmployees(staff, filters, initialPage.from, initialPage.to);
  const pagination = paginationState({ page: selectedPage, pageSize: EMPLOYEE_PAGE_SIZE, totalItems: filteredCount });
  if (!error && selectedPage !== pagination.currentPage) {
    const current = await listEmployees(staff, filters, pagination.from, pagination.to);
    employeeRows = current.rows;
    error = current.error;
    filteredCount = current.count;
  }
  const filteredEmployees = (employeeRows as EmployeeViewRow[]).filter((employee) => employeeMatchesFilters(employee, filters));
  const metrics = await countEmployees(staff);
  const paginationParams = {
    q: filters.q || undefined,
    role: filters.role !== "all" ? filters.role : undefined,
    status: filters.status !== "all" ? filters.status : undefined,
  };

  return (
    <AppShell currentStaff={staff}>
      <main className="p-4 lg:p-6">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm text-slate-500">บริหาร</p>
              <h1 className="mt-1 text-2xl font-semibold">พนักงาน</h1>
            </div>
            <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
              {filteredCount.toLocaleString("th-TH")} / {metrics.total.toLocaleString("th-TH")} คน
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
        {notice.updated ? (
          <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            บันทึกข้อมูลพนักงานสำเร็จ: {notice.updated}
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

          <div className="p-5">
            <form action={createEmployeeAction} className="rounded-md border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">เพิ่มพนักงานจริง</h2>
                    <p className="text-sm text-slate-500">
                      ระบบจะสร้าง Auth user, staff profile และรหัสตาม role เช่น CAS001, MGR001, OWN001
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

            <section className="mt-5 rounded-md border border-slate-200 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
                <div className="inline-flex items-center gap-2 font-semibold">
                  <ListFilter size={17} className="text-slate-500" />
                  Filter
                </div>
                <Link
                  href={employeesExportHref(filters)}
                  className="inline-flex h-10 items-center gap-2 rounded-md border border-emerald-300 bg-emerald-50 px-3 text-sm font-medium text-emerald-800 hover:bg-emerald-100"
                >
                  <Download size={16} />
                  CSV
                </Link>
              </div>
              <form className="grid gap-3 p-4 lg:grid-cols-[1.4fr_1fr_1fr_auto]">
                <label className="text-sm font-medium">
                  ค้นชื่อ/รหัส/อีเมล/เบอร์
                  <input
                    name="q"
                    defaultValue={filters.q}
                    placeholder="เช่น CAS001 หรือชื่อพนักงาน"
                    className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-slate-700"
                  />
                </label>
                <label className="text-sm font-medium">
                  Role
                  <select name="role" defaultValue={filters.role} className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3">
                    {employeeRoleOptions
                      .filter((role) => staff.role === "owner" || role === "all" || role === "cashier")
                      .map((role) => (
                        <option key={role} value={role}>{role === "all" ? "ทุก role" : role}</option>
                      ))}
                  </select>
                </label>
                <label className="text-sm font-medium">
                  Status
                  <select name="status" defaultValue={filters.status} className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3">
                    {employeeStatusOptions.map((status) => (
                      <option key={status} value={status}>{status === "all" ? "ทุกสถานะ" : status}</option>
                    ))}
                  </select>
                </label>
                <div className="flex items-end gap-2">
                  <button className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-950 px-4 text-sm font-medium text-white hover:bg-slate-800">
                    <Search size={16} />
                    กรอง
                  </button>
                  <Link href="/employees" className="inline-flex h-10 items-center rounded-md border border-slate-300 px-3 text-sm font-medium hover:bg-slate-50">
                    ล้าง
                  </Link>
                </div>
              </form>
            </section>

            <div className="mt-5 grid gap-4 md:grid-cols-4">
              {[
                ["พนักงานทั้งหมด", metrics.total],
                ["Active", metrics.active],
                ["Cashier", metrics.cashier],
                ["Manager", metrics.manager],
              ].map(([label, value]) => (
                <div key={label} className="rounded-md border border-slate-200 bg-white p-4">
                  <div className="text-sm text-slate-500">{label}</div>
                  <div className="mt-2 text-2xl font-semibold">{Number(value).toLocaleString("th-TH")}</div>
                </div>
              ))}
            </div>

            <div className="mt-5 grid gap-4">
              <div className="rounded-md border border-slate-200 bg-white text-center">
                {error ? (
                  <>
                    <UsersRound className="mx-auto text-red-400" size={28} />
                    <h2 className="mt-3 font-semibold">อ่านข้อมูล staff_profiles ไม่ได้</h2>
                    <p className="mt-2 text-sm leading-6 text-red-600">{error.message}</p>
                  </>
                ) : filteredEmployees.length ? (
                  <div className="overflow-x-auto text-left">
                    <table className="w-full min-w-[920px] text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
                          <th className="w-[16%] px-4 py-3 font-semibold">รหัส / Login</th>
                          <th className="w-[34%] px-4 py-3 font-semibold">ข้อมูลพนักงาน</th>
                          <th className="w-[24%] px-4 py-3 font-semibold">Role / สาขา</th>
                          <th className="w-[16%] px-4 py-3 font-semibold">สถานะ</th>
                          <th className="w-[10%] px-4 py-3 text-right font-semibold">จัดการ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredEmployees.map((employee) => (
                          <tr key={employee.user_id} className="align-top">
                            <td className="px-4 py-4">
                              <div className="font-semibold">{employee.employee_code}</div>
                              <div className="mt-1 max-w-40 truncate text-xs text-slate-500">{employee.auth_email}</div>
                              <input type="hidden" name="user_id" value={employee.user_id} form={`employee-${employee.user_id}`} />
                            </td>
                            <td className="px-4 py-4">
                              <div className="grid gap-2 md:grid-cols-2">
                              <input
                                name="display_name"
                                form={`employee-${employee.user_id}`}
                                defaultValue={employee.display_name}
                                required
                                maxLength={120}
                                placeholder="ชื่อพนักงาน"
                                className="h-9 min-w-0 rounded-md border border-slate-300 px-2 text-sm outline-none focus:border-slate-700"
                              />
                              <input
                                name="phone"
                                form={`employee-${employee.user_id}`}
                                defaultValue={employee.phone ?? ""}
                                maxLength={32}
                                placeholder="เบอร์โทร"
                                className="h-9 min-w-0 rounded-md border border-slate-300 px-2 text-sm outline-none focus:border-slate-700"
                              />
                              <input
                                name="job_title"
                                form={`employee-${employee.user_id}`}
                                defaultValue={employee.job_title ?? ""}
                                maxLength={80}
                                placeholder="ตำแหน่ง"
                                className="h-9 min-w-0 rounded-md border border-slate-300 px-2 text-sm outline-none focus:border-slate-700 md:col-span-2"
                              />
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="grid gap-2 sm:grid-cols-[minmax(120px,160px)_1fr]">
                              <select
                                name="role"
                                form={`employee-${employee.user_id}`}
                                defaultValue={employee.role}
                                className="h-9 min-w-0 rounded-md border border-slate-300 px-2 text-sm uppercase"
                              >
                                {editableRolesFor(staff).map((role) => (
                                  <option key={role} value={role}>{role}</option>
                                ))}
                              </select>
                              <div className="rounded-md bg-slate-50 px-2 py-2 text-sm text-slate-600">{employee.branchName}</div>
                              </div>
                              {staff.role !== "owner" ? (
                                <div className="mt-2 text-xs text-slate-500">manager แก้ role ได้เฉพาะ cashier</div>
                              ) : null}
                            </td>
                            <td className="px-4 py-4">
                              <div className="grid gap-2">
                                <select
                                  name="account_status"
                                  form={`employee-${employee.user_id}`}
                                  defaultValue={employee.account_status}
                                  className="h-9 min-w-0 rounded-md border border-slate-300 px-2 text-sm"
                                >
                                  {staffAccountStatusOptions.map((status) => (
                                    <option key={status} value={status}>{accountStatusLabel[status] ?? status}</option>
                                  ))}
                                </select>
                                <select
                                  name="employment_status"
                                  form={`employee-${employee.user_id}`}
                                  defaultValue={employee.employment_status}
                                  className="h-9 min-w-0 rounded-md border border-slate-300 px-2 text-sm"
                                >
                                  {staffEmploymentStatusOptions.map((status) => (
                                    <option key={status} value={status}>{employmentStatusLabel[status] ?? status}</option>
                                  ))}
                                </select>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex justify-end gap-2">
                                <form id={`employee-${employee.user_id}`} action={updateEmployeeAction}>
                                  <button className="inline-flex h-9 items-center gap-2 rounded-md bg-slate-950 px-3 text-sm font-medium text-white hover:bg-slate-800" title="บันทึก">
                                    <Save size={15} />
                                    <span className="sr-only">บันทึก</span>
                                  </button>
                                </form>
                                <form action={archiveEmployeeAction}>
                                  <input type="hidden" name="user_id" value={employee.user_id} />
                                  <button
                                    disabled={employee.account_status === "archived" || employee.user_id === staff.user_id}
                                    className="inline-flex h-9 items-center gap-2 rounded-md border border-red-200 px-3 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-45"
                                    title="Archive"
                                  >
                                    <Archive size={15} />
                                    <span className="sr-only">Archive</span>
                                  </button>
                                </form>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <>
                    <UsersRound className="mx-auto text-slate-400" size={28} />
                    <h2 className="mt-3 font-semibold">ไม่พบพนักงานตาม filter</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      ลองเปลี่ยนคำค้น, role หรือ status
                    </p>
                  </>
                )}
              </div>

              {filteredCount > EMPLOYEE_PAGE_SIZE ? (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-slate-200 bg-white px-4 py-3 text-sm">
                  <div className="text-slate-500">
                    หน้า {pagination.currentPage.toLocaleString("th-TH")} / {pagination.pageCount.toLocaleString("th-TH")}
                  </div>
                  <div className="flex gap-2">
                    <Link
                      href={pageHref("/employees", paginationParams, pagination.currentPage - 1)}
                      className={`inline-flex h-9 items-center rounded-md border px-3 font-medium ${
                        pagination.hasPrevious ? "border-slate-300 hover:bg-slate-50" : "pointer-events-none border-slate-200 text-slate-300"
                      }`}
                    >
                      ก่อนหน้า
                    </Link>
                    <Link
                      href={pageHref("/employees", paginationParams, pagination.currentPage + 1)}
                      className={`inline-flex h-9 items-center rounded-md border px-3 font-medium ${
                        pagination.hasNext ? "border-slate-300 hover:bg-slate-50" : "pointer-events-none border-slate-200 text-slate-300"
                      }`}
                    >
                      ถัดไป
                    </Link>
                  </div>
                </div>
              ) : null}

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
          </div>
        </section>
        </div>
      </main>
    </AppShell>
  );
}
