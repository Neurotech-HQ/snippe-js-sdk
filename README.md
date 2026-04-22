# snippe-js-sdk

Official JavaScript / TypeScript SDK for [Snippe](https://snippe.sh) — the Tanzania payment platform (mobile money, cards, QR, and payouts).

- API version: `2026-01-25`
- Works in Node.js 18+ (uses built-in `fetch`)
- Fully typed, ESM + CJS

## Install

```bash
npm install snippe-js-sdk
```

## Quick start

```ts
import { Snippe } from "snippe-js-sdk";

const snippe = new Snippe({
  apiKey: process.env.SNIPPE_API_KEY!, // snp_...
  webhookUrl: "https://example.com/webhooks/snippe", // applied to creates by default
});

// Mobile money payment — customer gets a USSD push
const payment = await snippe.payments.create({
  payment_type: "mobile",
  details: { amount: 500 }, // TZS, integer
  phone_number: "255781000000",
  customer: {
    firstname: "Jane",
    lastname: "Doe",
    email: "jane@example.com",
  },
  metadata: { order_id: "ORD-12345" },
});

console.log(payment.reference, payment.status); // e.g. "9015c155-...", "pending"
```

The SDK auto-generates a short `Idempotency-Key` (≤30 chars) for every `POST`. Pass your own via the second argument:

```ts
await snippe.payments.create(params, { idempotencyKey: "ord-12345-t1" });
```

## Resources

### Payments

```ts
await snippe.payments.create({ payment_type: "mobile", ... });
await snippe.payments.create({ payment_type: "card", ... });
await snippe.payments.create({ payment_type: "dynamic-qr", ... });
await snippe.payments.get(reference);
await snippe.payments.list({ limit: 20, status: "completed" });
await snippe.payments.search({ phone_number: "255781000000" });
await snippe.payments.retriggerPush(reference);
await snippe.payments.balance();
```

### Hosted checkout sessions

```ts
const session = await snippe.sessions.create({
  amount: 50000,
  allowed_methods: ["mobile_money", "qr"],
  customer: { name: "John Doe", phone: "+255712345678" },
  description: "Order #12345",
  expires_in: 3600,
});

// Share `payment_link_url` via SMS/WhatsApp, or redirect to `checkout_url`
console.log(session.payment_link_url);
```

Custom-amount (donation / tip) sessions:

```ts
await snippe.sessions.create({
  allow_custom_amount: true,
  min_amount: 1000,
  max_amount: 500000,
  description: "Donation",
});
```

Other operations: `get`, `list`, `cancel`.

### Disbursements (payouts)

Always preflight with `fee()` + `balance()` before sending:

```ts
const amount = 50000;
const { total_amount } = await snippe.payouts.fee(amount);
const { available } = await snippe.payments.balance();

if (available.value < total_amount) {
  throw new Error("insufficient balance");
}

const payout = await snippe.payouts.send({
  amount,
  channel: "mobile",
  recipient_phone: "255781000000",
  recipient_name: "Employee Name",
  narration: "Salary January 2026",
});
```

Bank transfers:

```ts
await snippe.payouts.send({
  amount: 50000,
  channel: "bank",
  recipient_bank: "CRDB",
  recipient_account: "0150000000000",
  recipient_name: "Vendor Ltd",
});
```

## Webhooks

Snippe signs every webhook with HMAC-SHA256 over `{timestamp}.{raw_body}`. The SDK ships a `verifyWebhook` helper that handles signature verification, constant-time comparison, and replay protection.

**Critical**: use a middleware that gives you the **raw** request body, not a parsed one. Re-serializing JSON will break the signature.

```ts
import express from "express";
import { verifyWebhook, SnippeWebhookVerificationError } from "snippe-js-sdk";

const app = express();

app.post(
  "/webhooks/snippe",
  express.raw({ type: "application/json" }),
  (req, res) => {
    try {
      const event = verifyWebhook({
        rawBody: req.body, // Buffer, untouched
        signature: req.header("X-Webhook-Signature"),
        timestamp: req.header("X-Webhook-Timestamp"),
        signingKey: process.env.SNIPPE_WEBHOOK_SECRET!,
      });

      // Deduplicate on event.id (Snippe may deliver the same event twice)
      switch (event.type) {
        case "payment.completed":
          // event.data.amount is { value, currency }, NOT a plain integer
          console.log("paid", event.data.reference, event.data.amount.value);
          break;
        case "payment.failed":
          break;
        case "payout.completed":
          break;
      }

      // Respond 2xx within 30s — process heavy work async
      res.status(200).send("OK");
    } catch (err) {
      if (err instanceof SnippeWebhookVerificationError) {
        res.status(400).send("Invalid signature");
      } else {
        res.status(500).send("Internal error");
      }
    }
  },
);
```

## Errors

All API failures throw `SnippeError` (or a subclass). Branch on `errorCode`, not `message`:

```ts
import {
  SnippeError,
  SnippeRateLimitError,
  SnippeValidationError,
} from "snippe-js-sdk";

try {
  await snippe.payments.create(params);
} catch (err) {
  if (err instanceof SnippeRateLimitError) {
    const wait = err.rateLimit?.resetSeconds ?? 60;
    // back off for `wait` seconds...
  } else if (err instanceof SnippeValidationError) {
    // fix the request, don't retry
  } else if (err instanceof SnippeError && err.retryable) {
    // 5xx / PAY_001 / network — retry with the same idempotency key
  } else {
    throw err;
  }
}
```

> **`PAY_001` gotcha**: the single most common cause is an `Idempotency-Key` longer than 30 characters. The SDK auto-generates 24-char keys, and it proactively rejects oversized user-supplied keys before they hit the wire.

## Configuration

| Option        | Type                         | Default                       | Description                                              |
| ------------- | ---------------------------- | ----------------------------- | -------------------------------------------------------- |
| `apiKey`      | `string`                     | —                             | Required. `snp_...` from the Snippe Dashboard.           |
| `environment` | `"sandbox" \| "production"` | `"production"`                | Target environment.                                      |
| `baseUrl`     | `string`                     | `https://api.snippe.sh`       | Override the API base URL.                               |
| `timeoutMs`   | `number`                     | `30000`                       | Per-request timeout.                                     |
| `webhookUrl`  | `string`                     | —                             | Default `webhook_url` applied to `create`/`send` calls.  |
| `fetch`       | `typeof fetch`               | `globalThis.fetch`            | Custom fetch (e.g. undici, node-fetch).                  |

## Examples

Runnable scenarios live in [`examples/`](./examples) — mobile money, card, QR, hosted checkout, donation sessions, mobile and bank payouts, webhook handler (Express), retry loop, and polling-based reconciliation. Each is self-contained:

```bash
export SNIPPE_API_KEY="snp_..."
npx tsx examples/01-mobile-money.ts
```

See [`examples/README.md`](./examples/README.md) for the full index.

## Development

```bash
npm install
npm run typecheck      # tsc --noEmit
npm test               # run the vitest suite
npm run test:watch     # iterate locally
npm run test:coverage  # with v8 coverage report (coverage/)
npm run build          # emit dist/{esm,cjs,types}
```

### Testing approach

Tests mock the network by injecting a fake `fetch` via `new Snippe({ fetch })` — the same seam the SDK already exposes for custom HTTP clients. No `msw` or live network. The suite covers the HTTP layer (auth headers, idempotency, error mapping, rate-limit parsing, timeouts), webhook signature verification (happy path, bad sig, stale timestamp, replay, malformed JSON), every resource method, and the `SnippeError.retryable` decision table.

## Releasing

Releases are automated by [`.github/workflows/publish.yml`](./.github/workflows/publish.yml). The workflow runs on every push to `main`:

1. Installs, typechecks, tests, builds.
2. Reads `version` from `package.json`.
3. Queries npm — if that version is already published, it skips.
4. Otherwise runs `npm publish --provenance --access public` and opens a matching GitHub release.

To cut a release:

```bash
npm version patch   # or minor / major — creates a commit + git tag
git push --follow-tags origin main
```

The workflow publishes the new version. Pushing code without a version bump re-runs tests but does **not** republish.

### One-time repo setup

- Create an npm [Automation token](https://docs.npmjs.com/creating-and-viewing-access-tokens) with **publish** scope.
- In GitHub → **Settings → Secrets and variables → Actions**, add it as `NPM_TOKEN`.
- Provenance is emitted via the `id-token: write` permission already declared in the workflow — no extra setup.

## Continuous integration

[`.github/workflows/ci.yml`](./.github/workflows/ci.yml) runs on every push and PR to `main`: Node 18 **and** 20, typecheck, full test suite with coverage, and a build. Coverage is uploaded as an artifact on the Node 20 job.

## License

MIT — see [LICENSE](./LICENSE).
