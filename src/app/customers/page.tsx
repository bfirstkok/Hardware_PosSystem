import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { BadgeCheck, Ban, Gift, Pencil, RotateCcw, Search, Trash2, UserPlus, UsersRound } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import {
  customerTypeLabels,
  isMissingCrmTableError,
  memberStatusLabels,
  type CustomerType,
  type MemberStatus,
} from "@/lib/crm";
import { requireRouteAccess } from "@/lib/staff-session";
import { createClient } from "@/lib/supabase/server";

type CustomerRow = {
  id: number;
  member_code: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  customer_type: CustomerType;
  member_status: MemberStatus;
  points_balance: number;
  note: string | null;
  is_active: boolean;
  created_at: string;
};

type Notice = {
  error?: string;
  created?: string;
  updated?: string;
  deleted?: string;
  restored?: string;
  q?: string;
  status?: string;
  type?: string;
};

const statusTone: Record<MemberStatus, string> = {
  active: "bg-emerald-50 text-emerald-800",
  paused: "bg-amber-50 text-amber-800",
  blocked: "bg-red-50 text-red-700",
};

function crmError(message: string): never {
  redirect(`/customers?error=${encodeURIComponent(message)}`);
}

function textField(formData: FormData, key: string, label: string, maxLength: number) {
  const value = formData.get(key)?.toString().trim() ?? "";
  if (!value) crmError(`กรุณากรอก${label}`);
  if (value.length > maxLength) crmError(`${label}ยาวเกิน ${maxLength} ตัวอักษร`);
  return value;
}

function optionalTextField(formData: FormData, key: string, label: string, maxLength: number) {
  const value = formData.get(key)?.toString().trim() ?? "";
  if (!value) return null;
  if (value.length > maxLength) crmError(`${label}ยาวเกิน ${maxLength} ตัวอักษร`);
  return value;
}

function optionalEmailField(formData: FormData) {
  const value = optionalTextField(formData, "email", "อีเมล", 160);
  if (!value) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) crmError("อีเมลไม่ถูกต้อง");
  return value.toLowerCase();
}

function idField(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) crmError("ลูกค้าไม่ถูกต้อง");
  return id;
}

function customerTypeField(formData: FormData): CustomerType {
  const value = formData.get("customer_type")?.toString();
  if (value === "retail" || value === "contractor" || value === "company") return value;
  crmError("ประเภทลูกค้าไม่ถูกต้อง");
}

function memberStatusField(formData: FormData): MemberStatus {
  const value = formData.get("member_status")?.toString();
  if (value === "active" || value === "paused" || value === "blocked") return value;
  crmError("สถานะสมาชิกไม่ถูกต้อง");
}

async function createMemberCode(supabase: Awaited<ReturnType<typeof createClient>>) {
  const datePart = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(new Date())
    .replaceAll("-", "");
  const prefix = `CUS${datePart}`;
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

function customerPayload(formData: FormData) {
  return {
    full_name: textField(formData, "full_name", "ชื่อลูกค้า", 120),
    phone: optionalTextField(formData, "phone", "เบอร์โทร", 40),
    email: optionalEmailField(formData),
    address: optionalTextField(formData, "address", "ที่อยู่", 500),
    customer_type: customerTypeField(formData),
    member_status: memberStatusField(formData),
    note: optionalTextField(formData, "note", "หมายเหตุ", 500),
    is_active: formData.get("is_active") === "on",
  };
}

async function createCustomer(formData: FormData) {
  "use server";

  const staff = await requireRouteAccess("/customers");
  const supabase = await createClient();
  const payload = customerPayload(formData);
  const memberCode = await createMemberCode(supabase);
  const { error } = await supabase.from("customers").insert({
    ...payload,
    member_code: memberCode,
    points_balance: 0,
    created_by: staff.user_id,
  });

  if (error) crmError(error.code === "23505" ? "เบอร์โทรหรือรหัสสมาชิกซ้ำ" : "เพิ่มลูกค้าไม่สำเร็จ");

  revalidatePath("/customers");
  redirect(`/customers?created=${encodeURIComponent(memberCode)}`);
}

async function updateCustomer(formData: FormData) {
  "use server";

  await requireRouteAccess("/customers");
  const supabase = await createClient();
  const id = idField(formData);
  const { error } = await supabase.from("customers").update(customerPayload(formData)).eq("id", id);

  if (error) crmError(error.code === "23505" ? "เบอร์โทรซ้ำ" : "แก้ไขลูกค้าไม่สำเร็จ");

  revalidatePath("/customers");
  redirect("/customers?updated=1");
}

async function archiveCustomer(formData: FormData) {
  "use server";

  await requireRouteAccess("/customers");
  const supabase = await createClient();
  const id = idField(formData);
  const { error } = await supabase
    .from("customers")
    .update({ is_active: false, member_status: "paused" })
    .eq("id", id);

  if (error) crmError("ลบลูกค้าไม่สำเร็จ");

  revalidatePath("/customers");
  redirect("/customers?deleted=1");
}

async function restoreCustomer(formData: FormData) {
  "use server";

  await requireRouteAccess("/customers");
  const supabase = await createClient();
  const id = idField(formData);
  const { error } = await supabase
    .from("customers")
    .update({ is_active: true, member_status: "active" })
    .eq("id", id);

  if (error) crmError("คืนค่าลูกค้าไม่สำเร็จ");

  revalidatePath("/customers");
  redirect("/customers?restored=1");
}

function CustomerFields({ item }: { item?: CustomerRow }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <label className="text-sm font-medium xl:col-span-2">
        ชื่อลูกค้า
        <input
          name="full_name"
          required
          maxLength={120}
          defaultValue={item?.full_name}
          className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-slate-700"
        />
      </label>
      <label className="text-sm font-medium">
        เบอร์โทร
        <input
          name="phone"
          maxLength={40}
          defaultValue={item?.phone ?? ""}
          placeholder="08x-xxx-xxxx"
          className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-slate-700"
        />
      </label>
      <label className="text-sm font-medium">
        อีเมล
        <input
          name="email"
          type="email"
          maxLength={160}
          defaultValue={item?.email ?? ""}
          className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-slate-700"
        />
      </label>
      <label className="text-sm font-medium">
        ประเภท
        <select
          name="customer_type"
          defaultValue={item?.customer_type ?? "retail"}
          className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-slate-700"
        >
          {Object.entries(customerTypeLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm font-medium">
        สถานะสมาชิก
        <select
          name="member_status"
          defaultValue={item?.member_status ?? "active"}
          className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-slate-700"
        >
          {Object.entries(memberStatusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <label className="flex min-h-10 items-center gap-2 pt-7 text-sm font-medium">
        <input
          name="is_active"
          type="checkbox"
          defaultChecked={item?.is_active ?? true}
          className="size-4 rounded border-slate-300"
        />
        ใช้งาน
      </label>
      <label className="text-sm font-medium md:col-span-2">
        ที่อยู่
        <textarea
          name="address"
          rows={3}
          maxLength={500}
          defaultValue={item?.address ?? ""}
          className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-700"
        />
      </label>
      <label className="text-sm font-medium md:col-span-2">
        หมายเหตุ
        <textarea
          name="note"
          rows={3}
          maxLength={500}
          defaultValue={item?.note ?? ""}
          className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 outline-none focus:border-slate-700"
        />
      </label>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: typeof UsersRound; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Icon size={17} />
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-slate-950">{value}</div>
    </div>
  );
}

function noticeMessage(notice: Notice) {
  if (notice.created) return `เพิ่มสมาชิกแล้ว: ${notice.created}`;
  if (notice.updated) return "แก้ไขลูกค้าแล้ว";
  if (notice.deleted) return "ลบลูกค้าออกจากรายการใช้งานแล้ว";
  if (notice.restored) return "คืนค่าลูกค้าแล้ว";
  return "";
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<Notice>;
}) {
  const notice = await searchParams;
  const staff = await requireRouteAccess("/customers");
  const supabase = await createClient();
  const selectedStatus = notice.status ?? "all";
  const selectedType = notice.type ?? "all";
  const searchText = (notice.q ?? "").trim().toLowerCase();

  let query = supabase
    .from("customers")
    .select(
      "id, member_code, full_name, phone, email, address, customer_type, member_status, points_balance, note, is_active, created_at",
    )
    .order("is_active", { ascending: false })
    .order("id", { ascending: false })
    .limit(300);

  if (selectedStatus !== "all") query = query.eq("member_status", selectedStatus);
  if (selectedType !== "all") query = query.eq("customer_type", selectedType);
  if (searchText) query = query.ilike("phone", `%${searchText}%`);

  const { data, error } = await query;
  const missingTable = isMissingCrmTableError(error);
  const customers = (data ?? []) as CustomerRow[];
  const activeMembers = customers.filter((item) => item.is_active && item.member_status === "active");
  const pointTotal = customers.reduce((sum, item) => sum + Number(item.points_balance ?? 0), 0);
  const message = noticeMessage(notice);

  return (
    <AppShell currentStaff={staff}>
      <main className="p-4 lg:p-6">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm text-slate-500">CRM</p>
              <h1 className="mt-1 text-2xl font-semibold">ลูกค้า</h1>
            </div>
            <Link
              href="/points"
              className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-900 px-3 text-sm font-medium text-white hover:bg-slate-800"
            >
              <Gift size={17} />
              ไปหน้าแต้ม
            </Link>
          </div>

          {notice.error ? (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {notice.error}
            </div>
          ) : null}
          {message ? (
            <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {message}
            </div>
          ) : null}
          {missingTable ? (
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              ยังไม่พบตาราง CRM ให้รัน `supabase/migrations/202605260001_crm_customers_points.sql` ใน Supabase SQL Editor
            </div>
          ) : null}

          <section className="mt-6 grid gap-3 md:grid-cols-3">
            <MetricCard icon={UsersRound} label="ลูกค้าในรายการ" value={customers.length.toLocaleString("th-TH")} />
            <MetricCard icon={BadgeCheck} label="สมาชิกใช้งาน" value={activeMembers.length.toLocaleString("th-TH")} />
            <MetricCard icon={Gift} label="แต้มรวม" value={pointTotal.toLocaleString("th-TH")} />
          </section>

          <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold">เพิ่มลูกค้าเร็ว</h2>
                <p className="text-sm text-slate-500">กรอกชื่อกับเบอร์ก่อน ที่เหลือเติมทีหลังได้</p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-md bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700">
                <UserPlus size={16} />
                รหัสสมาชิกสร้างอัตโนมัติ
              </div>
            </div>
            <form action={createCustomer} className="mt-4">
              <CustomerFields />
              <div className="mt-4 flex justify-end">
                <button
                  type="submit"
                  className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
                >
                  <UserPlus size={17} />
                  เพิ่มลูกค้า
                </button>
              </div>
            </form>
          </section>

          <section className="mt-6 rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-200 p-4">
              <form className="grid gap-3 md:grid-cols-[1fr_180px_180px_auto]">
                <label className="relative">
                  <span className="sr-only">ค้นหา</span>
                  <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    name="q"
                    defaultValue={notice.q ?? ""}
                    placeholder="ค้นด้วยเบอร์โทรเท่านั้น"
                    className="h-10 w-full rounded-md border border-slate-300 pl-9 pr-3 text-sm outline-none focus:border-slate-700"
                  />
                </label>
                <select
                  name="status"
                  defaultValue={selectedStatus}
                  className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-slate-700"
                >
                  <option value="all">ทุกสถานะ</option>
                  {Object.entries(memberStatusLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <select
                  name="type"
                  defaultValue={selectedType}
                  className="h-10 rounded-md border border-slate-300 px-3 text-sm outline-none focus:border-slate-700"
                >
                  <option value="all">ทุกประเภท</option>
                  {Object.entries(customerTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 px-4 text-sm font-medium hover:bg-slate-50"
                >
                  <Search size={17} />
                  ค้นหา
                </button>
              </form>
            </div>

            {customers.length ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">ลูกค้า</th>
                      <th className="px-4 py-3 text-left font-medium">ติดต่อ</th>
                      <th className="px-4 py-3 text-left font-medium">สถานะ</th>
                      <th className="px-4 py-3 text-right font-medium">แต้ม</th>
                      <th className="px-4 py-3 text-right font-medium">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {customers.map((item) => (
                      <tr key={item.id} className={!item.is_active ? "bg-slate-50 text-slate-500" : "hover:bg-slate-50"}>
                        <td className="min-w-64 px-4 py-3">
                          <div className="font-semibold text-slate-950">{item.full_name}</div>
                          <div className="mt-1 flex flex-wrap gap-2">
                            <span className="rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white">
                              {item.member_code}
                            </span>
                            <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                              {customerTypeLabels[item.customer_type]}
                            </span>
                          </div>
                        </td>
                        <td className="min-w-56 px-4 py-3">
                          <div>{item.phone ?? "-"}</div>
                          <div className="text-xs text-slate-500">{item.email ?? "ไม่มีอีเมล"}</div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span className={`rounded-md px-2 py-1 text-xs font-medium ${statusTone[item.member_status]}`}>
                            {memberStatusLabels[item.member_status]}
                          </span>
                          {!item.is_active ? (
                            <div className="mt-2 inline-flex items-center gap-1 text-xs text-slate-500">
                              <Ban size={13} />
                              ถูกลบจากรายการใช้งาน
                            </div>
                          ) : null}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-semibold">
                          {Number(item.points_balance ?? 0).toLocaleString("th-TH")}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <details>
                              <summary className="inline-flex h-10 cursor-pointer list-none items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-medium hover:bg-slate-50">
                                <Pencil size={16} />
                                แก้ไข
                              </summary>
                              <div className="fixed inset-0 z-40 grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
                                <form
                                  action={updateCustomer}
                                  className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-lg border border-slate-200 bg-white p-5 shadow-2xl"
                                >
                                  <input type="hidden" name="id" value={item.id} />
                                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                      <h3 className="font-semibold">แก้ไขลูกค้า</h3>
                                      <p className="text-sm text-slate-500">{item.member_code}</p>
                                    </div>
                                    <button
                                      type="submit"
                                      className="h-10 rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800"
                                    >
                                      บันทึก
                                    </button>
                                  </div>
                                  <CustomerFields item={item} />
                                </form>
                              </div>
                            </details>
                            {item.is_active ? (
                              <form action={archiveCustomer}>
                                <input type="hidden" name="id" value={item.id} />
                                <button
                                  type="submit"
                                  className="inline-flex h-10 items-center gap-2 rounded-md border border-red-200 px-3 text-sm font-medium text-red-700 hover:bg-red-50"
                                >
                                  <Trash2 size={16} />
                                  ลบ
                                </button>
                              </form>
                            ) : (
                              <form action={restoreCustomer}>
                                <input type="hidden" name="id" value={item.id} />
                                <button
                                  type="submit"
                                  className="inline-flex h-10 items-center gap-2 rounded-md border border-emerald-200 px-3 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
                                >
                                  <RotateCcw size={16} />
                                  คืนค่า
                                </button>
                              </form>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-5 py-10 text-center text-sm text-slate-500">
                ยังไม่มีลูกค้า เพิ่มรายการแรกจากฟอร์มด้านบน
              </div>
            )}
          </section>

          <div className="mt-4 text-xs text-slate-500">
            แสดงสูงสุด 300 รายการล่าสุด ค้นหาด้วยเบอร์โทรเท่านั้น
          </div>
        </div>
      </main>
    </AppShell>
  );
}
