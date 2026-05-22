"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import {
  Ban,
  CheckCircle2,
  Clock3,
  Laptop,
  MapPin,
  MonitorSmartphone,
  Search,
  ShieldAlert,
  ShieldCheck,
  TabletSmartphone,
  Wifi,
  X,
} from "lucide-react";
import { approveDevice, blockDevice, revokeDevice, syncCurrentDevice } from "./actions";

type SessionStatus = "online" | "idle" | "blocked" | "revoked";
type DeviceFilter = "all" | "online" | "new" | "blocked" | "revoked";

export type DeviceSessionView = {
  id: string;
  deviceKey: string;
  deviceName: string;
  deviceType: string;
  userEmail: string;
  role: string;
  branch: string;
  ipAddress: string;
  location: string;
  browser: string;
  os: string;
  loginAt: string;
  lastSeenAt: string;
  status: SessionStatus;
  trusted: boolean;
  isNewDevice: boolean;
  source: "auto" | "manual";
};

export type DeviceAuditView = {
  id: number;
  action: string;
  detail: string;
  createdAt: string;
};

const filterOptions: Array<{ value: DeviceFilter; label: string }> = [
  { value: "all", label: "ทั้งหมด" },
  { value: "online", label: "ออนไลน์" },
  { value: "new", label: "อุปกรณ์ใหม่" },
  { value: "blocked", label: "ถูกปิดกั้น" },
  { value: "revoked", label: "ยกเลิกแล้ว" },
];

const statusLabel: Record<SessionStatus, string> = {
  online: "ออนไลน์",
  idle: "พัก session",
  blocked: "ปิดกั้น",
  revoked: "ยกเลิกแล้ว",
};

const statusClass: Record<SessionStatus, string> = {
  online: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  idle: "bg-amber-50 text-amber-700 ring-amber-200",
  blocked: "bg-red-50 text-red-700 ring-red-200",
  revoked: "bg-slate-100 text-slate-600 ring-slate-200",
};

function detectBrowserName() {
  const userAgent = navigator.userAgent;
  if (userAgent.includes("Firefox")) return "Firefox";
  if (userAgent.includes("Edg")) return "Edge";
  if (userAgent.includes("Chrome")) return "Chrome";
  if (userAgent.includes("Safari")) return "Safari";
  return "Browser";
}

function detectPlatformName() {
  return navigator.platform || "ไม่ทราบระบบ";
}

function currentDeviceKey() {
  const key = "hardware-pos-current-device-id";
  const storedId = window.localStorage.getItem(key);
  if (storedId) return storedId;

  const nextId = `CURRENT-${crypto.randomUUID()}`;
  window.localStorage.setItem(key, nextId);
  return nextId;
}

function matchesFilter(session: DeviceSessionView, activeFilter: DeviceFilter) {
  if (activeFilter === "all") return true;
  if (activeFilter === "new") return session.isNewDevice;
  return session.status === activeFilter;
}

function matchesSearch(session: DeviceSessionView, query: string) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;

  return [
    session.deviceName,
    session.deviceType,
    session.userEmail,
    session.role,
    session.branch,
    session.ipAddress,
    session.location,
    session.id,
  ]
    .join(" ")
    .toLowerCase()
    .includes(normalizedQuery);
}

export function DevicesClient({
  currentUserEmail,
  currentUserId,
  sessions,
  auditLog,
  dbError,
}: {
  currentUserEmail: string | null;
  currentUserId: string | null;
  sessions: DeviceSessionView[];
  auditLog: DeviceAuditView[];
  dbError?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeFilter, setActiveFilter] = useState<DeviceFilter>("all");
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (dbError) return;

    const platform = detectPlatformName();
    const browser = detectBrowserName();
    const userLabel = currentUserEmail ?? currentUserId ?? "unknown-user";

    startTransition(async () => {
      await syncCurrentDevice({
        deviceKey: currentDeviceKey(),
        deviceName: `Acer ${platform} - ${browser}`,
        deviceType: "เครื่องนี้",
        browser,
        os: platform,
        metadata: { userLabel },
      });
      router.refresh();
    });
  }, [currentUserEmail, currentUserId, dbError, router]);

  const filteredSessions = useMemo(
    () => sessions.filter((session) => matchesFilter(session, activeFilter) && matchesSearch(session, query)),
    [activeFilter, query, sessions],
  );

  const newDeviceAlerts = sessions.filter((session) => session.isNewDevice && session.status !== "blocked");
  const metrics = [
    { label: "อุปกรณ์ออนไลน์", value: sessions.filter((session) => session.status === "online").length, icon: Wifi },
    { label: "อุปกรณ์ใหม่", value: sessions.filter((session) => session.isNewDevice).length, icon: ShieldAlert },
    { label: "เชื่อถือแล้ว", value: sessions.filter((session) => session.trusted).length, icon: ShieldCheck },
    { label: "ถูกปิดกั้น", value: sessions.filter((session) => session.status === "blocked").length, icon: Ban },
  ];

  return (
    <AppShell>
      <main className="p-4 lg:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-slate-500">บริหาร</p>
            <h1 className="mt-1 text-2xl font-semibold">อุปกรณ์ที่เข้าสู่ระบบ</h1>
          </div>
          <div className="inline-flex h-10 items-center gap-2 rounded-md bg-slate-900 px-3 text-sm font-medium text-white shadow-sm">
            <MonitorSmartphone size={17} />
            {isPending ? "กำลังบันทึกเครื่องนี้" : "บันทึกเครื่องนี้อัตโนมัติ"}
          </div>
        </div>

        {dbError ? (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            ยังไม่พบ table สำหรับอุปกรณ์ ให้รัน migration{" "}
            <span className="font-mono">supabase/migrations/202605220001_device_sessions.sql</span> ใน Supabase SQL Editor
            ก่อนใช้งานจริง
            <div className="mt-2 text-xs text-amber-800">{dbError}</div>
          </div>
        ) : null}

        <section className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <div className="font-semibold">วิธีดูสำหรับเจ้าของร้าน</div>
          <div className="mt-2 grid gap-2 md:grid-cols-3">
            <div>1. ระบบเพิ่มเครื่องที่ล็อกอินเข้ามาให้เอง</div>
            <div>2. ดู email/ไอดี, เวลา, browser, IP แล้วเลือกสถานะ</div>
            <div>3. ใช้ปุ่ม “อนุมัติ”, “ปิดกั้น”, “ยกเลิก” ที่แถวอุปกรณ์</div>
          </div>
        </section>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => (
            <MetricCard key={metric.label} metric={metric} />
          ))}
        </div>

        <section className="mt-6 rounded-lg border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="font-semibold">อุปกรณ์ออนไลน์และ session</h2>
              <p className="text-sm text-slate-500">ข้อมูลมาจาก Supabase table `device_sessions`</p>
            </div>
            <label className="relative block w-full sm:w-80">
              <Search className="pointer-events-none absolute left-3 top-2.5 text-slate-400" size={16} />
              <span className="sr-only">ค้นหาอุปกรณ์</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-10 w-full rounded-md border border-slate-300 pl-9 pr-3 text-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200"
                placeholder="ค้นหา email, IP, อุปกรณ์, session"
                type="search"
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-2 border-b border-slate-200 px-5 py-3">
            {filterOptions.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => setActiveFilter(filter.value)}
                className={`h-9 rounded-md border px-3 text-sm font-medium ${
                  activeFilter === filter.value
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <DeviceTable sessions={filteredSessions} />
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <AlertPanel alerts={newDeviceAlerts} />
          <AuditPanel auditLog={auditLog} />
        </section>
      </main>
    </AppShell>
  );
}

function MetricCard({ metric }: { metric: { label: string; value: number; icon: typeof Wifi } }) {
  const Icon = metric.icon;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-sm text-slate-500">{metric.label}</div>
          <div className="mt-2 text-3xl font-semibold">{metric.value.toLocaleString("th-TH")}</div>
        </div>
        <div className="flex size-10 items-center justify-center rounded-md bg-slate-100 text-slate-700">
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

function DeviceTable({ sessions }: { sessions: DeviceSessionView[] }) {
  if (!sessions.length) {
    return <p className="px-5 py-8 text-sm text-slate-500">ไม่พบอุปกรณ์ตามเงื่อนไข</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1040px] text-left text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-5 py-3 font-semibold">อุปกรณ์</th>
            <th className="px-5 py-3 font-semibold">ผู้ใช้</th>
            <th className="px-5 py-3 font-semibold">IP / ที่ตั้ง</th>
            <th className="px-5 py-3 font-semibold">Session</th>
            <th className="px-5 py-3 font-semibold">สถานะ</th>
            <th className="px-5 py-3 text-right font-semibold">จัดการ</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {sessions.map((session) => (
            <DeviceRow key={session.id} session={session} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DeviceRow({ session }: { session: DeviceSessionView }) {
  const canApprove = !session.trusted || session.isNewDevice;
  const canRevoke = session.status !== "revoked" && session.status !== "blocked";

  return (
    <tr className="align-top">
      <td className="px-5 py-4">
        <div className="flex gap-3">
          <div className="mt-1 flex size-9 items-center justify-center rounded-md bg-slate-100 text-slate-700">
            {session.deviceType === "Tablet" ? <TabletSmartphone size={18} /> : <Laptop size={18} />}
          </div>
          <div>
            <div className="font-medium text-slate-950">{session.deviceName}</div>
            <div className="mt-1 text-xs text-slate-500">{session.deviceType}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge tone={session.trusted ? "green" : "amber"}>{session.trusted ? "trusted" : "untrusted"}</Badge>
              {session.isNewDevice ? <Badge tone="red">รออนุมัติ</Badge> : null}
              <Badge tone="green">{session.source === "auto" ? "เครื่องนี้อัตโนมัติ" : "เพิ่มเอง"}</Badge>
            </div>
          </div>
        </div>
      </td>
      <td className="px-5 py-4">
        <div className="font-medium text-slate-950">{session.userEmail}</div>
        <div className="mt-1 text-xs text-slate-500">{session.role}</div>
        <div className="mt-1 text-xs text-slate-500">{session.branch}</div>
      </td>
      <td className="px-5 py-4">
        <div className="font-mono text-sm text-slate-950">{session.ipAddress}</div>
        <div className="mt-2 flex items-center gap-1 text-xs text-slate-500">
          <MapPin size={13} />
          {session.location}
        </div>
        <div className="mt-1 text-xs text-slate-500">
          {session.browser} / {session.os}
        </div>
      </td>
      <td className="px-5 py-4">
        <div className="font-mono text-xs text-slate-700">{session.id}</div>
        <div className="mt-2 flex items-center gap-1 text-xs text-slate-500">
          <Clock3 size={13} />
          เข้า {session.loginAt}
        </div>
        <div className="mt-1 text-xs text-slate-500">ล่าสุด {session.lastSeenAt}</div>
      </td>
      <td className="px-5 py-4">
        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${statusClass[session.status]}`}>
          {statusLabel[session.status]}
        </span>
      </td>
      <td className="px-5 py-4">
        <div className="flex justify-end gap-2">
          <form action={approveDevice}>
            <input type="hidden" name="id" value={session.id} />
            <button
              type="submit"
              disabled={!canApprove}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <CheckCircle2 size={15} />
              อนุมัติ
            </button>
          </form>
          <form action={blockDevice}>
            <input type="hidden" name="id" value={session.id} />
            <button
              type="submit"
              className="inline-flex h-9 items-center gap-2 rounded-md border border-amber-200 px-3 text-sm font-medium text-amber-700 hover:bg-amber-50"
            >
              <Ban size={15} />
              ปิดกั้น
            </button>
          </form>
          <form action={revokeDevice}>
            <input type="hidden" name="id" value={session.id} />
            <button
              type="submit"
              disabled={!canRevoke}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-red-200 px-3 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <X size={15} />
              ยกเลิก
            </button>
          </form>
        </div>
      </td>
    </tr>
  );
}

function AlertPanel({ alerts }: { alerts: DeviceSessionView[] }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="font-semibold">แจ้งเตือนอุปกรณ์ใหม่</h2>
      </div>
      <div className="divide-y divide-slate-100">
        {alerts.length ? (
          alerts.map((device) => (
            <div key={device.id} className="px-5 py-4 text-sm">
              <div className="font-medium text-slate-950">{device.deviceName}</div>
              <div className="mt-1 text-slate-500">
                {device.userEmail} จาก IP {device.ipAddress}
              </div>
            </div>
          ))
        ) : (
          <p className="px-5 py-6 text-sm text-slate-500">ไม่มีอุปกรณ์ใหม่ที่ต้องตรวจสอบ</p>
        )}
      </div>
    </div>
  );
}

function AuditPanel({ auditLog }: { auditLog: DeviceAuditView[] }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-200 px-5 py-4">
        <h2 className="font-semibold">Audit log ล่าสุด</h2>
      </div>
      <div className="divide-y divide-slate-100">
        {auditLog.length ? (
          auditLog.map((entry) => (
            <div key={entry.id} className="px-5 py-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <div className="font-medium text-slate-950">{entry.action}</div>
                <div className="text-xs text-slate-500">{entry.createdAt}</div>
              </div>
              <div className="mt-1 text-slate-500">{entry.detail}</div>
            </div>
          ))
        ) : (
          <p className="px-5 py-6 text-sm text-slate-500">ยังไม่มีการจัดการ session</p>
        )}
      </div>
    </div>
  );
}

function Badge({ children, tone }: { children: React.ReactNode; tone: "green" | "amber" | "red" }) {
  const toneClass = {
    green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    amber: "bg-amber-50 text-amber-700 ring-amber-200",
    red: "bg-red-50 text-red-700 ring-red-200",
  };

  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${toneClass[tone]}`}>
      {children}
    </span>
  );
}
