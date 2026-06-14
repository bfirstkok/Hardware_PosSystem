"use client";

import { FormEvent, Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LogIn } from "lucide-react";
import { normalizeLocalNextPath } from "@/lib/protected-routes";

function LoginForm() {
  const searchParams = useSearchParams();
  const [employeeCode, setEmployeeCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const deviceReason = searchParams.get("device");
  const authReason = searchParams.get("auth");
  const nextPath = normalizeLocalNextPath(searchParams.get("next"));
  const deviceMessage =
    deviceReason === "blocked"
      ? "อุปกรณ์นี้ถูกปิดกั้น ต้องให้ผู้ดูแลอนุมัติก่อน"
      : deviceReason === "revoked"
        ? "session ของอุปกรณ์นี้ถูกยกเลิกแล้ว กรุณาเข้าสู่ระบบใหม่"
        : "";
  const authMessage =
    authReason === "staff-profile-missing"
      ? "เข้าสู่ระบบได้แล้ว แต่ไม่พบ staff_profiles ที่ active สำหรับบัญชีนี้"
      : authReason === "no-session"
        ? "เข้าสู่ระบบไม่สำเร็จ session ไม่ถูกบันทึกใน browser"
      : "";

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const response = await fetch("/auth/employee-login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        employeeCode,
        password,
        nextPath,
      }),
    });

    setLoading(false);

    if (!response.ok) {
      const result = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(result?.error ?? "รหัสพนักงานหรือรหัสผ่านไม่ถูกต้อง");
      return;
    }

    const result = (await response.json()) as { defaultPath?: string };
    localStorage.removeItem("hardware-pos-current-device-id");
    window.location.assign(result.defaultPath ?? "/pos");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <form onSubmit={handleLogin} className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-md bg-emerald-50 text-emerald-700">
            <LogIn size={22} />
          </div>
          <div>
            <h1 className="text-xl font-semibold">เข้าสู่ระบบ POS</h1>
            <p className="text-sm text-slate-500">ใช้รหัสพนักงานและรหัสผ่าน</p>
          </div>
        </div>

        <label className="mt-6 block text-sm font-medium">
          รหัสพนักงานหรืออีเมล
          <input
            autoCapitalize="none"
            autoCorrect="off"
            className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-emerald-600"
            placeholder="EMP001 หรือ admin@hardwarepos.dev"
            type="text"
            value={employeeCode}
            onChange={(event) => setEmployeeCode(event.target.value)}
            required
          />
        </label>

        <label className="mt-4 block text-sm font-medium">
          รหัสผ่าน
          <input
            autoCapitalize="none"
            autoCorrect="off"
            className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-emerald-600"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>

        {deviceMessage ? (
          <p className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            {deviceMessage}
          </p>
        ) : null}

        {authMessage ? (
          <p className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {authMessage}
          </p>
        ) : null}

        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

        <button
          type="submit"
          disabled={loading}
          className="mt-6 h-11 w-full rounded-md bg-slate-950 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
        </button>
      </form>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
