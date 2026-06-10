import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { BadgePercent, Calculator, Pencil, Power, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { requireRouteAccess } from "@/lib/staff-session";
import { createClient } from "@/lib/supabase/server";
import { campaignStatusLabel, discountSummary, estimateDiscount, money } from "@/lib/promotion-rules.mjs";

type DiscountRuleRow = {
  id: number;
  name: string;
  code: string | null;
  discount_type: "percent";
  value: number;
  applies_to: "member";
  min_purchase_amount: number;
  max_discount_amount: number;
  requires_approval: boolean;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
};
type CampaignUser = { role?: string | null } | null | undefined;

function canManageCampaigns(user: CampaignUser) {
  return user?.role === "manager" || user?.role === "owner";
}

function assertCanManageCampaigns(user: CampaignUser) {
  if (!canManageCampaigns(user)) discountError("ไม่มีสิทธิ์แก้ไขข้อมูลโปรโมชั่นและส่วนลด");
}

const discountTypeLabels: Record<DiscountRuleRow["discount_type"], string> = {
  percent: "เปอร์เซ็นต์",
};

const appliesToLabels: Record<DiscountRuleRow["applies_to"], string> = {
  member: "สมาชิก",
};

async function requireUser() {
  const staff = await requireRouteAccess("/discounts");
  const supabase = await createClient();
  return { supabase, userId: staff.user_id, staff };
}

function discountError(message: string) {
  redirect(`/discounts?error=${encodeURIComponent(message)}`);
}

function textField(formData: FormData, key: string, label: string, maxLength: number) {
  const value = formData.get(key)?.toString().trim() ?? "";
  if (!value) discountError(`กรุณากรอก${label}`);
  if (value.length > maxLength) discountError(`${label}ยาวเกิน ${maxLength} ตัวอักษร`);
  return value;
}

function optionalCodeField(formData: FormData) {
  const value = formData.get("code")?.toString().trim().toUpperCase() ?? "";
  if (!value) return null;
  if (!/^[A-Z0-9_-]{3,32}$/.test(value)) discountError("รหัสคูปองต้องเป็น A-Z, 0-9, _ หรือ - ความยาว 3-32 ตัว");
  return value;
}

function numberField(formData: FormData, key: string, label: string, max = 99999999) {
  const value = Number(formData.get(key) ?? 0);
  if (!Number.isFinite(value) || value < 0 || value > max) discountError(`${label}ไม่ถูกต้อง`);
  return value;
}

function idField(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) discountError("ส่วนลดไม่ถูกต้อง");
  return id;
}

function discountTypeField() {
  return "percent" as const;
}

function appliesToField() {
  return "member" as const;
}

function dateField(formData: FormData, key: string) {
  const value = formData.get(key)?.toString() ?? "";
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function discountPayload(formData: FormData, userId?: string) {
  const startsAt = dateField(formData, "starts_at");
  const endsAt = dateField(formData, "ends_at");
  if (startsAt && endsAt && startsAt > endsAt) discountError("วันสิ้นสุดต้องไม่น้อยกว่าวันเริ่ม");

  const discountType = discountTypeField();
  const value = numberField(formData, "value", "มูลค่าส่วนลด");
  if (discountType === "percent" && (value < 1 || value > 100)) discountError("ส่วนลดเปอร์เซ็นต์ต้องอยู่ระหว่าง 1-100%");
  const hasMaxDiscount = formData.get("has_max_discount") === "on";

  return {
    name: textField(formData, "name", "ชื่อส่วนลด", 120),
    code: optionalCodeField(formData),
    discount_type: discountType,
    value,
    applies_to: appliesToField(),
    min_purchase_amount: numberField(formData, "min_purchase_amount", "ยอดซื้อขั้นต่ำ"),
    max_discount_amount: hasMaxDiscount ? numberField(formData, "max_discount_amount", "เพดานส่วนลด") : 0,
    requires_approval: formData.get("requires_approval") === "on",
    starts_at: startsAt,
    ends_at: endsAt,
    is_active: formData.get("is_active") === "on",
    ...(userId ? { created_by: userId } : {}),
  };
}

async function createDiscountRule(formData: FormData) {
  "use server";

  const { supabase, userId, staff } = await requireUser();
  assertCanManageCampaigns(staff);
  const { error } = await supabase.from("discount_rules").insert(discountPayload(formData, userId));
  if (error) discountError(error.code === "23505" ? "รหัสคูปองซ้ำ" : "บันทึกส่วนลดไม่สำเร็จ");

  revalidatePath("/discounts");
}

async function updateDiscountRule(formData: FormData) {
  "use server";

  const { supabase, staff } = await requireUser();
  assertCanManageCampaigns(staff);
  const id = idField(formData);
  const { error } = await supabase.from("discount_rules").update(discountPayload(formData)).eq("id", id);
  if (error) discountError(error.code === "23505" ? "รหัสคูปองซ้ำ" : "แก้ไขส่วนลดไม่สำเร็จ");

  revalidatePath("/discounts");
}

async function toggleDiscountRule(formData: FormData) {
  "use server";

  const { supabase, staff } = await requireUser();
  assertCanManageCampaigns(staff);
  const id = idField(formData);
  const isActive = formData.get("next_active") === "true";
  const { error } = await supabase.from("discount_rules").update({ is_active: isActive }).eq("id", id);
  if (error) discountError("เปลี่ยนสถานะส่วนลดไม่สำเร็จ");

  revalidatePath("/discounts");
}

function dateLabel(value: string | null) {
  if (!value) return "ไม่กำหนด";
  return new Date(`${value}T00:00:00+07:00`).toLocaleDateString("th-TH", {
    dateStyle: "medium",
  });
}

function statusClass(label: string) {
  if (label === "กำลังใช้งาน") return "bg-emerald-50 text-emerald-800";
  if (label === "รอเริ่ม") return "bg-amber-50 text-amber-800";
  if (label === "หมดอายุ") return "bg-slate-100 text-slate-600";
  return "bg-red-50 text-red-700";
}

function DiscountFields({ item, disabled = false }: { item?: DiscountRuleRow; disabled?: boolean }) {
  const hasMaxDiscount = Number(item?.max_discount_amount ?? 0) > 0;
  return (
    <fieldset disabled={disabled} className="grid gap-3 disabled:opacity-60 md:grid-cols-2 xl:grid-cols-4">
      <input type="hidden" name="discount_type" value="percent" />
      <label className="text-sm font-medium md:col-span-2">
        ชื่อส่วนลด
        <input disabled={disabled} name="name" required defaultValue={item?.name} className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3" />
      </label>
      <label className="text-sm font-medium">
        รหัสคูปอง
        <input disabled={disabled} name="code" defaultValue={item?.code ?? ""} placeholder="เช่น SAVE10" className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3 uppercase" />
      </label>
      <label className="text-sm font-medium">
        ใช้กับ
        <select disabled={disabled} name="applies_to" defaultValue={item?.applies_to ?? "member"} className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3">
          {Object.entries(appliesToLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </label>
      <label className="text-sm font-medium">
        มูลค่า
        <input disabled={disabled} name="value" type="number" min="1" max="100" step="0.01" defaultValue={Number(item?.value ?? 1)} className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3" />
      </label>
      <label className="text-sm font-medium">
        ยอดซื้อขั้นต่ำ
        <input disabled={disabled} name="min_purchase_amount" type="number" min="0" step="0.01" defaultValue={Number(item?.min_purchase_amount ?? 0)} className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3" />
      </label>
      <div className="text-sm font-medium md:col-span-2 [&:has(input:checked)_.max-discount-field]:block">
        <label className="flex min-h-10 items-center gap-2 pt-7">
          <input disabled={disabled} name="has_max_discount" type="checkbox" defaultChecked={hasMaxDiscount} className="size-4 rounded border-slate-300" />
          <span>จำกัดส่วนลดสูงสุด</span>
          <span className="text-xs font-normal text-slate-500">ไม่ติ๊ก = ลดตามเปอร์เซ็นต์ล้วน</span>
        </label>
        <div className="max-discount-field hidden">
          <label className="text-sm font-medium">
            เพดานส่วนลด
            <input disabled={disabled} name="max_discount_amount" type="number" min="0" step="0.01" defaultValue={Number(item?.max_discount_amount ?? 0)} className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3" />
          </label>
        </div>
      </div>
      <label className="text-sm font-medium">
        เริ่ม
        <input disabled={disabled} name="starts_at" type="date" defaultValue={item?.starts_at ?? ""} className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3" />
      </label>
      <label className="text-sm font-medium">
        สิ้นสุด
        <input disabled={disabled} name="ends_at" type="date" defaultValue={item?.ends_at ?? ""} className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3" />
      </label>
      <label className="flex min-h-10 items-center gap-2 pt-7 text-sm font-medium">
        <input disabled={disabled} name="requires_approval" type="checkbox" defaultChecked={item?.requires_approval ?? false} className="size-4 rounded border-slate-300" />
        ต้องอนุมัติ
      </label>
      <label className="flex min-h-10 items-center gap-2 pt-7 text-sm font-medium">
        <input disabled={disabled} name="is_active" type="checkbox" defaultChecked={item?.is_active ?? true} className="size-4 rounded border-slate-300" />
        เปิดใช้งาน
      </label>
    </fieldset>
  );
}

export default async function DiscountsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const notice = await searchParams;
  const { supabase, staff } = await requireUser();
  const { data, error } = await supabase
    .from("discount_rules")
    .select("id, name, code, discount_type, value, applies_to, min_purchase_amount, max_discount_amount, requires_approval, starts_at, ends_at, is_active")
    .order("is_active", { ascending: false })
    .order("id", { ascending: false });

  const discounts = (data ?? []) as DiscountRuleRow[];
  const canManage = canManageCampaigns(staff);
  const now = new Date();
  const activeStatus = campaignStatusLabel({ is_active: true }, now);
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const monthDiscounts = discounts.filter((item) => {
    const startsAt = item.starts_at ? new Date(`${item.starts_at}T00:00:00+07:00`) : null;
    const endsAt = item.ends_at ? new Date(`${item.ends_at}T23:59:59+07:00`) : null;
    return (!startsAt || startsAt <= now) && (!endsAt || endsAt >= now) && (!startsAt || (startsAt.getMonth() === currentMonth && startsAt.getFullYear() === currentYear));
  });
  const expiredCodes = discounts.filter((item) => item.code && item.ends_at && new Date(`${item.ends_at}T23:59:59+07:00`) < now);
  const recommendedDiscount = discounts.find((item) => campaignStatusLabel(item, now) === activeStatus) ?? discounts.find((item) => item.is_active);
  const activeCount = discounts.filter((item) => campaignStatusLabel(item) === "กำลังใช้งาน").length;
  const approvalCount = discounts.filter((item) => item.requires_approval).length;
  const sampleDiscount = Math.max(0, ...discounts.map((item) => estimateDiscount(item, 1000)));

  return (
    <AppShell>
      <main className="p-4 lg:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500">โปรโมชั่น</p>
            <h1 className="mt-1 text-2xl font-semibold">จัดการส่วนลด</h1>
          </div>
          <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
            ใช้งาน {activeCount.toLocaleString("th-TH")} รายการ
          </div>
        </div>

        {notice.error ? <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{notice.error}</div> : null}
        {!canManage ? (
          <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">ไม่มีสิทธิ์แก้ไข: บัญชีพนักงานดูได้อย่างเดียว ปุ่มบันทึก/แก้ไข/เปิดปิดถูกล็อก</div>
        ) : null}
        {!monthDiscounts.length ? (
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">เดือนนี้ยังไม่มีส่วนลดที่ใช้งาน แนะนำสร้างส่วนลดสมาชิก 5-10% แบบไม่จำกัดเพดาน</div>
        ) : null}
        {expiredCodes.length ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">โค้ดหมดอายุ: {expiredCodes.map((item) => item.code).join(", ")}</div>
        ) : null}
        {recommendedDiscount ? (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">แนะนำตอนนี้: {recommendedDiscount.name} เหมาะกับบิลตั้งแต่ {money(recommendedDiscount.min_purchase_amount)} บาท</div>
        ) : null}

        {error ? (
          <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            ยังไม่พบตารางส่วนลด ให้รัน <span className="font-mono">supabase/migrations/20260518_promotions_discounts.sql</span> ใน Supabase SQL Editor ก่อนใช้งานจริง
          </div>
        ) : null}

        <section className="mt-6 rounded-lg border border-slate-200 bg-white">
          <div className="grid gap-0 lg:grid-cols-[320px_1fr]">
            <div className="border-b border-slate-200 bg-slate-50 p-5 lg:border-b-0 lg:border-r">
              <div className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-3 py-1 text-sm font-medium text-white">
                <BadgePercent size={16} />
                Discount Rules
              </div>
              <h2 className="mt-4 text-xl font-semibold text-slate-950">ศูนย์ควบคุมส่วนลด</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                หน้าส่วนลดเน้นกฎที่แคชเชียร์ใช้ตอนปิดบิล เช่น คูปอง สมาชิก ยอดซื้อขั้นต่ำ เพดานส่วนลด และสิทธิ์อนุมัติ
              </p>
            </div>
            <div className="grid gap-4 p-5 md:grid-cols-3">
              <MetricCard icon={BadgePercent} label="ทั้งหมด" value={discounts.length.toLocaleString("th-TH")} />
              <MetricCard icon={ShieldCheck} label="ต้องอนุมัติ" value={approvalCount.toLocaleString("th-TH")} />
              <MetricCard icon={Calculator} label="ตัวอย่างบิล 1,000 บาท" value={`${money(sampleDiscount)} บาท`} />
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-sm font-semibold text-slate-950">Rule types</div>
            <div className="mt-4 grid gap-2">
              {Object.entries(appliesToLabels).map(([value, label]) => (
                <div key={value} className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-sm">
                  <span className="font-medium text-slate-700">{label}</span>
                  <span className="text-xs text-slate-500">
                    {discounts.filter((item) => item.applies_to === value).length.toLocaleString("th-TH")} รายการ
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 lg:col-span-2">
            <div className="text-sm font-semibold text-slate-950">ตัวอย่างคำนวณส่วนลด</div>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-slate-500">
                  <tr>
                    <th className="pb-2 font-medium">กฎ</th>
                    <th className="pb-2 font-medium">บิล 500</th>
                    <th className="pb-2 font-medium">บิล 1,000</th>
                    <th className="pb-2 font-medium">บิล 5,000</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {discounts.slice(0, 4).map((item) => (
                    <tr key={item.id}>
                      <td className="py-2 pr-4 font-medium text-slate-800">{item.name}</td>
                      <td className="py-2 pr-4">{money(estimateDiscount(item, 500))}</td>
                      <td className="py-2 pr-4">{money(estimateDiscount(item, 1000))}</td>
                      <td className="py-2 pr-4">{money(estimateDiscount(item, 5000))}</td>
                    </tr>
                  ))}
                  {!discounts.length ? (
                    <tr>
                      <td colSpan={4} className="py-5 text-slate-500">ยังไม่มีกฎสำหรับคำนวณตัวอย่าง</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <form action={createDiscountRule} className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">เพิ่มส่วนลด</h2>
              <p className="text-sm text-slate-500">ตั้งค่าส่วนลดท้ายบิล คูปอง สมาชิก และสิทธิ์อนุมัติ</p>
            </div>
            <button type="submit" disabled={!canManage} className="h-10 rounded-md bg-slate-950 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300">
              บันทึกส่วนลด
            </button>
          </div>
          <div className="mt-4">
            <DiscountFields disabled={!canManage} />
          </div>
        </form>

        <section className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-semibold">Discount rule table</h2>
          </div>
          {discounts.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">ชื่อกฎ</th>
                    <th className="px-4 py-3 text-left font-medium">ชนิด</th>
                    <th className="px-4 py-3 text-left font-medium">เงื่อนไข</th>
                    <th className="px-4 py-3 text-left font-medium">สถานะ</th>
                    <th className="px-4 py-3 text-right font-medium">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {discounts.map((item) => {
                    const status = campaignStatusLabel(item);
                    return (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="min-w-64 px-4 py-3">
                          <div className="font-semibold text-slate-950">{item.name}</div>
                          <div className="mt-1 flex flex-wrap gap-2">
                            {item.code ? <span className="rounded-md bg-slate-900 px-2 py-1 text-xs font-medium text-white">{item.code}</span> : null}
                            {item.requires_approval ? <span className="rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800">ต้องอนุมัติ</span> : null}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="font-medium">{appliesToLabels[item.applies_to]}</div>
                          <div className="text-xs text-slate-500">{discountTypeLabels[item.discount_type]}</div>
                        </td>
                        <td className="min-w-72 px-4 py-3">
                          <div>{discountSummary(item)}</div>
                          <div className="mt-1 text-xs text-slate-500">
                            {dateLabel(item.starts_at)} - {dateLabel(item.ends_at)} · บิล 1,000 ลด {money(estimateDiscount(item, 1000))}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <span className={`rounded-md px-2 py-1 text-xs font-medium ${statusClass(status)}`}>{status}</span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                        {canManage ? (
                        <details className="group">
                          <summary className="inline-flex h-10 cursor-pointer list-none items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-medium hover:bg-slate-50">
                            <Pencil size={16} /> แก้ไข
                          </summary>
                          <div className="fixed inset-0 z-40 grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
                            <form action={updateDiscountRule} className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-lg border border-slate-200 bg-white p-5 shadow-2xl">
                              <input type="hidden" name="id" value={item.id} />
                              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                                <div>
                                  <h3 className="font-semibold">แก้ไขส่วนลด</h3>
                                  <p className="text-sm text-slate-500">{item.name}</p>
                                </div>
                                <button type="submit" className="h-10 rounded-md bg-slate-950 px-4 text-sm font-medium text-white hover:bg-slate-800">
                                  บันทึกแก้ไข
                                </button>
                              </div>
                              <DiscountFields item={item} disabled={!canManage} />
                            </form>
                          </div>
                        </details>
                        ) : (
                          <button type="button" disabled title="ไม่มีสิทธิ์แก้ไข" className="inline-flex h-10 cursor-not-allowed items-center gap-2 rounded-md border border-slate-200 bg-slate-100 px-3 text-sm font-medium text-slate-400">
                            <Pencil size={16} /> แก้ไข
                          </button>
                        )}
                        <form action={toggleDiscountRule}>
                          <input type="hidden" name="id" value={item.id} />
                          <input type="hidden" name="next_active" value={String(!item.is_active)} />
                          <button type="submit" disabled={!canManage} className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400">
                            <Power size={16} /> {item.is_active ? "ปิด" : "เปิด"}
                          </button>
                        </form>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-5 py-10 text-sm text-slate-500">ยังไม่มีส่วนลด เริ่มจากสร้างกฎส่วนลดด้านบน</div>
          )}
        </section>
      </main>
    </AppShell>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: typeof BadgePercent; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Icon size={17} />
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold text-slate-950">{value}</div>
    </div>
  );
}
