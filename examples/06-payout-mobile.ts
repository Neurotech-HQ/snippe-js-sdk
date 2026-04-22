/**
 * 06 — Mobile-money payout with preflight
 *
 * The amount + fee is debited from your balance immediately when you
 * create the payout. Always:
 *
 *   1. Ask for the fee via `payouts.fee(amount)` → note `total_amount`.
 *   2. Check `payments.balance()` has at least `total_amount` available.
 *   3. Only then call `payouts.send(...)`.
 *
 * Minimum payout amount is 5,000 TZS.
 */
import { Snippe } from "../src";

const snippe = new Snippe({
  apiKey: requireEnv("SNIPPE_API_KEY"),
  webhookUrl: "https://example.com/webhooks/snippe",
});

async function main() {
  const amount = 50_000; // 50,000 TZS to the recipient

  // 1. Fee preflight
  const fee = await snippe.payouts.fee(amount);
  console.log(`Fee: ${fee.fee_amount} TZS → total debit: ${fee.total_amount} TZS`);

  // 2. Balance check
  const { available } = await snippe.payments.balance();
  if (available.value < fee.total_amount) {
    console.error(
      `Insufficient balance: ${available.value} available, need ${fee.total_amount}`,
    );
    process.exit(1);
  }

  // 3. Send — same `idempotencyKey` across retries is key for payout safety.
  const payout = await snippe.payouts.send(
    {
      amount,
      channel: "mobile",
      recipient_phone: "255781000000",
      recipient_name: "Employee Name",
      narration: "Salary January 2026",
      metadata: { employee_id: "EMP-001" },
    },
    { idempotencyKey: "payout-emp001-jan" }, // ≤30 chars
  );

  console.log("Payout created:");
  console.log("  reference :", payout.reference);
  console.log("  provider  :", payout.channel.provider); // auto-detected: airtel/mpesa/mixx/halotel
  console.log("  fees      :", payout.fees.value, "TZS");
  console.log("  total     :", payout.total.value, "TZS");
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
