import type { RateLimitInfo } from "./types/index.js";

/**
 * `DOMAIN_NNN` codes come from the API's error envelope. The lowercase codes
 * are SDK-side: inferred from the HTTP status when the body has no envelope,
 * or raised before the request is sent.
 */
export type SnippeErrorCode =
  // Authentication / authorization
  | "AUTH_001" | "AUTH_002" | "AUTH_003" | "AUTH_004" | "AUTH_005"
  | "AUTH_006" | "AUTH_007" | "AUTH_008" | "AUTH_009"
  | "AUTHZ_001" | "AUTHZ_002" | "AUTHZ_003"
  // Validation
  | "VAL_001" | "VAL_002" | "VAL_003" | "VAL_004"
  | "VAL_005" | "VAL_006" | "VAL_007" | "VAL_008"
  // Resources
  | "RES_001" | "RES_002" | "RES_003"
  // Payments: failed, expired, cancelled, insufficient funds, transfer failed
  | "PAY_001" | "PAY_002" | "PAY_003" | "PAY_004" | "PAY_005"
  // Ledger / internal / rate limit / account status
  | "LED_001" | "LED_002" | "LED_003"
  | "INT_001" | "INT_002" | "INT_003" | "INT_004"
  | "RATE_001"
  | "ACCT_001" | "ACCT_002" | "ACCT_003" | "ACCT_004"
  // SDK-side
  | "unauthorized"
  | "insufficient_scope"
  | "validation_error"
  | "not_found"
  | "conflict"
  | "rate_limit_exceeded"
  | "server_error"
  | "network_error"
  | "timeout"
  | "unknown"
  | (string & {});

export interface SnippeErrorOptions {
  status: number;
  errorCode: SnippeErrorCode;
  message: string;
  requestId?: string;
  rateLimit?: RateLimitInfo;
  raw?: unknown;
  cause?: unknown;
  idempotencyKey?: string;
}

/**
 * Unified error thrown for any Snippe API failure. Inspect `errorCode` (stable)
 * rather than `message` to branch behaviour.
 */
export class SnippeError extends Error {
  readonly status: number;
  readonly errorCode: SnippeErrorCode;
  readonly requestId?: string;
  readonly rateLimit?: RateLimitInfo;
  readonly raw?: unknown;
  readonly cause?: unknown;
  /** The key the failed request used, generated or yours. Pass it back when retrying. */
  readonly idempotencyKey?: string;

  constructor(opts: SnippeErrorOptions) {
    super(opts.message);
    this.name = "SnippeError";
    this.status = opts.status;
    this.errorCode = opts.errorCode;
    this.requestId = opts.requestId;
    this.rateLimit = opts.rateLimit;
    this.raw = opts.raw;
    this.cause = opts.cause;
    this.idempotencyKey = opts.idempotencyKey;
  }

  /**
   * True if retrying is likely to succeed: 429, 5xx, network errors and
   * timeouts. A 4xx is never retryable — that includes `PAY_001` on a 422,
   * which is a refusal (e.g. amount out of bounds).
   *
   * The first attempt may have gone through, so always retry with
   * `err.idempotencyKey`. A new key can charge or pay out twice.
   */
  get retryable(): boolean {
    if (this.errorCode === "network_error" || this.errorCode === "timeout") return true;
    return this.status === 429 || this.status >= 500;
  }
}

export class SnippeAuthenticationError extends SnippeError {
  constructor(opts: SnippeErrorOptions) {
    super(opts);
    this.name = "SnippeAuthenticationError";
  }
}

export class SnippeValidationError extends SnippeError {
  constructor(opts: SnippeErrorOptions) {
    super(opts);
    this.name = "SnippeValidationError";
  }
}

export class SnippeRateLimitError extends SnippeError {
  constructor(opts: SnippeErrorOptions) {
    super(opts);
    this.name = "SnippeRateLimitError";
  }
}

export class SnippeWebhookVerificationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SnippeWebhookVerificationError";
  }
}
