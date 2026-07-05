"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ManualPaymentClient({ onDone }: { onDone?: (res: any) => void }) {
  const [saleId, setSaleId] = useState<string | null>(null);
  const [amount, setAmount] = useState<number | "">("");
  const [method, setMethod] = useState<string>("transfer");
  const [reference, setReference] = useState("");
  const [provider, setProvider] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit() {
    setMessage(null);
    if (!amount || Number(amount) <= 0) {
      setMessage("จำนวนเงินต้องมากกว่า 0");
      return;
    }

    setLoading(true);
    try {
      let metadata: any = null;

      if (file) {
        const supabase = createClient();
        const filePath = `payment-proofs/${Date.now()}_${file.name}`;
        const upload = await supabase.storage.from("payment-proofs").upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

        if (upload.error) throw new Error(upload.error.message);

        const { data: publicData } = supabase.storage.from("payment-proofs").getPublicUrl(filePath);
        metadata = { proof_url: publicData.publicUrl };
      }

      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          sale_id: saleId ? Number(saleId) : null,
          amount: Number(amount),
          payment_method: method,
          reference_no: reference || null,
          provider: provider || null,
          metadata,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Failed");
      setMessage("บันทึกการชำระเงินเรียบร้อย");
      setAmount("");
      setReference("");
      setProvider("");
      setFile(null);
      onDone?.(data);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2 rounded border border-slate-200 bg-white p-3 text-sm">
      <div className="text-sm font-medium">บันทึกการชำระเงิน (manual)</div>
      <label className="block">
        Sale ID (ถ้ามี)
        <input className="mt-1 w-full rounded border px-2 py-1" value={saleId ?? ""} onChange={(e) => setSaleId(e.target.value || null)} />
      </label>
      <label className="block">
        จำนวน
        <input className="mt-1 w-full rounded border px-2 py-1" type="number" value={amount as any} onChange={(e) => setAmount(e.target.value === "" ? "" : Number(e.target.value))} />
      </label>
      <label className="block">
        วิธีชำระ
        <select className="mt-1 w-full rounded border px-2 py-1" value={method} onChange={(e) => setMethod(e.target.value)}>
          <option value="cash">เงินสด</option>
          <option value="transfer">โอน</option>
          <option value="card">บัตร</option>
          <option value="qr">QR</option>
          <option value="other">อื่นๆ</option>
        </select>
      </label>
      <label className="block">
        อ้างอิง / เลขที่
        <input className="mt-1 w-full rounded border px-2 py-1" value={reference} onChange={(e) => setReference(e.target.value)} />
      </label>
      <label className="block">
        Provider (optional)
        <input className="mt-1 w-full rounded border px-2 py-1" value={provider} onChange={(e) => setProvider(e.target.value)} />
      </label>

      <label className="block">
        หลักฐานการชำระ (รูป)
        <input className="mt-1 w-full" type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      </label>

      {message ? <div className="text-sm text-slate-600">{message}</div> : null}

      <div className="flex gap-2">
        <button onClick={submit} disabled={loading} className="inline-flex h-10 items-center justify-center gap-2 rounded bg-emerald-700 px-4 text-white">
          {loading ? "กำลังบันทึก..." : "บันทึกการชำระ"}
        </button>
      </div>
    </div>
  );
}
