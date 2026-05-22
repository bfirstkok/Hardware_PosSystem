"use client";

import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LogIn } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const deviceReason = searchParams.get("device");
  const deviceMessage =
    deviceReason === "blocked"
      ? "อุปกรณ์นี้ถูกปิดกั้น ต้องให้ผู้ดูแลอนุมัติก่อน"
      : deviceReason === "revoked"
        ? "session ของอุปกรณ์นี้ถูกยกเลิกแล้ว กรุณาเข้าสู่ระบบใหม่"
        : "";

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      setError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
      return;
    }

    router.push("/dashboard");
    router.refresh();
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
            <p className="text-sm text-slate-500">ใช้บัญชี Supabase Auth</p>
          </div>
        </div>

        <label className="mt-6 block text-sm font-medium">
          อีเมล
          <input
            className="mt-2 h-11 w-full rounded-md border border-slate-300 px-3 outline-none focus:border-emerald-600"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </label>

        <label className="mt-4 block text-sm font-medium">
          รหัสผ่าน
          <input
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
