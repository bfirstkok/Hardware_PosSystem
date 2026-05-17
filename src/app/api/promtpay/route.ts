import { NextResponse } from "next/server";

/**
 * Generate PromptPay QR code in TQR format
 * Reference: PromptPay standard for Thailand
 */
export async function POST(req: Request) {
  const { amount, phoneNumber, taxId } = await req.json().catch(() => ({}));

  if (!amount || typeof amount !== "number" || amount <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  // For now, return a placeholder QR data URL
  // In production, integrate with a QR code library or PromptPay API
  // This example uses a simple QR code SVG placeholder
  try {
    const data = {
      amount: amount.toFixed(2),
      timestamp: new Date().toISOString(),
      type: "promptpay",
    };

    // Encode to simple QR-like format (placeholder for demo)
    // In production, use: qrcode library or call PromptPay API
    const qrString = Buffer.from(JSON.stringify(data)).toString("base64");

    // Return a data URL (in production use actual QR generation)
    // For now, use a simple placeholder image from qr-server
    const encodedData = encodeURIComponent(
      `PromptPay Amount: ${amount.toFixed(2)} THB`
    );
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodedData}`;

    return NextResponse.json({
      qrCode: qrImageUrl,
      amount: amount.toFixed(2),
      type: "promptpay",
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate QR" },
      { status: 500 }
    );
  }
}
