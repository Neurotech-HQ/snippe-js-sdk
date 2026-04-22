/**
 * 02 — Card payment (Visa / Mastercard / local debit)
 *
 * Card payments require the full customer address block. Redirect the
 * customer to `payment_url` — Snippe's upstream processor hosts the
 * PCI-scoped card form. After the customer authorises, they come back
 * to `redirect_url` (success) or `cancel_url` (abandon/decline).
 *
 * Always trust the webhook, not the browser redirect, for settlement
 * state — the redirect can be spoofed or skipped.
 */
import { Snippe } from "../src";

const snippe = new Snippe({
  apiKey: requireEnv("SNIPPE_API_KEY"),
  webhookUrl: "https://example.com/webhooks/snippe",
});

async function main() {
  const payment = await snippe.payments.create({
    payment_type: "card",
    details: {
      amount: 25_000, // 25,000 TZS
      redirect_url: "https://example.com/payments/success",
      cancel_url: "https://example.com/payments/cancelled",
    },
    phone_number: "255781000000",
    customer: {
      firstname: "Jane",
      lastname: "Doe",
      email: "jane@example.com",
      address: "123 Samora Ave",
      city: "Dar es Salaam",
      state: "DSM",
      postcode: "14101",
      country: "TZ", // ISO 3166-1 alpha-2
    },
    metadata: { order_id: "ORD-CARD-001" },
  });

  console.log("Redirect the customer to:");
  console.log(" ", payment.payment_url);
  console.log("Reference (store this for reconciliation):", payment.reference);
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
