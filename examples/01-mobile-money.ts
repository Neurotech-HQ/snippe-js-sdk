/**
 * 01 — Mobile money payment (USSD push)
 *
 * The customer receives a USSD prompt on their phone and enters their
 * mobile-money PIN to authorise. Terminal status arrives via webhook
 * (or by polling `payments.get`).
 */
import { Snippe } from "../src";

const snippe = new Snippe({
  apiKey: requireEnv("SNIPPE_API_KEY"),
  webhookUrl: "https://example.com/webhooks/snippe",
});

async function main() {
  const payment = await snippe.payments.create({
    payment_type: "mobile",
    details: { amount: 500 }, // TZS, integer
    phone_number: "255781000000", // Airtel/M-Pesa/Mixx/Halotel auto-detected
    customer: {
      firstname: "Jane",
      lastname: "Doe",
      email: "jane@example.com",
    },
    metadata: { order_id: "ORD-12345" },
  });

  console.log("Created payment:");
  console.log("  reference :", payment.reference);
  console.log("  status    :", payment.status); // "pending"
  console.log("  expires   :", payment.expires_at);
  console.log("Customer now sees a USSD push on their phone.");
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
