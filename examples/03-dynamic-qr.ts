/**
 * 03 — Dynamic QR (scan-to-pay)
 *
 * Generate a one-shot QR the customer scans with their mobile-money app.
 * Typical use cases: in-person POS, printed invoices, receipts.
 *
 * The returned `payment_qr_code` is a raw EMV QR payload string. Render
 * it with any QR library (e.g. the `qrcode` npm package).
 */
import { Snippe } from "../src";

const snippe = new Snippe({
  apiKey: requireEnv("SNIPPE_API_KEY"),
  webhookUrl: "https://example.com/webhooks/snippe",
});

async function main() {
  const payment = await snippe.payments.create({
    payment_type: "dynamic-qr",
    details: { amount: 1_500 }, // 1,500 TZS
    metadata: { till_id: "TILL-42", receipt_no: "R-2026-0001" },
  });

  console.log("Payment reference:", payment.reference);
  console.log("QR payload (render as an image):");
  console.log(payment.payment_qr_code);

  // Example with the `qrcode` package:
  //   import QRCode from "qrcode";
  //   const dataUrl = await QRCode.toDataURL(payment.payment_qr_code!);
  //   // Send `dataUrl` to your POS/browser for rendering.
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required env var: ${name}`);
    process.exit(1);
  }
  return value;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
