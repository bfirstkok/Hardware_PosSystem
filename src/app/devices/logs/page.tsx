import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { requireRouteAccess } from "@/lib/staff-session";
import { createClient } from "@/lib/supabase/server";

type DeviceLogRow = {
  id: number;
  action: string;
  detail: string;
  created_at: string;
  metadata: Record<string, string> | null;
  device_sessions: {
    device_name: string;
    user_email: string | null;
    ip_address: string | null;
    location: string | null;
    browser: string | null;
    os: string | null;
    status: string;
  } | null;
};

function dateTime(value: string) {
  return new Date(value).toLocaleString("th-TH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default async function DeviceLogsPage() {
  const staff = await requireRouteAccess("/devices/logs");
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("device_audit_logs")
    .select(
      "id, action, detail, created_at, metadata, device_sessions(device_name, user_email, ip_address, location, browser, os, status)",
    )
    .order("created_at", { ascending: false })
    .limit(200);

  const logs = (data ?? []) as unknown as DeviceLogRow[];

  return (
    <AppShell currentStaff={staff}>
      <main className="p-4 lg:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500">บริหาร / อุปกรณ์</p>
            <h1 className="mt-1 text-2xl font-semibold">Log การเข้าใช้งานอุปกรณ์</h1>
          </div>
          <Link
            href="/devices"
            className="inline-flex h-10 items-center rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            กลับหน้าอุปกรณ์
          </Link>
        </div>

        <section className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          หน้านี้แสดง IP เต็มเพื่อใช้ตรวจสอบเหตุผิดปกติ ส่วนหน้าหลักจะแสดงแบบซ่อนบางส่วนเพื่อลดการเปิดเผยข้อมูลสำคัญ
        </section>

        {error ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            โหลด log ไม่สำเร็จ: {error.message}
            <div className="mt-2">
              ให้รัน migration <span className="font-mono">supabase/migrations/202605220001_device_sessions.sql</span>
            </div>
          </div>
        ) : null}

        <section className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4">
            <h2 className="font-semibold">ประวัติล่าสุด</h2>
          </div>
          {logs.length ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">เวลา</th>
                    <th className="px-4 py-3 text-left font-medium">เหตุการณ์</th>
                    <th className="px-4 py-3 text-left font-medium">ผู้ใช้</th>
                    <th className="px-4 py-3 text-left font-medium">อุปกรณ์</th>
                    <th className="px-4 py-3 text-left font-medium">IP / ที่ตั้ง</th>
                    <th className="px-4 py-3 text-left font-medium">Browser / OS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((log) => {
                    const device = log.device_sessions;
                    return (
                      <tr key={log.id} className="align-top hover:bg-slate-50">
                        <td className="whitespace-nowrap px-4 py-3 text-slate-600">{dateTime(log.created_at)}</td>
                        <td className="min-w-56 px-4 py-3">
                          <div className="font-semibold text-slate-950">{log.action}</div>
                          <div className="mt-1 text-xs text-slate-500">{log.detail}</div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">{device?.user_email ?? "-"}</td>
                        <td className="min-w-52 px-4 py-3">
                          <div className="font-medium">{device?.device_name ?? "-"}</div>
                          <div className="mt-1 text-xs text-slate-500">สถานะ {device?.status ?? "-"}</div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="font-mono">{device?.ip_address ?? log.metadata?.ip_address ?? "-"}</div>
                          <div className="mt-1 text-xs text-slate-500">{device?.location ?? "-"}</div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <div>{device?.browser ?? log.metadata?.browser ?? "-"}</div>
                          <div className="mt-1 text-xs text-slate-500">{device?.os ?? log.metadata?.os ?? "-"}</div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="px-5 py-8 text-sm text-slate-500">ยังไม่มี log อุปกรณ์</p>
          )}
        </section>
      </main>
    </AppShell>
  );
}
