/**
 * 06 — Mobile-money payout with preflight
 *
 * The amount + fee is debited from your balance immediately when you
 * create the payout. Always:
 *
 *   1. Ask for the fee via `payouts.mobile.fee({ amount })` → note `totalAmount`.
 *   2. Check `payments.balance()` has at least `totalAmount` available.
 *   3. Only then call `payouts.mobile.send(...)`.
 *
 * Minimum payout amount is 5,000 TZS (the SDK validates client-side).
 */
import { Snippe } from "../src";

const snippe = new Snippe({
  apiKey: requireEnv("SNIPPE_API_KEY"),
  webhookUrl: "https://example.com/webhooks/snippe",
});

async function main() {
  const amount = 50_000; // 50,000 TZS to the recipient

  // 1. Fee preflight
  const fee = await snippe.payouts.mobile.fee({ amount });
  console.log(`Fee: ${fee.feeAmount} TZS → total debit: ${fee.totalAmount} TZS`);

  // 2. Balance check
  const { available } = await snippe.payments.balance();
  if (available.value < fee.totalAmount) {
    console.error(
      `Insufficient balance: ${available.value} available, need ${fee.totalAmount}`,
    );
    process.exit(1);
  }

  // 3. Send — same `idempotencyKey` across retries is key for payout safety.
  const payout = await snippe.payouts.mobile.send(
    {
      amount,
      phoneNumber: "0781000000",
      recipientName: "Employee Name",
      narration: "Salary January 2026",
      metadata: { employeeId: "EMP-001" },
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
