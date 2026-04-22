/**
 * 10 — Reconciliation by polling
 *
 * Webhooks are the recommended way to learn a payment's terminal state,
 * but sometimes they aren't viable (no public URL, scheduled reconciliation
 * job, investigating a stuck payment, etc.). This polls `payments.get`
 * until the payment reaches a terminal state or the deadline expires.
 *
 * Snippe mobile payments expire after 4 hours if not authorised, so that's
 * the natural upper bound for polling.
 */
import { Snippe, type Payment, type PaymentStatus } from "../src";

const snippe = new Snippe({ apiKey: requireEnv("SNIPPE_API_KEY") });

const TERMINAL_STATUSES: ReadonlySet<PaymentStatus> = new Set([
  "completed",
  "failed",
  "voided",
  "expired",
]);

async function waitForTerminalState(
  reference: string,
  {
    intervalMs = 5_000,
    timeoutMs = 4 * 60 * 60 * 1000, // 4 hours
  }: { intervalMs?: number; timeoutMs?: number } = {},
): Promise<Payment> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const payment = await snippe.payments.get(reference);
    if (TERMINAL_STATUSES.has(payment.status)) {
      return payment;
    }
    await sleep(intervalMs);
  }

  throw new Error(`Payment ${reference} did not settle within ${timeoutMs}ms`);
}

async function main() {
  // Replace with a real reference from your records — typically from a
  // prior `payments.create` call.
  const reference = process.argv[2] ?? requireEnv("PAYMENT_REFERENCE");

  console.log(`Polling ${reference}…`);
  const payment = await waitForTerminalState(reference, { intervalMs: 3_000 });
  console.log(`Final status: ${payment.status}`);
  console.log(payment);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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
