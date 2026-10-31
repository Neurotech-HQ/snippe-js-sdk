# @snippe/sdk

Official JavaScript / TypeScript SDK for [Snippe](https://snippe.sh) — the Tanzania payment platform (mobile money, cards, and payouts).

- API version: `2026-01-25` — response and webhook shapes follow your **account's** API version setting (Dashboard → Settings → API version). Make sure it is on `2026-01-25`; the SDK's types describe that format.
- Works in Node.js 18+ (uses built-in `fetch`)
- Fully typed, ESM + CJS, zero runtime dependencies

> **Upgrading from v1.0?** v1.1 fixes list/search/cancel return shapes, statuses and webhook event names to match the API — see the top of [MIGRATION.md](https://github.com/Neurotech-HQ/snippe-js-sdk/blob/main/MIGRATION.md).
>
> **Migrating from v0.2.x?** The v1.0 release is breaking — channel-namespaced methods (`payments.mobile.create` instead of `payments.create({ payment_type: "mobile" })`) and camelCase fields throughout. See [MIGRATION.md](https://github.com/Neurotech-HQ/snippe-js-sdk/blob/main/MIGRATION.md).

## Install

```bash
npm install @snippe/sdk
```

## Charge a customer in 5 minutes

The full happy path for mobile money — the most common flow.

### 1. Initialise the client

```ts
import { Snippe } from "@snippe/sdk";

const snippe = new Snippe({
  apiKey: process.env.SNIPPE_API_KEY!, // snp_...
  webhookUrl: "https://example.com/webhooks/snippe",
});
```

### 2. Create the payment

```ts
const payment = await snippe.payments.mobile.create({
  amount: 500, // TZS, integer (minimum 500)
  phoneNumber: "0781000000", // any TZ format works — auto-normalised
  customer: {
    firstName: "Jane",
    lastName: "Doe",
    email: "jane@example.com",
  },
});

console.log(payment.reference, payment.status); // "9015c155-…", "pending"
```

The customer's phone now has a USSD prompt. They enter their PIN.

### 3. Learn the result — webhooks

Listen for `payment.completed` / `payment.failed` events at `webhookUrl`. The SDK ships `verifyWebhook` for HMAC verification — see the [Webhooks](#webhooks) section.

If you genuinely can't receive webhooks (no public URL, scheduled reconciliation job), see the [polling example](https://github.com/Neurotech-HQ/snippe-js-sdk/tree/main/examples) for the `payments.get`-in-a-loop pattern.

The SDK auto-generates an `Idempotency-Key` (24 chars; the API allows up to 64) for every `POST`. Pass your own via the request options:

```ts
await snippe.payments.mobile.create(input, { idempotencyKey: "ord-12345-t1" });
```

If a call fails with `err.retryable`, the first attempt may still have gone through. Retry with `err.idempotencyKey` or your own key, because a new key can charge or pay out twice. See [Errors](#errors).

## Resources

### Payments

Each payment channel has its own typed method — no string discriminators:

```ts
await snippe.payments.mobile.create({ amount, phoneNumber, customer });
await snippe.payments.card.create({ amount, phoneNumber, redirectUrl, customer }); // cancelUrl optional

// Cross-channel reads
await snippe.payments.get(reference);
const { items, total } = await snippe.payments.list({ limit: 20, status: "completed", fromDate: "2026-01-01" });
await snippe.payments.search({ phone: "781000000" }); // partial match on reference and/or phone
await snippe.payments.retriggerPush(reference);
await snippe.payments.balance();
```

`retriggerPush` depends on the provider handling the payment. If that provider can't re-send the prompt, the API returns a 400, so be ready to create a new payment instead.

Card payments require the full billing address (`address`, `city`, `state`, `postcode`, `country`); the type system enforces this at compile time.

Payment statuses are `pending`, `completed`, `failed`, `cancelled` (includes expired), and `reversed`.

Pass `subaccount` (a wallet id or reference) to `create()` to settle into a specific wallet instead of your default one.

### Hosted checkout

When you want Snippe to render the payment UI for you (multi-method picker, mobile-optimised page, share via SMS/WhatsApp):

```ts
const session = await snippe.checkout.create({
  amount: 50_000,
  allowedMethods: ["mobile_money", "card"],
  customer: { name: "Jane Doe", phone: "+255712345678" },
  description: "Order #12345",
  expiresIn: 3600,
});

// Share `paymentLinkUrl` via SMS/WhatsApp, or redirect to `checkoutUrl`
console.log(session.paymentLinkUrl);
```

Line items, custom checkout fields and layout are optional and presentational — the session always charges `amount`:

```ts
await snippe.checkout.create({
  amount: 250_000,
  lineItems: [{ name: "Headphones", quantity: 1, unitPrice: 250_000, imageUrl: "https://cdn.example.com/h.jpg" }],
  customFields: [{ key: "delivery_address", label: "Delivery address", type: "textarea", required: true }],
  display: { lineItemsStyle: "cards" },
});
```

Custom-amount (donation / tip jar) sessions:

```ts
await snippe.checkout.create({
  allowCustomAmount: true,
  minAmount: 1_000,
  maxAmount: 500_000,
  description: "Donation",
});
```

Other operations: `get`, `list` (returns `{ sessions, pagination }`), and `cancel` (resolves to `undefined` — call `get` if you need the new state).

### Disbursements (payouts)

Same channel-namespaced shape. Always preflight with `fee()` + `balance()` before sending — the amount + fee debits immediately:

```ts
const amount = 50_000;
const { totalAmount } = await snippe.payouts.mobile.fee({ amount, phoneNumber: "0781000000" });
const { available } = await snippe.payments.balance();

if (available.value < totalAmount) {
  throw new Error("insufficient balance");
}

await snippe.payouts.mobile.send({
  amount,
  phoneNumber: "0781000000",
  recipientName: "Employee Name",
  narration: "Salary January 2026",
});
```

Bank transfers:

```ts
await snippe.payouts.bank.send({
  amount: 100_000,
  bankCode: "CRDB",
  accountNumber: "0150000000000",
  accountName: "Vendor Ltd",
  narration: "Invoice INV-001",
});
```

`narration` is required by the API for both channels. Pass `subaccount` to pay out of a specific wallet. Reads: `payouts.get(reference)` and `payouts.list({ search, startDate, endDate, limit, offset })`, which returns `{ items, total, limit, offset }`.

The SDK validates client-side that payment amounts ≥ 500 TZS and payouts ≥ 5000 TZS before hitting the wire — saves a round trip and an idempotency-key burn.

## Webhooks

Snippe signs every webhook with HMAC-SHA256 over `{timestamp}.{raw_body}`. The SDK ships a `verifyWebhook` helper that handles signature verification, constant-time comparison, and replay protection (rejects events older than 5 minutes).

> **Critical**: use middleware that gives you the **raw** request body, not a parsed one. Re-serialising JSON will break the signature.

```ts
import express from "express";
import { verifyWebhook, SnippeWebhookVerificationError } from "@snippe/sdk";

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
        case "payment.cancelled":
        case "payment.reversed":
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

> Webhook payloads keep snake_case field names (`event.data.failure_reason`, `event.data.completed_at`) to match the API exactly — useful when correlating with logged raw bodies. Everything else in the SDK is camelCase.
>
> `metadata` is yours, so its keys are kept exactly as you wrote them. Send `{ orderId }` and you read `event.data.metadata.orderId`.

## Errors

All API failures throw `SnippeError` (or a subclass). Branch on `errorCode`, not `message`:

```ts
import {
  SnippeError,
  SnippeRateLimitError,
  SnippeValidationError,
} from "@snippe/sdk";

try {
  await snippe.payments.mobile.create(input);
} catch (err) {
  if (err instanceof SnippeRateLimitError) {
    const wait = err.rateLimit?.resetSeconds ?? 60;
    // back off for `wait` seconds...
  } else if (err instanceof SnippeValidationError) {
    // fix the request, don't retry
  } else if (err instanceof SnippeError && err.retryable) {
    // 429 / 5xx / network / timeout. The first attempt may have gone through,
    // so reuse its key. A new key can charge or pay out twice.
    await snippe.payments.mobile.create(input, { idempotencyKey: err.idempotencyKey });
  } else {
    throw err;
  }
}
```

API error codes follow `DOMAIN_NNN` (`VAL_001` validation, `AUTH_007` invalid API key, `PAY_004` insufficient funds, `RATE_001` rate limited, …). A `422` with `PAY_001` is a refusal (e.g. amount outside the allowed range) and is **not** retryable.

## Configuration

| Option        | Type                         | Default                  | Description                                             |
| ------------- | ---------------------------- | ------------------------ | ------------------------------------------------------- |
| `apiKey`      | `string`                     | —                        | Required. `snp_...` from the Snippe Dashboard.          |
| `environment` | `"sandbox" \| "production"` | `"production"`           | Leave unset. Snippe has no sandbox and every key is live, so `"sandbox"` throws unless you also set `baseUrl`. |
| `baseUrl`     | `string`                     | `https://api.snippe.sh`  | Override the API base URL.                              |
| `timeoutMs`   | `number`                     | `30000`                  | Per-request timeout.                                    |
| `webhookUrl`  | `string`                     | —                        | Default `webhookUrl` applied to `create` / `send` calls. |
| `fetch`       | `typeof fetch`               | `globalThis.fetch`       | Custom fetch (e.g. undici, node-fetch).                 |

## Utilities

```ts
import { normalisePhone, generateIdempotencyKey } from "@snippe/sdk";

normalisePhone("0781000000"); // "255781000000"
generateIdempotencyKey();      // "snp-…" (24 chars)
```

## Examples

Full runnable scenarios — mobile money, card, hosted checkout, donation sessions, mobile and bank payouts, an Express webhook handler, a retry loop, and polling-based reconciliation — live in the [`examples/` directory on GitHub](https://github.com/Neurotech-HQ/snippe-js-sdk/tree/main/examples).

## Migration

Upgrading from v0.2.x? See the full [migration guide](https://github.com/Neurotech-HQ/snippe-js-sdk/blob/main/MIGRATION.md). v1.0 is breaking but the upgrade is mostly mechanical (rename fields, route through channel sub-resources).

## Contributing

See [CONTRIBUTING.md](https://github.com/Neurotech-HQ/snippe-js-sdk/blob/main/CONTRIBUTING.md) for local development, testing, and release workflow.

## License

MIT — see [LICENSE](./LICENSE).
