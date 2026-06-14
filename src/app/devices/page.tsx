import { createClient } from "@/lib/supabase/server";
import { requireRouteAccess } from "@/lib/staff-session";
import { DevicesClient, type DeviceAuditView, type DeviceSessionView } from "./devices-client";

type DeviceSessionRow = {
  id: string;
  device_key: string;
  device_name: string;
  device_type: string;
  user_email: string | null;
  role: string;
  branch: string;
  ip_address: string | null;
  location: string | null;
  browser: string | null;
  os: string | null;
  login_at: string;
  last_seen_at: string;
  status: DeviceSessionView["status"];
  trusted: boolean;
  is_new_device: boolean;
  source: DeviceSessionView["source"];
};

type DeviceAuditRow = {
  id: number;
  action: string;
  detail: string;
  created_at: string;
};

function dateTime(value: string) {
  return new Date(value).toLocaleString("th-TH", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function mapSession(row: DeviceSessionRow): DeviceSessionView {
  return {
    id: row.id,
    deviceKey: row.device_key,
    deviceName: row.device_name,
    deviceType: row.device_type,
    userEmail: row.user_email ?? "-",
    role: row.role,
    branch: row.branch,
    ipAddress: row.ip_address ?? "-",
    location: row.location ?? "-",
    browser: row.browser ?? "-",
    os: row.os ?? "-",
    loginAt: dateTime(row.login_at),
    lastSeenAt: dateTime(row.last_seen_at),
    status: row.status,
    trusted: row.trusted,
    isNewDevice: row.is_new_device,
    source: row.source,
  };
}

function mapAudit(row: DeviceAuditRow): DeviceAuditView {
  return {
    id: row.id,
    action: row.action,
    detail: row.detail,
    createdAt: dateTime(row.created_at),
  };
}

export default async function DevicesPage() {
  const staff = await requireRouteAccess("/devices");
  const supabase = await createClient();

  const [{ data: sessionData, error: sessionError }, { data: auditData, error: auditError }] = await Promise.all([
    supabase
      .from("device_sessions")
      .select(
        "id, device_key, device_name, device_type, user_email, role, branch, ip_address, location, browser, os, login_at, last_seen_at, status, trusted, is_new_device, source",
      )
      .order("last_seen_at", { ascending: false })
      .limit(100),
    supabase
      .from("device_audit_logs")
      .select("id, action, detail, created_at")
      .order("created_at", { ascending: false })
      .limit(12),
  ]);

  const dbError = sessionError?.message ?? auditError?.message;

  return (
    <DevicesClient
      currentStaff={staff}
      currentUserEmail={staff.email}
      currentUserId={staff.user_id}
      sessions={sessionError ? [] : ((sessionData ?? []) as DeviceSessionRow[]).map(mapSession)}
      auditLog={auditError ? [] : ((auditData ?? []) as DeviceAuditRow[]).map(mapAudit)}
      dbError={dbError}
    />
  );
}
