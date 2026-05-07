# Migrating to v1.0

`@snippe/sdk@1.0` is the first stable release. It introduces breaking changes around naming and API shape, but the upgrade is mechanical — most users finish in under 10 minutes.

The two big themes:

1. **Channel-namespaced methods** — no more `paymentType` / `channel` string discriminators. The method *is* the channel.
2. **camelCase everywhere** on the public surface (inputs, outputs, query params). The SDK translates to snake_case on the wire.

Webhook payloads still use snake_case on purpose — they're useful to log raw and correlate against the API.

---

## 1. Per-channel call sites

### Payments

| 0.2.x | 1.0 |
| --- | --- |
| `payments.create({ payment_type: "mobile", ... })` | `payments.mobile.create({ ... })` |
| `payments.create({ payment_type: "card", ... })`   | `payments.card.create({ ... })`   |

`payments.create()` is removed entirely. There is no deprecation alias; call sites must move.

> **QR payments removed.** Snippe deprecated `dynamic-qr` at the API level — the API now rejects it with a validation error. The SDK no longer exposes `payments.qr`, the `Payment.paymentQrCode` field, or `"qr"` in `checkout.create({ allowedMethods })`. If you were using QR, switch to a hosted checkout session instead — it covers the same scan-to-pay flow with broader method support.

`payments.{get,list,search,balance,retriggerPush}` stay where they were — they're cross-channel reads.

### Payouts

| 0.2.x | 1.0 |
| --- | --- |
| `payouts.send({ channel: "mobile", ... })` | `payouts.mobile.send({ ... })` |
| `payouts.send({ channel: "bank", ... })`   | `payouts.bank.send({ ... })` |
| `payouts.fee(amount)` (number arg) | `payouts.mobile.fee({ amount })` / `payouts.bank.fee({ amount })` |

`payouts.{get,list}` stay where they were.

### Sessions → Checkout

`snippe.sessions` is renamed to `snippe.checkout`. The old name still works in v1.x as a deprecation alias — first access logs `console.warn` once per process. Plan to remove in v2.

```ts
// 0.2.x
await snippe.sessions.create({ ... });

// 1.0 — preferred
await snippe.checkout.create({ ... });

// 1.0 — deprecated, still works through v1.x, removed in v2.0
await snippe.sessions.create({ ... });
```

The exported class also renames: `SessionsResource` → `CheckoutResource`. The old type name is not re-exported.

---

## 2. camelCase fields

Every public input and output field on the SDK is now camelCase. The HTTP layer translates to/from snake_case at the wire boundary.

### Customer

| 0.2.x (matched API wire) | 1.0 (SDK) |
| --- | --- |
| `firstname` | `firstName` |
| `lastname`  | `lastName`  |
| `email`     | `email`     |
| `address`   | `address`   |
| `city`      | `city`      |
| `state`     | `state`     |
| `postcode`  | `postcode`  |
| `country`   | `country`   |

### Payment / Session / Payout fields

| 0.2.x | 1.0 |
| --- | --- |
| `phone_number`        | `phoneNumber`       |
| `webhook_url`         | `webhookUrl`        |
| `payment_type`        | `paymentType` *(method now, not field)* |
| `redirect_url`        | `redirectUrl`       |
| `cancel_url`          | `cancelUrl`         |
| `external_reference`  | `externalReference` |
| `failure_reason`      | `failureReason`     |
| `expires_at`          | `expiresAt`         |
| `expires_in`          | `expiresIn`         |
| `payment_url`         | `paymentUrl`        |
| `payment_token`       | `paymentToken`      |
| `api_version`         | `apiVersion`        |
| `checkout_url`        | `checkoutUrl`       |
| `short_code`          | `shortCode`         |
| `payment_link_url`    | `paymentLinkUrl`    |
| `allowed_methods`     | `allowedMethods`    |
| `allow_custom_amount` | `allowCustomAmount` |
| `min_amount`          | `minAmount`         |
| `max_amount`          | `maxAmount`         |
| `profile_id`          | `profileId`         |
| `fee_amount`          | `feeAmount`         |
| `total_amount`        | `totalAmount`       |
| `recipient_phone`     | `phoneNumber` *(payouts.mobile)* |
| `recipient_name`      | `recipientName` *(mobile)* / `accountName` *(bank)* |
| `recipient_bank`      | `bankCode` *(payouts.bank)* |
| `recipient_account`   | `accountNumber` *(payouts.bank)* |

> **String values** like `"mobile_money"` and `"TZS"` keep their wire form — the API expects those exact tokens.

### Lifted fields

`details` is no longer a wrapper object. `amount`, `redirectUrl`, and `cancelUrl` are top-level on each create input. The SDK reconstitutes the wire shape internally.

```ts
// 0.2.x
await snippe.payments.create({
  payment_type: "card",
  details: { amount: 50000, redirect_url: "...", cancel_url: "..." },
  // ...
});

// 1.0
await snippe.payments.card.create({
  amount: 50_000,
  redirectUrl: "...",
  cancelUrl: "...",
  // ...
});
```

---

## 3. Removed type exports

These types are removed in v1.0:

- `CreatePaymentParams`
- `CreateMobilePaymentParams`
- `CreateCardPaymentParams`
- `CreateQrPaymentParams` *(no replacement — QR is deprecated by the API)*
- `CreatePayoutParams`
- `CreateMobilePayoutParams`
- `CreateBankPayoutParams`
- `SessionsResource`

Replacements:

- `CreateMobilePaymentInput`, `CreateCardPaymentInput`
- `CreateMobilePayoutInput`, `CreateBankPayoutInput`, `PayoutFeeInput`
- `CheckoutResource`

---

## 4. New niceties

These come for free with v1.0:

- **Phone normaliser** — `phoneNumber` accepts any TZ format (`0781…`, `+255781…`, `255781…`, bare 9-digit). `import { normalisePhone } from "@snippe/sdk"` to use it standalone.
- **Min-amount validation** — payments < 500 TZS and payouts < 5000 TZS throw `SnippeValidationError` before the request leaves your machine.

---

## 5. Errors

`SnippeError`, `SnippeAuthenticationError`, `SnippeValidationError`, `SnippeRateLimitError`, and `SnippeWebhookVerificationError` are unchanged. Branch on `errorCode` (stable) and check `retryable` exactly as before.

If you've wrapped these in your own retry helper, you're done — the surface didn't move.

---

## 6. Verifying your upgrade

Quick checklist:

1. `npm install @snippe/sdk@1` — install the new major.
2. Search-and-replace per the field tables above (most editors will catch unused snake_case in TypeScript).
3. Re-route `payments.create({ payment_type: "X", ... })` and `payouts.send({ channel: "X", ... })` calls to the channel methods.
4. Run your test suite. TypeScript will catch most mismatches.
5. Smoke-test against the Snippe sandbox.

If you hit an issue not covered here, open one at <https://github.com/Neurotech-HQ/snippe-js-sdk/issues>.
