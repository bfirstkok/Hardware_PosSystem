import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  const { payment_id } = await req.json().catch(() => ({}));

  if (!payment_id) {
    return NextResponse.json({ error: "payment_id required" }, { status: 400 });
  }

  const supabase = await createClient();

  // Verify and mark payment as succeeded (staff confirmation)
  const { data, error } = await supabase
    .from("payments")
    .update({ status: "succeeded" })
    .eq("id", payment_id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Check if all payments for associated sale are complete
  if (data?.sale_id) {
    const saleId = data.sale_id;
    const { data: saleData } = await supabase
      .from("sales")
      .select("id, total_amount")
      .eq("id", saleId)
      .single();

    if (saleData) {
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

  return NextResponse.json({ payment: data });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const paymentId = searchParams.get("id");

  if (!paymentId) {
    return NextResponse.json({ error: "id query param required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payments")
    .select("id, status, amount, payment_method")
    .eq("id", paymentId)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ payment: data });
}
