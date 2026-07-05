import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const action = body.action ?? "create";

  const supabase = await createClient();

  if (action === "create") {
    const { sale_id, amount, payment_method, reference_no, provider, metadata } = body;

    if (typeof amount !== "number" || amount < 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }

    const status = payment_method === "cash" ? "succeeded" : "pending";

    const { data, error } = await supabase
      .from("payments")
      .insert({
        sale_id: sale_id ?? null,
        amount,
        payment_method: payment_method ?? "other",
        reference_no: reference_no ?? null,
        provider: provider ?? null,
        metadata: metadata ?? null,
        status,
      })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // If payment is linked to a sale and succeeded, check total paid and mark sale as paid when covered
    try {
      if (data?.sale_id) {
        const saleId = data.sale_id;
        // get sale total_amount
        const { data: saleData, error: saleErr } = await supabase
          .from("sales")
          .select("id, total_amount")
          .eq("id", saleId)
          .single();

        if (!saleErr && saleData) {
          // sum succeeded payments for this sale
          const { data: paymentsSum } = await supabase
            .from("payments")
            .select("amount")
            .eq("sale_id", saleId)
            .eq("status", "succeeded");

          const sum = (paymentsSum ?? []).reduce((s: number, p: any) => s + Number(p.amount || 0), 0);

          if (sum >= Number(saleData.total_amount ?? 0)) {
            await supabase.from("sales").update({ status: "paid" }).eq("id", saleId);
          }
        }
      }
    } catch (err) {
      // ignore errors in post-processing
      console.error("post-payment update error", err);
    }

    return NextResponse.json({ payment: data });
  }

  if (action === "verify") {
    const { payment_id, status } = body;
    if (!payment_id) return NextResponse.json({ error: "payment_id required" }, { status: 400 });
    if (!["pending", "succeeded", "failed", "refunded"].includes(status)) {
      return NextResponse.json({ error: "invalid status" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("payments")
      .update({ status })
      .eq("id", payment_id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // If payment linked to sale and now succeeded, re-evaluate sale paid state
    try {
      if (data?.sale_id && status === "succeeded") {
        const saleId = data.sale_id;
        const { data: saleData, error: saleErr } = await supabase
          .from("sales")
          .select("id, total_amount")
          .eq("id", saleId)
          .single();

        if (!saleErr && saleData) {
          const { data: paymentsSum } = await supabase
            .from("payments")
            .select("amount")
            .eq("sale_id", saleId)
            .eq("status", "succeeded");

          const sum = (paymentsSum ?? []).reduce((s: number, p: any) => s + Number(p.amount || 0), 0);

          if (sum >= Number(saleData.total_amount ?? 0)) {
            await supabase.from("sales").update({ status: "paid" }).eq("id", saleId);
          }
        }
      }
    } catch (err) {
      console.error("post-payment verify error", err);
    }

    return NextResponse.json({ payment: data });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("status", "pending")
    .order("payment_date", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ payments: data });
}
