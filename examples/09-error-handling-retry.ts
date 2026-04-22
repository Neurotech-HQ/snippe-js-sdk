/**
 * 09 — Error handling and retry loop
 *
 * Different errors need different recovery strategies:
 *
 *   - 400/401/403/422    — do NOT retry, the request shape is wrong
 *   - 429                — wait `rateLimit.resetSeconds` and try again
 *   - 5xx / PAY_001      — retry with exponential backoff + jitter
 *   - network / timeout  — retry as above
 *
 * Always reuse the same idempotency key across retries so the server
 * can dedupe if your first attempt actually succeeded but the network
 * swallowed the response.
 */
import {
  Snippe,
  SnippeError,
  SnippeRateLimitError,
  generateIdempotencyKey,
  type CreatePaymentParams,
  type Payment,
} from "../src";

const snippe = new Snippe({ apiKey: requireEnv("SNIPPE_API_KEY") });

async function createWithRetry(
  params: CreatePaymentParams,
  maxAttempts = 6,
): Promise<Payment> {
  const idempotencyKey = generateIdempotencyKey(); // stable across retries

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await snippe.payments.create(params, { idempotencyKey });
    } catch (err) {
      if (!(err instanceof SnippeError)) throw err;

      // Non-retryable: fix the request.
      if (!err.retryable) throw err;

      // Rate limit: honour the reset header.
      if (err instanceof SnippeRateLimitError) {
        const wait = err.rateLimit?.resetSeconds ?? 60;
        console.warn(`Rate limited — sleeping ${wait}s`);
        await sleep(wait * 1000);
        continue;
      }

      // 5xx / PAY_001 / network / timeout: exponential backoff with jitter.
      const base = Math.min(60_000, 2 ** attempt * 1000);
      const jitter = Math.floor(Math.random() * 1000);
      console.warn(
        `Attempt ${attempt + 1} failed (${err.errorCode}), retrying in ${(base + jitter) / 1000}s…`,
      );
      await sleep(base + jitter);
    }
  }

  throw new Error("Exceeded max retry attempts");
}

async function main() {
  const payment = await createWithRetry({
    payment_type: "mobile",
    details: { amount: 500 },
    phone_number: "255781000000",
    customer: { firstname: "Jane", lastname: "Doe", email: "jane@example.com" },
  });
  console.log("Created:", payment.reference, payment.status);
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
