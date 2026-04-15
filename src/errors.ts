import type { RateLimitInfo } from "./types";

export type SnippeErrorCode =
  | "unauthorized"
  | "insufficient_scope"
  | "validation_error"
  | "not_found"
  | "conflict"
  | "payment_failed"
  | "rate_limit_exceeded"
  | "PAY_001"
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

  constructor(opts: SnippeErrorOptions) {
    super(opts.message);
    this.name = "SnippeError";
    this.status = opts.status;
    this.errorCode = opts.errorCode;
    this.requestId = opts.requestId;
    this.rateLimit = opts.rateLimit;
    this.raw = opts.raw;
    this.cause = opts.cause;
  }

  /** True if retrying with the same idempotency key is likely to succeed. */
  get retryable(): boolean {
    if (this.errorCode === "rate_limit_exceeded") return true;
    if (this.errorCode === "PAY_001") return true;
    if (this.errorCode === "network_error" || this.errorCode === "timeout") return true;
    return this.status >= 500;
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
