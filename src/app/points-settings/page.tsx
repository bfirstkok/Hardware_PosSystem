import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Calculator, Gift, Save, Settings2, ShieldCheck, UsersRound } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { isMissingCrmTableError, money } from "@/lib/crm";
import { requireRouteAccess } from "@/lib/staff-session";
import { createClient } from "@/lib/supabase/server";

type LoyaltySettingsRow = {
  id: number;
  earn_amount: number;
  earn_points: number;
  redeem_points: number;
  redeem_amount: number;
  min_redeem_points: number;
  points_expire_months: number;
  is_active: boolean;
  updated_at: string | null;
};

type Notice = {
  error?: string;
  saved?: string;
};

const defaultSettings: LoyaltySettingsRow = {
  id: 1,
  earn_amount: 100,
  earn_points: 1,
  redeem_points: 100,
  redeem_amount: 10,
  min_redeem_points: 100,
  points_expire_months: 12,
  is_active: true,
  updated_at: null,
};

function settingsError(message: string): never {
  redirect(`/points-settings?error=${encodeURIComponent(message)}`);
}

function positiveNumberField(formData: FormData, key: string, label: string) {
  const value = Number(formData.get(key) ?? 0);
  if (!Number.isFinite(value) || value <= 0 || value > 99999999) settingsError(`${label}ไม่ถูกต้อง`);
  return value;
}

function integerField(formData: FormData, key: string, label: string, min = 0) {
  const value = Number(formData.get(key) ?? 0);
  if (!Number.isInteger(value) || value < min || value > 99999999) settingsError(`${label}ไม่ถูกต้อง`);
  return value;
}

async function updateLoyaltySettings(formData: FormData) {
  "use server";

  const staff = await requireRouteAccess("/points-settings");
  if (staff.role !== "owner") settingsError("เฉพาะเจ้าของร้านแก้ตั้งค่าแต้มได้");

  const supabase = await createClient();
  const payload = {
    id: 1,
    earn_amount: positiveNumberField(formData, "earn_amount", "ยอดซื้อเพื่อสะสม"),
    earn_points: integerField(formData, "earn_points", "แต้มที่ได้", 1),
    redeem_points: integerField(formData, "redeem_points", "แต้มที่ใช้แลก", 1),
    redeem_amount: positiveNumberField(formData, "redeem_amount", "มูลค่าส่วนลด"),
    min_redeem_points: integerField(formData, "min_redeem_points", "ขั้นต่ำการแลก"),
    points_expire_months: integerField(formData, "points_expire_months", "อายุแต้ม"),
    is_active: formData.get("is_active") === "on",
    updated_by: staff.user_id,
  };

  const { error } = await supabase.from("loyalty_settings").upsert(payload, { onConflict: "id" });
  if (error) settingsError("บันทึกตั้งค่าแต้มไม่สำเร็จ");

  revalidatePath("/points-settings");
  revalidatePath("/points");
  redirect("/points-settings?saved=1");
}

function SettingInput({
  label,
  name,
  value,
  suffix,
  disabled,
  min = 0,
  step = "1",
}: {
  label: string;
  name: keyof LoyaltySettingsRow;
  value: number;
  suffix: string;
  disabled: boolean;
  min?: number;
  step?: string;
}) {
  return (
    <label className="text-sm font-medium">
      {label}
      <div className="mt-2 flex h-10 overflow-hidden rounded-md border border-slate-300 bg-white focus-within:border-slate-700">
        <input
          name={name}
          type="number"
          min={min}
          step={step}
          defaultValue={value}
          disabled={disabled}
          className="min-w-0 flex-1 px-3 outline-none disabled:bg-slate-100"
        />
        <span className="inline-flex items-center border-l border-slate-200 bg-slate-50 px-3 text-xs font-medium text-slate-500">
          {suffix}
        </span>
      </div>
    </label>
  );
}

function MetricCard({ icon: Icon, label, value }: { icon: typeof Gift; label: string; value: string }) {
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

export default async function PointsSettingsPage({
  searchParams,
}: {
  searchParams: Promise<Notice>;
}) {
  const notice = await searchParams;
  const staff = await requireRouteAccess("/points-settings");
  const supabase = await createClient();
  const { data, error } = await supabase.from("loyalty_settings").select("*").eq("id", 1).maybeSingle();
  const missingTable = isMissingCrmTableError(error);
  const settings = ((data as LoyaltySettingsRow | null) ?? defaultSettings) as LoyaltySettingsRow;
  const canEdit = staff.role === "owner";
  const sampleBill = 1000;
  const earned = Math.floor(sampleBill / Number(settings.earn_amount || 1)) * Number(settings.earn_points || 0);
  const redeemValue = (Number(settings.min_redeem_points || 0) / Number(settings.redeem_points || 1)) * Number(settings.redeem_amount || 0);

  return (
    <AppShell currentStaff={staff}>
      <main className="p-4 lg:p-6">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm text-slate-500">CRM</p>
              <h1 className="mt-1 text-2xl font-semibold">ตั้งค่าสะสมแต้ม</h1>
            </div>
            <div className="flex gap-2">
              <Link
                href="/customers"
                className="inline-flex h-10 items-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-medium hover:bg-slate-50"
              >
                <UsersRound size={17} />
                ลูกค้า
              </Link>
              <Link
                href="/points"
                className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-900 px-3 text-sm font-medium text-white hover:bg-slate-800"
              >
                <Gift size={17} />
                แต้ม
              </Link>
            </div>
          </div>

          {notice.error ? (
            <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {notice.error}
            </div>
          ) : null}
          {notice.saved ? (
            <div className="mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              บันทึกตั้งค่าแต้มแล้ว
            </div>
          ) : null}
          {!canEdit ? (
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              บัญชี manager ดูได้อย่างเดียว เฉพาะ owner แก้การคำนวณแต้มได้
            </div>
          ) : null}
          {missingTable ? (
            <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              ยังไม่พบตาราง CRM ให้รัน `supabase/migrations/202605260001_crm_customers_points.sql` ก่อน
            </div>
          ) : null}

          <section className="mt-6 grid gap-3 md:grid-cols-3">
            <MetricCard icon={Calculator} label="บิลตัวอย่าง 1,000 บาทได้" value={`${earned.toLocaleString("th-TH")} แต้ม`} />
            <MetricCard icon={Gift} label="ขั้นต่ำแลกคิดเป็น" value={`${money(redeemValue)} บาท`} />
            <MetricCard icon={ShieldCheck} label="สถานะระบบแต้ม" value={settings.is_active ? "เปิด" : "ปิด"} />
          </section>

          <section className="mt-6 rounded-lg border border-slate-200 bg-white">
            <div className="border-b border-slate-200 p-4">
              <div className="flex items-center gap-2">
                <Settings2 size={18} className="text-slate-500" />
                <h2 className="font-semibold">สูตรแต้มหลัก</h2>
              </div>
            </div>
            <form action={updateLoyaltySettings} className="p-4">
              <fieldset disabled={!canEdit} className="grid gap-3 disabled:opacity-60 md:grid-cols-2 xl:grid-cols-3">
                <SettingInput
                  label="ซื้อครบ"
                  name="earn_amount"
                  value={Number(settings.earn_amount)}
                  suffix="บาท"
                  disabled={!canEdit}
                  min={1}
                  step="0.01"
                />
                <SettingInput
                  label="ได้รับ"
                  name="earn_points"
                  value={Number(settings.earn_points)}
                  suffix="แต้ม"
                  disabled={!canEdit}
                  min={1}
                />
                <SettingInput
                  label="ใช้แต้ม"
                  name="redeem_points"
                  value={Number(settings.redeem_points)}
                  suffix="แต้ม"
                  disabled={!canEdit}
                  min={1}
                />
                <SettingInput
                  label="แลกเป็นส่วนลด"
                  name="redeem_amount"
                  value={Number(settings.redeem_amount)}
                  suffix="บาท"
                  disabled={!canEdit}
                  min={1}
                  step="0.01"
                />
                <SettingInput
                  label="ขั้นต่ำแลกแต้ม"
                  name="min_redeem_points"
                  value={Number(settings.min_redeem_points)}
                  suffix="แต้ม"
                  disabled={!canEdit}
                />
                <SettingInput
                  label="แต้มหมดอายุใน"
                  name="points_expire_months"
                  value={Number(settings.points_expire_months)}
                  suffix="เดือน"
                  disabled={!canEdit}
                />
                <label className="flex min-h-10 items-center gap-2 pt-7 text-sm font-medium">
                  <input
                    name="is_active"
                    type="checkbox"
                    defaultChecked={settings.is_active}
                    disabled={!canEdit}
                    className="size-4 rounded border-slate-300"
                  />
                  เปิดระบบแต้ม
                </label>
              </fieldset>
              <div className="mt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={!canEdit}
                  className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-900 px-4 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  <Save size={17} />
                  บันทึกตั้งค่า
                </button>
              </div>
            </form>
          </section>

          <section className="mt-6 rounded-lg border border-slate-200 bg-white p-4">
            <h2 className="font-semibold">ตัวอย่างการใช้งาน</h2>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
                ซื้อ {money(settings.earn_amount)} บาท ได้ {settings.earn_points.toLocaleString("th-TH")} แต้ม
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
                ใช้ {settings.redeem_points.toLocaleString("th-TH")} แต้ม ลด {money(settings.redeem_amount)} บาท
              </div>
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
                แลกขั้นต่ำ {settings.min_redeem_points.toLocaleString("th-TH")} แต้ม
              </div>
            </div>
          </section>
        </div>
      </main>
    </AppShell>
  );
}
