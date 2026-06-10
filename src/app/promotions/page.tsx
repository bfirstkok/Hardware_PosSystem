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
  trigger_products: PromotionTriggerProduct[] | null;
  reward_products: PromotionRewardProduct[] | null;
  starts_at: string | null;
  ends_at: string | null;
  priority: number;
  is_active: boolean;
};
type ProductOption = {
  id: number;
  sku: string;
  name: string;
  stock_qty: number;
  units: { short_name: string } | { short_name: string }[] | null;
};
type PromotionTriggerProduct = {
  id: number;
  product_id: number | null;
  required_qty: number;
  required_amount: number;
  product: ProductOption | ProductOption[] | null;
};
type PromotionRewardProduct = {
  id: number;
  product_id: number | null;
  reward_qty: number;
  product: ProductOption | ProductOption[] | null;
};
type CampaignUser = { role?: string | null } | null | undefined;
const productRuleSlots = [0, 1, 2, 3];

function canManageCampaigns(user: CampaignUser) {
  return user?.role === "manager" || user?.role === "owner";
}

function assertCanManageCampaigns(user: CampaignUser) {
  if (!canManageCampaigns(user)) promotionError("ไม่มีสิทธิ์แก้ไขข้อมูลโปรโมชั่นและส่วนลด");
}

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

function optionalIdField(formData: FormData, key: string, label: string) {
  const value = formData.get(key)?.toString() ?? "";
  if (!value) return null;
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) promotionError(`${label}ไม่ถูกต้อง`);
  return id;
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

function ruleNumberField(formData: FormData, key: string, label: string, max = 99999999) {
  const rawValue = formData.get(key)?.toString().trim() ?? "";
  if (!rawValue) return 0;
  const value = Number(rawValue);
  if (!Number.isFinite(value) || value < 0 || value > max) promotionError(`${label}ไม่ถูกต้อง`);
  return value;
}

function productRulePayloads(formData: FormData) {
  const triggerProducts = productRuleSlots.flatMap((slot) => {
    const productId = optionalIdField(formData, `trigger_product_id_${slot}`, "สินค้าที่ต้องซื้อ");
    const requiredQty = ruleNumberField(formData, `trigger_qty_${slot}`, "จำนวนขั้นต่ำ", 9999);
    const requiredAmount = ruleNumberField(formData, `trigger_amount_${slot}`, "ยอดขั้นต่ำ");
    if (!productId || (requiredQty === 0 && requiredAmount === 0)) return [];

    return [{
      product_id: productId,
      required_qty: requiredQty,
      required_amount: requiredAmount,
    }];
  });

  const rewardProducts = productRuleSlots.flatMap((slot) => {
    const productId = optionalIdField(formData, `reward_product_id_${slot}`, "ของแถม");
    const rewardQty = ruleNumberField(formData, `reward_qty_${slot}`, "จำนวนของแถม", 9999);
    if (!productId || rewardQty === 0) return [];

    return [{
      product_id: productId,
      reward_qty: rewardQty,
    }];
  });

  return { triggerProducts, rewardProducts };
}

async function savePromotionProductRules(supabase: Awaited<ReturnType<typeof createClient>>, promotionId: number, formData: FormData) {
  const { triggerProducts, rewardProducts } = productRulePayloads(formData);
  const { error: deleteTriggerError } = await supabase.from("promotion_trigger_products").delete().eq("promotion_id", promotionId);
  if (deleteTriggerError) promotionError("ล้างเงื่อนไขสินค้าไม่สำเร็จ");
  const { error: deleteRewardError } = await supabase.from("promotion_reward_products").delete().eq("promotion_id", promotionId);
  if (deleteRewardError) promotionError("ล้างของแถมไม่สำเร็จ");

  if (triggerProducts.length) {
    const { error } = await supabase
      .from("promotion_trigger_products")
      .insert(triggerProducts.map((item) => ({ ...item, promotion_id: promotionId })));
    if (error) promotionError("บันทึกเงื่อนไขสินค้าไม่สำเร็จ");
  }

  if (rewardProducts.length) {
    const { error } = await supabase
      .from("promotion_reward_products")
      .insert(rewardProducts.map((item) => ({ ...item, promotion_id: promotionId })));
    if (error) promotionError("บันทึกของแถมไม่สำเร็จ");
  }
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
    reward_text: null,
    reward_product_id: null,
    starts_at: startsAt,
    ends_at: endsAt,
    priority: 10,
    is_active: formData.get("is_active") === "on",
    ...(userId ? { created_by: userId } : {}),
  };
}

async function createPromotion(formData: FormData) {
  "use server";

  const { supabase, userId, staff } = await requireUser();
  assertCanManageCampaigns(staff);
  const { data, error } = await supabase.from("promotions").insert(promotionPayload(formData, userId)).select("id").single();
  if (error) promotionError("บันทึกโปรโมชั่นไม่สำเร็จ");
  const promotionId = data?.id;
  if (!promotionId) promotionError("ไม่พบรหัสโปรโมชั่นหลังบันทึก");
  await savePromotionProductRules(supabase, promotionId, formData);

  revalidatePath("/promotions");
}

async function updatePromotion(formData: FormData) {
  "use server";

  const { supabase, staff } = await requireUser();
  assertCanManageCampaigns(staff);
  const id = idField(formData);
  const { error } = await supabase.from("promotions").update(promotionPayload(formData)).eq("id", id);
  if (error) promotionError("แก้ไขโปรโมชั่นไม่สำเร็จ");
  await savePromotionProductRules(supabase, id, formData);

  revalidatePath("/promotions");
}

async function togglePromotion(formData: FormData) {
  "use server";

  const { supabase, staff } = await requireUser();
  assertCanManageCampaigns(staff);
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

function productUnit(product: ProductOption) {
  const unit = Array.isArray(product.units) ? product.units[0] : product.units;
  return unit?.short_name ?? "ชิ้น";
}

function ruleProduct(rule: PromotionTriggerProduct | PromotionRewardProduct) {
  return Array.isArray(rule.product) ? rule.product[0] : rule.product;
}

function triggerRuleLabel(rule: PromotionTriggerProduct) {
  const product = ruleProduct(rule);
  if (!product) return null;
  const conditions = [
    Number(rule.required_qty) > 0 ? `จำนวน ${Number(rule.required_qty).toLocaleString("th-TH")} ${productUnit(product)}` : null,
    Number(rule.required_amount) > 0 ? `ยอด ${money(Number(rule.required_amount))} บาท` : null,
  ].filter(Boolean);
  return `${product.name}${conditions.length ? ` (${conditions.join(" / ")})` : ""}`;
}

function rewardRuleLabel(rule: PromotionRewardProduct) {
  const product = ruleProduct(rule);
  if (!product) return null;
  return `${product.name} x ${Number(rule.reward_qty).toLocaleString("th-TH")} ${productUnit(product)}`;
}

function triggerSummary(item: PromotionRow) {
  const labels = (item.trigger_products ?? []).map(triggerRuleLabel).filter(Boolean);
  return labels.length ? labels.join(", ") : "ไม่มีการเลือกสินค้าเฉพาะ";
}

function rewardSummary(item: PromotionRow) {
  const labels = (item.reward_products ?? []).map(rewardRuleLabel).filter(Boolean);
  return labels.length ? labels.join(", ") : item.reward_text;
}

function summaryWithReward(item: PromotionRow) {
  return promotionSummary({ ...item, reward_text: rewardSummary(item) });
}

function PromotionFields({
  item,
  products,
  disabled = false,
}: {
  item?: PromotionRow;
  products: ProductOption[];
  disabled?: boolean;
}) {
  const triggerProducts = item?.trigger_products ?? [];
  const rewardProducts = item?.reward_products ?? [];

  return (
    <fieldset disabled={disabled} className="grid gap-3 disabled:opacity-60 md:grid-cols-2 xl:grid-cols-4">
      <input type="hidden" name="priority" value={item?.priority ?? 10} />
      <label className="text-sm font-medium md:col-span-2">
        ชื่อโปรโมชั่น
        <input disabled={disabled} name="name" required defaultValue={item?.name} className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3" />
      </label>
      <label className="text-sm font-medium">
        ประเภท
        <select disabled={disabled} name="promotion_type" defaultValue={item?.promotion_type ?? "threshold"} className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3">
          {Object.entries(promotionTypeLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </label>
      <label className="text-sm font-medium md:col-span-2 xl:col-span-4">
        รายละเอียด
        <textarea disabled={disabled} name="description" rows={2} defaultValue={item?.description ?? ""} className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2" />
      </label>
      <label className="text-sm font-medium">
        ซื้อจำนวนรวม
        <input disabled={disabled} name="buy_qty" type="number" min="0" step="0.01" defaultValue={Number(item?.buy_qty ?? 0)} className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3" />
      </label>
      <label className="text-sm font-medium">
        แถมจำนวนรวม
        <input disabled={disabled} name="get_qty" type="number" min="0" step="0.01" defaultValue={Number(item?.get_qty ?? 0)} className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3" />
      </label>
      <label className="text-sm font-medium">
        ยอดซื้อขั้นต่ำ
        <input disabled={disabled} name="min_purchase_amount" type="number" min="0" step="0.01" defaultValue={Number(item?.min_purchase_amount ?? 0)} className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3" />
      </label>
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 md:col-span-2 xl:col-span-4">
        <div className="text-sm font-semibold text-slate-950">สินค้าที่ต้องซื้อ</div>
        <p className="mt-1 text-xs text-slate-500">เลือกได้หลายตัว ใส่จำนวนขั้นต่ำหรือยอดขั้นต่ำอย่างใดอย่างหนึ่ง หรือใส่ทั้งสองอย่างได้ ถ้าไม่เลือกสินค้า = ไม่มีการเลือก</p>
        <div className="mt-3 grid gap-3">
          {productRuleSlots.map((slot) => {
            const rule = triggerProducts[slot];
            const product = rule ? ruleProduct(rule) : null;
            return (
              <div key={`trigger-${slot}`} className="grid gap-2 rounded-md border border-slate-200 bg-white p-3 md:grid-cols-[1fr_160px_180px]">
                <label className="text-sm font-medium">
                  สินค้า #{slot + 1}
                  <select disabled={disabled} name={`trigger_product_id_${slot}`} defaultValue={product?.id ?? ""} className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3">
                    <option value="">ไม่มีการเลือก</option>
                    {products.map((productOption) => (
                      <option key={productOption.id} value={productOption.id}>
                        {productOption.name} / คงเหลือ {Number(productOption.stock_qty).toLocaleString("th-TH")} {productUnit(productOption)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-medium">
                  จำนวนขั้นต่ำ
                  <input disabled={disabled} name={`trigger_qty_${slot}`} type="number" min="0" step="0.01" defaultValue={Number(rule?.required_qty ?? 0)} className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3" />
                </label>
                <label className="text-sm font-medium">
                  ยอดขั้นต่ำ
                  <input disabled={disabled} name={`trigger_amount_${slot}`} type="number" min="0" step="0.01" defaultValue={Number(rule?.required_amount ?? 0)} className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3" />
                </label>
              </div>
            );
          })}
        </div>
      </div>
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 md:col-span-2 xl:col-span-4">
        <div className="text-sm font-semibold text-slate-950">ของแถมจากคลัง</div>
        <p className="mt-1 text-xs text-slate-500">เลือกสินค้าแถมได้หลายรายการ ระบบแสดงสต็อกให้เช็กก่อนบันทึก ถ้าไม่เลือกสินค้า = ไม่มีการเลือก</p>
        <div className="mt-3 grid gap-3">
          {productRuleSlots.map((slot) => {
            const rule = rewardProducts[slot];
            const product = rule ? ruleProduct(rule) : null;
            return (
              <div key={`reward-${slot}`} className="grid gap-2 rounded-md border border-slate-200 bg-white p-3 md:grid-cols-[1fr_160px]">
                <label className="text-sm font-medium">
                  ของแถม #{slot + 1}
                  <select disabled={disabled} name={`reward_product_id_${slot}`} defaultValue={product?.id ?? ""} className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3">
                    <option value="">ไม่มีการเลือก</option>
                    {products.map((productOption) => (
                      <option key={productOption.id} value={productOption.id}>
                        {productOption.name} / คงเหลือ {Number(productOption.stock_qty).toLocaleString("th-TH")} {productUnit(productOption)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm font-medium">
                  จำนวนแถม
                  <input disabled={disabled} name={`reward_qty_${slot}`} type="number" min="0" step="0.01" defaultValue={Number(rule?.reward_qty ?? 0)} className="mt-2 h-10 w-full rounded-md border border-slate-300 px-3" />
                </label>
              </div>
            );
          })}
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
        <input disabled={disabled} name="is_active" type="checkbox" defaultChecked={item?.is_active ?? true} className="size-4 rounded border-slate-300" />
        เปิดใช้งาน
      </label>
    </fieldset>
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
    .select("id, name, description, promotion_type, buy_qty, get_qty, min_purchase_amount, reward_text, trigger_products:promotion_trigger_products(id, product_id, required_qty, required_amount, product:products(id, sku, name, stock_qty, units(short_name))), reward_products:promotion_reward_products(id, product_id, reward_qty, product:products(id, sku, name, stock_qty, units(short_name))), starts_at, ends_at, priority, is_active")
    .order("is_active", { ascending: false })
    .order("starts_at", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false });
  const { data: productData } = await supabase
    .from("products")
    .select("id, sku, name, stock_qty, units(short_name)")
    .eq("is_active", true)
    .order("name")
    .limit(500);

  const promotions = (data ?? []) as PromotionRow[];
  const products = (productData ?? []) as unknown as ProductOption[];
  const canManage = canManageCampaigns(staff);
  const now = new Date();
  const activeStatus = campaignStatusLabel({ is_active: true }, now);
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const monthPromotions = promotions.filter((item) => {
    const startsAt = item.starts_at ? new Date(`${item.starts_at}T00:00:00+07:00`) : null;
    const endsAt = item.ends_at ? new Date(`${item.ends_at}T23:59:59+07:00`) : null;
    return (!startsAt || startsAt <= now) && (!endsAt || endsAt >= now) && (!startsAt || (startsAt.getMonth() === currentMonth && startsAt.getFullYear() === currentYear));
  });
  const expiredPromotions = promotions.filter((item) => item.ends_at && new Date(`${item.ends_at}T23:59:59+07:00`) < now);
  const recommendedPromotion = promotions.find((item) => campaignStatusLabel(item, now) === activeStatus) ?? promotions.find((item) => item.is_active);
  const activeCount = promotions.filter((item) => campaignStatusLabel(item) === "กำลังใช้งาน").length;

  return (
    <AppShell>
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
        {!canManage ? (
          <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">ไม่มีสิทธิ์แก้ไข: บัญชีพนักงานดูได้อย่างเดียว ปุ่มบันทึก/แก้ไข/เปิดปิดถูกล็อก</div>
        ) : null}
        {!monthPromotions.length ? (
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">เดือนนี้ยังไม่มีโปรโมชั่นที่ใช้งาน แนะนำสร้างซื้อครบรับสิทธิ์สำหรับสินค้าขายดี</div>
        ) : null}
        {expiredPromotions.length ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">โปรโมชั่นหมดอายุ: {expiredPromotions.slice(0, 3).map((item) => item.name).join(", ")}{expiredPromotions.length > 3 ? " ..." : ""}</div>
        ) : null}
        {recommendedPromotion ? (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">แนะนำตอนนี้: {recommendedPromotion.name} เหมาะกับ {promotionTypeLabels[recommendedPromotion.promotion_type]} เงื่อนไข {summaryWithReward(recommendedPromotion)}</div>
        ) : null}

        {error ? (
          <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            ยังไม่พบตารางโปรโมชั่น ให้รัน <span className="font-mono">supabase/migrations/20260518_promotions_discounts.sql</span> และ <span className="font-mono">supabase/migrations/202606070002_promotion_multi_products.sql</span> ใน Supabase SQL Editor ก่อนใช้งานจริง
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
                หน้าโปรโมชั่นเน้นภาพรวมแคมเปญ ประเภท ช่วงเวลา เงื่อนไข และสิทธิ์ที่ลูกค้าจะได้รับ เพื่อให้แคชเชียร์อ่านง่ายตอนขายหน้าร้าน
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
            <button type="submit" disabled={!canManage} className="h-10 rounded-md bg-slate-950 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300">
              บันทึกโปรโมชั่น
            </button>
          </div>
          <div className="mt-4">
            <PromotionFields products={products} disabled={!canManage} />
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
                const rewardProducts = item.reward_products ?? [];
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
                        <p className="mt-2 text-sm text-slate-600">{item.description || summaryWithReward(item)}</p>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                          <span>เงื่อนไข: {summaryWithReward(item)}</span>
                          <span>สินค้าเฉพาะ: {triggerSummary(item)}</span>
                          <span>ของแถม: {rewardSummary(item) ?? "ไม่มีการเลือกของแถม"}</span>
                          <span>ช่วงเวลา: {dateLabel(item.starts_at)} - {dateLabel(item.ends_at)}</span>
                          {rewardProducts.map((rule) => {
                            const product = ruleProduct(rule);
                            if (!product) return null;
                            const stock = Number(product.stock_qty);
                            const rewardQty = Number(rule.reward_qty);
                            return (
                              <span key={rule.id} className={stock >= rewardQty ? "text-emerald-700" : "text-red-700"}>
                                สต็อก {product.name}: {stock.toLocaleString("th-TH")} {productUnit(product)}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {canManage ? (
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
                              <PromotionFields item={item} products={products} disabled={!canManage} />
                            </form>
                          </div>
                        </details>
                        ) : (
                          <button type="button" disabled title="ไม่มีสิทธิ์แก้ไข" className="inline-flex h-10 cursor-not-allowed items-center gap-2 rounded-md border border-slate-200 bg-slate-100 px-3 text-sm font-medium text-slate-400">
                            <Pencil size={16} /> แก้ไข
                          </button>
                        )}
                        <form action={togglePromotion}>
                          <input type="hidden" name="id" value={item.id} />
                          <input type="hidden" name="next_active" value={String(!item.is_active)} />
                          <button type="submit" disabled={!canManage} className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400">
                            <Power size={16} /> {item.is_active ? "ปิด" : "เปิด"}
                          </button>
                        </form>
                      </div>
                    </div>
                    <div className="mt-4 grid gap-2 border-t border-slate-200 pt-4 text-xs text-slate-500 sm:grid-cols-2">
                      <div>
                        <div className="font-medium text-slate-700">เริ่ม</div>
                        <div>{dateLabel(item.starts_at)}</div>
                      </div>
                      <div>
                        <div className="font-medium text-slate-700">สิ้นสุด</div>
                        <div>{dateLabel(item.ends_at)}</div>
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
