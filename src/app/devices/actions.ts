"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type CurrentDevicePayload = {
  deviceKey: string;
  deviceName: string;
  deviceType: string;
  browser: string;
  os: string;
  metadata?: Record<string, string>;
};

async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) {
    redirect("/login");
  }

  return { supabase, user: data.user };
}

function cleanText(value: string, fallback: string, maxLength = 160) {
  const text = value.trim() || fallback;
  return text.slice(0, maxLength);
}

async function clientIp() {
  const headerStore = await headers();
  return (
    headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headerStore.get("x-real-ip") ||
    headerStore.get("cf-connecting-ip") ||
    "รอข้อมูลจาก server"
  );
}

async function writeAudit(
  deviceSessionId: string,
  actorId: string,
  action: string,
  detail: string,
  metadata: Record<string, string> = {},
) {
  const supabase = await createClient();
  await supabase.from("device_audit_logs").insert({
    device_session_id: deviceSessionId,
    actor_id: actorId,
    action,
    detail,
    metadata,
  });
}

export async function syncCurrentDevice(payload: CurrentDevicePayload) {
  const { supabase, user } = await requireUser();
  const deviceKey = cleanText(payload.deviceKey, "unknown-device", 200);
  const { data: existingDevice } = await supabase
    .from("device_sessions")
    .select("id, status, trusted, is_new_device")
    .eq("device_key", deviceKey)
    .maybeSingle();

  const row = {
    device_key: deviceKey,
    device_name: cleanText(payload.deviceName, "เครื่องนี้"),
    device_type: cleanText(payload.deviceType, "Browser", 80),
    user_id: user.id,
    user_email: user.email ?? user.id,
    role: "ผู้ใช้งานที่ล็อกอิน",
    branch: "ระบุสาขาภายหลัง",
    ip_address: await clientIp(),
    location: "ระบบจะประเมินจาก IP",
    browser: cleanText(payload.browser, "Browser", 80),
    os: cleanText(payload.os, "ไม่ทราบระบบ", 80),
    last_seen_at: new Date().toISOString(),
    status: existingDevice?.status ?? "online",
    trusted: existingDevice?.trusted ?? false,
    is_new_device: existingDevice?.is_new_device ?? true,
    source: "auto",
    metadata: payload.metadata ?? {},
    updated_at: new Date().toISOString(),
  };

  const { error, data } = await supabase
    .from("device_sessions")
    .upsert(row, { onConflict: "device_key" })
    .select("id")
    .single();

  if (!error && data && !existingDevice) {
    await writeAudit(data.id, user.id, "พบอุปกรณ์ใหม่", `${row.device_name} (${row.user_email})`, {
      browser: row.browser,
      ip_address: row.ip_address,
      os: row.os,
    });
  }

  revalidatePath("/devices");
}

async function updateDeviceStatus(
  id: string,
  update: Record<string, string | boolean>,
  action: string,
) {
  const { supabase, user } = await requireUser();
  const { data: device } = await supabase
    .from("device_sessions")
    .select("id, device_name, user_email")
    .eq("id", id)
    .maybeSingle();

  if (!device) {
    redirect(`/devices?error=${encodeURIComponent("ไม่พบอุปกรณ์")}`);
  }

  const { error } = await supabase
    .from("device_sessions")
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    redirect(`/devices?error=${encodeURIComponent("อัปเดตอุปกรณ์ไม่สำเร็จ")}`);
  }

  await writeAudit(id, user.id, action, `${device.device_name} (${device.user_email ?? "-"})`);
  revalidatePath("/devices");
}

export async function approveDevice(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  await updateDeviceStatus(id, { status: "online", trusted: true, is_new_device: false }, "อนุมัติอุปกรณ์");
}

export async function blockDevice(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  await updateDeviceStatus(id, { status: "blocked", trusted: false, is_new_device: false }, "ปิดกั้นอุปกรณ์");
}

export async function revokeDevice(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  await updateDeviceStatus(id, { status: "revoked", is_new_device: false }, "ยกเลิก session");
}
