"use client";

import { useEffect, useState } from "react";
import { QrCode, ShoppingCart, Check, Clock } from "lucide-react";

type DisplayItem = {
  productId: number;
  name: string;
  qty: number;
  unitPrice: number;
};

type PaymentState = "pending" | "completed" | "paid";

export default function DisplayClient() {
  const [items, setItems] = useState<DisplayItem[]>([]);
  const [subtotal, setSubtotal] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [changeAmount, setChangeAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentState>("pending");
  const [paymentId, setPaymentId] = useState<number | null>(null);
  const [customerMessage, setCustomerMessage] = useState("");
  const [pollPaymentStatus, setPollPaymentStatus] = useState<string | null>(null);

  // Listen to parent window/localStorage for payment updates
  useEffect(() => {
    const handleStorageChange = () => {
      const data = localStorage.getItem("pos_display_state");
      if (data) {
        try {
          const state = JSON.parse(data);
          setItems(state.items ?? []);
          setSubtotal(state.subtotal ?? 0);
          setDiscountAmount(state.discountAmount ?? 0);
          setTotalAmount(state.totalAmount ?? 0);
          setPaidAmount(state.paidAmount ?? 0);
          setChangeAmount(state.changeAmount ?? 0);
          setPaymentMethod(state.paymentMethod ?? null);
          setQrCode(state.qrCode ?? null);
          setPaymentStatus(state.paymentStatus ?? "pending");
          setPaymentId(state.paymentId ?? null);
          setCustomerMessage(state.customerMessage ?? "");
        } catch (err) {
          console.error("Failed to parse display state", err);
        }
      }
    };

    handleStorageChange();
    window.addEventListener("storage", handleStorageChange);
    const timer = setInterval(handleStorageChange, 500);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(timer);
    };
  }, []);

  // Poll payment status for QR/Transfer
  useEffect(() => {
    if (!paymentId || paymentStatus !== "completed" || (paymentMethod !== "qr" && paymentMethod !== "transfer")) {
      setPollPaymentStatus(null);
      return;
    }

    const pollStatus = async () => {
      try {
        const res = await fetch(`/api/payments/verify-qr?id=${paymentId}`);
        const data = await res.json();
        if (!res.ok) return;

        if (data.payment?.status === "succeeded") {
          setPollPaymentStatus("succeeded");
          // Signal POS to auto-record sale
          localStorage.setItem("pos_payment_verified", JSON.stringify({ paymentId, status: "succeeded" }));
        } else {
          setPollPaymentStatus(data.payment?.status ?? null);
        }
      } catch (err) {
        console.error("Poll error", err);
      }
    };

    pollStatus();
    const interval = setInterval(pollStatus, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [paymentId, paymentStatus, paymentMethod]);

  function money(value: number) {
    return value.toLocaleString("th-TH", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 text-white p-4">
      <div className="mx-auto max-w-md">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="inline-block rounded-lg bg-emerald-600 p-3 mb-3">
            <ShoppingCart size={32} />
          </div>
          <h1 className="text-2xl font-bold">Hardware POS</h1>
          <p className="text-sm text-slate-400 mt-1">แคชเชียร์ร้านวัสดุก่อสร้าง</p>
        </div>

        {/* Items List */}
        {items.length > 0 ? (
          <div className="mb-6 rounded-lg bg-slate-800 border border-slate-700 p-4 max-h-64 overflow-y-auto">
            <h2 className="text-sm font-semibold mb-3 text-slate-300">รายการสินค้า</h2>
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <div className="flex-1">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs text-slate-400">
                      {item.qty.toLocaleString("th-TH", {
                        maximumFractionDigits: 2,
                      })} × {money(item.unitPrice)}
                    </div>
                  </div>
                  <div className="text-right font-semibold">
                    {money(item.qty * item.unitPrice)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* Summary */}
        <div className="mb-6 rounded-lg bg-slate-800 border border-slate-700 p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400">รวม</span>
            <span>{money(subtotal)}</span>
          </div>
          {discountAmount > 0 ? (
            <div className="flex justify-between">
              <span className="text-slate-400">ส่วนลด</span>
              <span>-{money(discountAmount)}</span>
            </div>
          ) : null}
          <div className="border-t border-slate-600 pt-2 flex justify-between font-semibold text-lg">
            <span>ยอดสุทธิ</span>
            <span className="text-emerald-400">{money(totalAmount)}</span>
          </div>
        </div>

        {/* Payment Status */}
        {paymentStatus === "pending" && !qrCode ? (
          <div className="mb-6 rounded-lg bg-slate-800 border border-slate-700 p-4 text-center">
            <div className="flex justify-center mb-3">
              <Clock size={32} className="text-amber-400 animate-spin" />
            </div>
            <p className="font-semibold mb-2">รอการชำระเงิน</p>
            <p className="text-sm text-slate-400">{customerMessage || "กรุณารอสักครู่..."}</p>
          </div>
        ) : null}

        {/* QR Code PromptPay */}
        {paymentMethod === "qr" && qrCode ? (
          <div className="mb-6 rounded-lg bg-slate-800 border border-slate-700 p-4 text-center">
            <div className="flex justify-center mb-3">
              <QrCode size={32} className="text-emerald-400" />
            </div>
            <p className="font-semibold mb-3">สแกน QR PromptPay</p>
            <div className="bg-white p-3 rounded inline-block mb-3">
              <img src={qrCode} alt="PromptPay QR" className="w-48 h-48" />
            </div>
            <p className="text-sm text-slate-400">ยอดเงินที่ต้องชำระ: {money(totalAmount)}</p>

            {/* Poll status */}
            {pollPaymentStatus ? (
              <div className="mt-3 text-xs">
                {pollPaymentStatus === "succeeded" ? (
                  <div className="text-emerald-400">ชำระเงินสำเร็จ!</div>
                ) : (
                  <div className="text-amber-400">กำลังตรวจสอบ...</div>
                )}
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Payment Complete - Show Change */}
        {pollPaymentStatus === "succeeded" || (paymentStatus === "completed" && paymentMethod === "cash") ? (
          <div className="mb-6 rounded-lg bg-emerald-900 border border-emerald-700 p-4 text-center">
            <div className="flex justify-center mb-3">
              <Check size={32} className="text-emerald-400" />
            </div>
            <p className="font-semibold mb-3">ชำระเงินเรียบร้อย</p>
            <div className="bg-emerald-800 rounded p-3 mb-3">
              <p className="text-sm text-emerald-300 mb-1">เงินทอน</p>
              <p className="text-3xl font-bold text-emerald-100">{money(changeAmount)}</p>
            </div>
            <p className="text-sm text-emerald-300 mb-3">วิธีชำระ: {paymentMethod}</p>
            <p className="text-sm text-emerald-400">ขอบคุณที่ใช้บริการ</p>
          </div>
        ) : null}

        {/* Loading */}
        {paymentStatus === "pending" && !qrCode ? (
          <div className="text-center text-sm text-slate-400">
            <div className="inline-block animate-pulse">กำลังเตรียม...</div>
          </div>
        ) : null}
      </div>
    </main>
  );
}
