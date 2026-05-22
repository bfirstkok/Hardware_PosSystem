"use server";

import { createClient } from "@/lib/supabase/server";

export type DeviceAccessStatus = {
  allowed: boolean;
  reason: "ok" | "blocked" | "revoked" | "unknown" | "table-missing";
  message: string;
};

export async function checkDeviceAccess(deviceKey: string): Promise<DeviceAccessStatus> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData.user) {
    return { allowed: true, reason: "unknown", message: "" };
  }

  const { data, error } = await supabase
    .from("device_sessions")
    .select("status")
    .eq("device_key", deviceKey)
    .maybeSingle();

  if (error) {
    return { allowed: true, reason: "table-missing", message: "ยังไม่ได้เปิดใช้ตาราง device_sessions" };
  }

  if (!data) {
    return { allowed: true, reason: "unknown", message: "" };
  }

  if (data.status === "blocked") {
    return { allowed: false, reason: "blocked", message: "อุปกรณ์นี้ถูกปิดกั้นโดยผู้ดูแล" };
  }

  if (data.status === "revoked") {
    return { allowed: false, reason: "revoked", message: "session ของอุปกรณ์นี้ถูกยกเลิกแล้ว" };
  }

  return { allowed: true, reason: "ok", message: "" };
}
