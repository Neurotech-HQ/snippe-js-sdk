# Examples

Runnable integration snippets for `snippe-js-sdk`. Each file is self-contained — pick the one closest to your use case, copy it into your app, adapt.

## Run locally

From the repo root:

```bash
# Install dev deps if you haven't
npm install

# Export your sandbox key
export SNIPPE_API_KEY="snp_..."
# Optional, only the webhook example needs it
export SNIPPE_WEBHOOK_SECRET="whsec_..."

# Run any example (tsx executes TypeScript directly)
npx tsx examples/01-mobile-money.ts
```

On Windows PowerShell:

```powershell
$env:SNIPPE_API_KEY = "snp_..."
npx tsx examples/01-mobile-money.ts
```

## Index

| # | File | Scenario |
| -- | ---- | -------- |
| 01 | [01-mobile-money.ts](./01-mobile-money.ts) | USSD push to an M-Pesa/Airtel/Mixx/Halotel wallet. |
| 02 | [02-card-payment.ts](./02-card-payment.ts) | Card (Visa/Mastercard) redirect checkout. |
| 03 | [03-dynamic-qr.ts](./03-dynamic-qr.ts) | Dynamic QR for scan-to-pay. |
| 04 | [04-checkout-session.ts](./04-checkout-session.ts) | Hosted checkout session you can share via SMS/WhatsApp. |
| 05 | [05-custom-amount-session.ts](./05-custom-amount-session.ts) | Donation / tip-jar session with min/max. |
| 06 | [06-payout-mobile.ts](./06-payout-mobile.ts) | Mobile-money payout with fee-preflight and balance check. |
| 07 | [07-payout-bank.ts](./07-payout-bank.ts) | Bank transfer payout. |
| 08 | [08-webhook-express.ts](./08-webhook-express.ts) | Express webhook handler with signature verification. |
| 09 | [09-error-handling-retry.ts](./09-error-handling-retry.ts) | Retry loop with exponential backoff and rate-limit awareness. |
| 10 | [10-reconcile-by-polling.ts](./10-reconcile-by-polling.ts) | Status polling as a webhook fallback. |

## Environment variables

| Var | Used by |
| --- | --- |
| `SNIPPE_API_KEY` | All examples. |
| `SNIPPE_WEBHOOK_SECRET` | `08-webhook-express.ts` only. |

## See also

- Full SDK reference: [../README.md](../README.md)
- Snippe API docs: <https://snippe.sh/docs/2026-01-25>
