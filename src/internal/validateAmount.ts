import { SnippeValidationError } from "../errors";

const MIN_PAYMENT_TZS = 500;
const MIN_PAYOUT_TZS = 5000;

/**
 * Reject payment amounts below 500 TZS before hitting the API. The Snippe API
 * will also reject these, but raising here gives a clearer error and saves a
 * round-trip + an idempotency-key burn.
 */
export function validatePaymentAmount(amount: number): void {
  if (!Number.isFinite(amount) || amount < MIN_PAYMENT_TZS) {
    throw new SnippeValidationError({
      status: 0,
      errorCode: "validation_error",
      message: `Payment amount must be at least ${MIN_PAYMENT_TZS} TZS (got ${amount}).`,
    });
  }
}

/**
 * Reject payout amounts below 5000 TZS before hitting the API. Same rationale
 * as `validatePaymentAmount`.
 */
export function validatePayoutAmount(amount: number): void {
  if (!Number.isFinite(amount) || amount < MIN_PAYOUT_TZS) {
    throw new SnippeValidationError({
      status: 0,
      errorCode: "validation_error",
      message: `Payout amount must be at least ${MIN_PAYOUT_TZS} TZS (got ${amount}).`,
    });
  }
}
