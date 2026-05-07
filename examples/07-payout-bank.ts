/**
 * 07 — Bank transfer payout
 *
 * Same preflight pattern as mobile-money payouts, but you supply a bank
 * code, account number, and account name. The account name must match
 * what the bank has on file, or the transfer may be rejected.
 *
 * See the SDK's `BankCode` type for the full list of supported codes
 * (CRDB, NMB, NBC, ABSA, Equity, KCB, Stanbic, and more).
 */
import { Snippe } from "../src";

const snippe = new Snippe({
  apiKey: requireEnv("SNIPPE_API_KEY"),
  webhookUrl: "https://example.com/webhooks/snippe",
});

async function main() {
  const amount = 100_000; // 100,000 TZS

  const fee = await snippe.payouts.bank.fee({ amount });
  const { available } = await snippe.payments.balance();
  if (available.value < fee.totalAmount) {
    console.error(`Insufficient balance (need ${fee.totalAmount}, have ${available.value})`);
    process.exit(1);
  }

  const payout = await snippe.payouts.bank.send({
    amount,
    bankCode: "CRDB",
    accountNumber: "0150000000000",
    accountName: "Acme Vendor Ltd",
    narration: "Invoice INV-2026-001",
    metadata: { invoiceId: "INV-2026-001" },
  });

  console.log("Bank payout created:");
  console.log("  reference         :", payout.reference);
  console.log("  externalReference :", payout.externalReference);
  console.log("  fees              :", payout.fees.value, "TZS");
  console.log("  total             :", payout.total.value, "TZS");
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
