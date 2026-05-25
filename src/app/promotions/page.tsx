import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { CalendarDays, Gift, Pencil, Power, Tags } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { requireRouteAccess } from "@/lib/staff-session";
import { createClient } from "@/lib/supabase/server";
import { campaignStatusLabel, money, promotionSummary } from "@/lib/promotion-rules.mjs";

type PromotionRow = {
  id: number;
  name: string;
  description: string | null;
  promotion_type: "threshold" | "buy_x_get_y" | "price_drop" | "bundle";
  buy_qty: number;
  get_qty: number;
  min_purchase_amount: number;
  reward_text: string | null;
  starts_at: string | null;
  ends_at: string | null;
  priority: number;
  is_active: boolean;
};

const promotionTypeLabels: Record<PromotionRow["promotion_type"], string> = {
  threshold: "ซื้อครบรับสิทธิ์",
  buy_x_get_y: "ซื้อ X แถม Y",
  price_drop: "ราคาพิเศษ",
  bundle: "ชุดสินค้า",
};

async function requireUser() {
  const staff = await requireRouteAccess("/promotions");
  const supabase = await createClient();
  return { supabase, userId: staff.user_id, staff };
}

function promotionError(message: string) {
  redirect(`/promotions?error=${encodeURIComponent(message)}`);
}

function textField(formData: FormData, key: string, label: string, maxLength: number) {
  const value = formData.get(key)?.toString().trim() ?? "";
  if (!value) promotionError(`กรุณากรอก${label}`);
  if (value.length > maxLength) promotionError(`${label}ยาวเกิน ${maxLength} ตัวอักษร`);
  return value;
}

function optionalTextField(formData: FormData, key: string, maxLength: number) {
  const value = formData.get(key)?.toString().trim() ?? "";
  if (value.length > maxLength) promotionError(`ข้อความยาวเกิน ${maxLength} ตัวอักษร`);
  return value || null;
}

function numberField(formData: FormData, key: string, label: string, max = 99999999) {
  const value = Number(formData.get(key) ?? 0);
  if (!Number.isFinite(value) || value < 0 || value > max) promotionError(`${label}ไม่ถูกต้อง`);
  return value;
}

function idField(formData: FormData) {
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id) || id <= 0) promotionError("โปรโมชั่นไม่ถูกต้อง");
  return id;
}

function promotionTypeField(formData: FormData) {
  const value = formData.get("promotion_type")?.toString();
  if (value === "threshold" || value === "buy_x_get_y" || value === "price_drop" || value === "bundle") {
    return value;
  }
  promotionError("ประเภทโปรโมชั่นไม่ถูกต้อง");
}

function dateField(formData: FormData, key: string) {
  const value = formData.get(key)?.toString() ?? "";
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

function promotionPayload(formData: FormData, userId?: string) {
  const startsAt = dateField(formData, "starts_at");
  const endsAt = dateField(formData, "ends_at");
  if (startsAt && endsAt && startsAt > endsAt) promotionError("วันสิ้นสุดต้องไม่น้อยกว่าวันเริ่ม");

  return {
    name: textField(formData, "name", "ชื่อโปรโมชั่น", 120),
    description: optionalTextField(formData, "description", 300),
    promotion_type: promotionTypeField(formData),
    buy_qty: numberField(formData, "buy_qty", "จำนวนซื้อ", 9999),
    get_qty: numberField(formData, "get_qty", "จำนวนแถม", 9999),
    min_purchase_amount: numberField(formData, "min_purchase_amount", "ยอดซื้อขั้นต่ำ"),
    reward_text: optionalTextField(formData, "reward_text", 160),
    starts_at: startsAt,
    ends_at: endsAt,
    priority: numberField(formData, "priority", "ลำดับ", 999),
    is_active: formData.get("is_active") === "on",
    ...(userId ? { created_by: userId } : {}),
  };
}

async function createPromotion(formData: FormData) {
  "use server";

  const { supabase, userId } = await requireUser();
  const { error } = await supabase.from("promotions").insert(promotionPayload(formData, userId));
  if (error) promotionError("บันทึกโปรโมชั่นไม่สำเร็จ");

  revalidatePath("/promotions");
}

async function updatePromotion(formData: FormData) {
  "use server";

  const { supabase } = await requireUser();
  const id = idField(formData);
  const { error } = await supabase.from("promotions").update(promotionPayload(formData)).eq("id", id);
  if (error) promotionError("แก้ไขโปรโมชั่นไม่สำเร็จ");

  revalidatePath("/promotions");
}

async function togglePromotion(formData: FormData) {
  "use server";

  const { supabase } = await requireUser();
  const id = idField(formData);
  const isActive = formData.get("next_active") === "true";
  const { error } = await supabase.from("promotions").update({ is_active: isActive }).eq("id", id);
  if (error) promotionError("เปลี่ยนสถานะโปรโมชั่นไม่สำเร็จ");

  revalidatePath("/promotions");
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

function PromotionFields({ item }: { item?: PromotionRow }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <label className="text-sm font-medium md:col-span-2">
        ชื่อโปรโมชั่น
        <input name="name" required defaultValue={item?.name} className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3" />
      </label>
      <label className="text-sm font-medium">
        ประเภท
        <select name="promotion_type" defaultValue={item?.promotion_type ?? "threshold"} className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3">
          {Object.entries(promotionTypeLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </label>
      <label className="text-sm font-medium">
        ลำดับแสดงผล
        <input name="priority" type="number" min="0" defaultValue={item?.priority ?? 10} className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3" />
      </label>
      <label className="text-sm font-medium md:col-span-2 xl:col-span-4">
        รายละเอียด
        <textarea name="description" rows={2} defaultValue={item?.description ?? ""} className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2" />
      </label>
      <label className="text-sm font-medium">
        ซื้อจำนวน
        <input name="buy_qty" type="number" min="0" step="0.01" defaultValue={Number(item?.buy_qty ?? 0)} className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3" />
      </label>
      <label className="text-sm font-medium">
        แถมจำนวน
        <input name="get_qty" type="number" min="0" step="0.01" defaultValue={Number(item?.get_qty ?? 0)} className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3" />
      </label>
      <label className="text-sm font-medium">
        ยอดซื้อขั้นต่ำ
        <input name="min_purchase_amount" type="number" min="0" step="0.01" defaultValue={Number(item?.min_purchase_amount ?? 0)} className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3" />
      </label>
      <label className="text-sm font-medium">
        ของแถม/สิทธิ์
        <input name="reward_text" defaultValue={item?.reward_text ?? ""} className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3" />
      </label>
      <label className="text-sm font-medium">
        เริ่ม
        <input name="starts_at" type="date" defaultValue={item?.starts_at ?? ""} className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3" />
      </label>
      <label className="text-sm font-medium">
        สิ้นสุด
        <input name="ends_at" type="date" defaultValue={item?.ends_at ?? ""} className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3" />
      </label>
      <label className="flex min-h-10 items-center gap-2 pt-7 text-sm font-medium">
        <input name="is_active" type="checkbox" defaultChecked={item?.is_active ?? true} className="size-4 rounded border-slate-300" />
        เปิดใช้งาน
      </label>
    </div>
  );
}

export default async function PromotionsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const notice = await searchParams;
  const { supabase, staff } = await requireUser();
  const { data, error } = await supabase
    .from("promotions")
    .select("id, name, description, promotion_type, buy_qty, get_qty, min_purchase_amount, reward_text, starts_at, ends_at, priority, is_active")
    .order("is_active", { ascending: false })
    .order("priority", { ascending: true })
    .order("id", { ascending: false });

  const promotions = (data ?? []) as PromotionRow[];
  const activeCount = promotions.filter((item) => campaignStatusLabel(item) === "กำลังใช้งาน").length;

  return (
    <AppShell currentStaff={staff}>
      <main className="p-4 lg:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500">โปรโมชั่น</p>
            <h1 className="mt-1 text-2xl font-semibold">จัดการโปรโมชั่น</h1>
          </div>
          <div className="rounded-md bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
            ใช้งาน {activeCount.toLocaleString("th-TH")} แคมเปญ
          </div>
        </div>

        {notice.error ? <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{notice.error}</div> : null}
        {error ? (
          <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            ยังไม่พบตารางโปรโมชั่น ให้รัน <span className="font-mono">supabase/migrations/20260518_promotions_discounts.sql</span> ใน Supabase SQL Editor ก่อนใช้งานจริง
          </div>
        ) : null}

        <section className="mt-6 rounded-lg border border-slate-200 bg-slate-950 p-5 text-white">
          <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-md bg-white/10 px-3 py-1 text-sm font-medium text-slate-100">
                <Gift size={16} />
                Campaign Board
              </div>
              <h2 className="mt-4 text-2xl font-semibold">วางแผนแคมเปญขายหน้าร้าน</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
                หน้าโปรโมชั่นเน้นภาพรวมแคมเปญ ช่วงเวลา เงื่อนไข และ priority สำหรับแคชเชียร์ใช้ตามฤดูกาลหรือเทศกาลขาย
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <MetricCard icon={Gift} label="ทั้งหมด" value={promotions.length.toLocaleString("th-TH")} dark />
              <MetricCard icon={Tags} label="เปิดใช้งาน" value={activeCount.toLocaleString("th-TH")} dark />
              <MetricCard icon={CalendarDays} label="ยอดซื้อครบสูงสุด" value={`${money(Math.max(0, ...promotions.map((item) => Number(item.min_purchase_amount))))} บาท`} dark />
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="text-sm font-semibold text-slate-950">ขั้นตอนใช้งาน</div>
            <div className="mt-4 space-y-3 text-sm text-slate-600">
              <div className="flex gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-md bg-slate-900 text-xs font-semibold text-white">1</span>
                ตั้งชื่อและประเภทแคมเปญ
              </div>
              <div className="flex gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-md bg-slate-900 text-xs font-semibold text-white">2</span>
                ใส่เงื่อนไขซื้อครบหรือซื้อแถม
              </div>
              <div className="flex gap-3">
                <span className="grid size-7 shrink-0 place-items-center rounded-md bg-slate-900 text-xs font-semibold text-white">3</span>
                กำหนดช่วงเวลาและเปิดใช้งาน
              </div>
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-4 lg:col-span-2">
            <div className="text-sm font-semibold text-slate-950">ประเภทแคมเปญที่รองรับ</div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {Object.entries(promotionTypeLabels).map(([value, label]) => (
                <div key={value} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                  <div className="font-medium text-slate-950">{label}</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {value === "threshold"
                      ? "ซื้อครบยอดที่กำหนด รับของแถมหรือสิทธิ์พิเศษ"
                      : value === "buy_x_get_y"
                        ? "ซื้อจำนวนที่กำหนด แล้วแถมสินค้าเพิ่ม"
                        : value === "price_drop"
                          ? "ทำราคาพิเศษรายสินค้าในช่วงเวลา"
                          : "รวมหลายสินค้าเป็นชุดขาย"}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <form action={createPromotion} className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold">เพิ่มโปรโมชั่น</h2>
              <p className="text-sm text-slate-500">รองรับซื้อครบรับสิทธิ์ ซื้อแถม ราคาพิเศษ และชุดสินค้า</p>
            </div>
            <button type="submit" className="h-10 rounded-md bg-slate-950 px-4 text-sm font-medium text-white hover:bg-slate-800">
              บันทึกโปรโมชั่น
            </button>
          </div>
          <div className="mt-4">
            <PromotionFields />
          </div>
        </form>

        <section className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-semibold">Campaign timeline</h2>
          </div>
          {promotions.length ? (
            <div className="grid gap-4 p-5 xl:grid-cols-2">
              {promotions.map((item) => {
                const status = campaignStatusLabel(item);
                return (
                  <div key={item.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-slate-950">{item.name}</h3>
                          <span className={`rounded-md px-2 py-1 text-xs font-medium ${statusClass(status)}`}>{status}</span>
                          <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
                            {promotionTypeLabels[item.promotion_type]}
                          </span>
                        </div>
                        <p className="mt-2 text-sm text-slate-600">{item.description || promotionSummary(item)}</p>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                          <span>เงื่อนไข: {promotionSummary(item)}</span>
                          <span>ช่วงเวลา: {dateLabel(item.starts_at)} - {dateLabel(item.ends_at)}</span>
                          <span>ลำดับ: {item.priority}</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <details className="group">
                          <summary className="inline-flex h-10 cursor-pointer list-none items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-medium hover:bg-slate-50">
                            <Pencil size={16} /> แก้ไข
                          </summary>
                          <div className="fixed inset-0 z-40 grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm">
                            <form action={updatePromotion} className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-lg border border-slate-200 bg-white p-5 shadow-2xl">
                              <input type="hidden" name="id" value={item.id} />
                              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                                <div>
                                  <h3 className="font-semibold">แก้ไขโปรโมชั่น</h3>
                                  <p className="text-sm text-slate-500">{item.name}</p>
                                </div>
                                <button type="submit" className="h-10 rounded-md bg-slate-950 px-4 text-sm font-medium text-white hover:bg-slate-800">
                                  บันทึกแก้ไข
                                </button>
                              </div>
                              <PromotionFields item={item} />
                            </form>
                          </div>
                        </details>
                        <form action={togglePromotion}>
                          <input type="hidden" name="id" value={item.id} />
                          <input type="hidden" name="next_active" value={String(!item.is_active)} />
                          <button type="submit" className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-medium hover:bg-slate-50">
                            <Power size={16} /> {item.is_active ? "ปิด" : "เปิด"}
                          </button>
                        </form>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-2 border-t border-slate-200 pt-4 text-xs text-slate-500 sm:grid-cols-3">
                      <div>
                        <div className="font-medium text-slate-700">เริ่ม</div>
                        <div>{dateLabel(item.starts_at)}</div>
                      </div>
                      <div>
                        <div className="font-medium text-slate-700">สิ้นสุด</div>
                        <div>{dateLabel(item.ends_at)}</div>
                      </div>
                      <div>
                        <div className="font-medium text-slate-700">Priority</div>
                        <div>{item.priority}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="px-5 py-10 text-sm text-slate-500">ยังไม่มีโปรโมชั่น เริ่มจากสร้างแคมเปญแรกด้านบน</div>
          )}
        </section>
      </main>
    </AppShell>
  );
}

function MetricCard({ icon: Icon, label, value, dark = false }: { icon: typeof Gift; label: string; value: string; dark?: boolean }) {
  return (
    <div className={`rounded-lg border p-4 ${dark ? "border-white/10 bg-white/10" : "border-slate-200 bg-white"}`}>
      <div className={`flex items-center gap-2 text-sm ${dark ? "text-slate-300" : "text-slate-500"}`}>
        <Icon size={17} />
        {label}
      </div>
      <div className={`mt-2 text-2xl font-semibold ${dark ? "text-white" : "text-slate-950"}`}>{value}</div>
    </div>
  );
}
