export type Environment = "sandbox" | "production";

export interface SnippeConfig {
  apiKey: string;
  environment?: Environment;
  baseUrl?: string;
  timeoutMs?: number;
  /** Default webhook URL applied to create calls when the caller omits one. */
  webhookUrl?: string;
  /** Custom fetch implementation (defaults to global `fetch`). */
  fetch?: typeof fetch;
}

export interface ResolvedSnippeConfig {
  apiKey: string;
  environment: Environment;
  baseUrl: string;
  timeoutMs: number;
  webhookUrl?: string;
  fetch: typeof fetch;
}

export interface RequestOptions {
  /** Per-request idempotency key (max 64 chars). Auto-generated for POSTs if omitted. */
  idempotencyKey?: string;
  /** Override the per-request timeout. */
  timeoutMs?: number;
  /** Additional headers. */
  headers?: Record<string, string>;
  /** Abort signal for cancellation. */
  signal?: AbortSignal;
}

/** Snippe wraps most successful responses in `{ status, code, data }`. */
export interface SnippeEnvelope<T> {
  status: "success";
  code: number;
  data: T;
}

export interface SnippeErrorEnvelope {
  status: "error";
  code: number;
  error_code: string;
  message: string;
}

export interface Money {
  /** Usually TZS; the gross amount of a cross-border payment is in the payer's currency. */
  currency: "TZS" | (string & {});
  value: number;
}

/** Offset-paginated list returned by `payments.list/search` and `payouts.list`. */
export interface Page<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface RateLimitInfo {
  limit?: number;
  remaining?: number;
  resetSeconds?: number;
}

export * from "./payments";
export * from "./sessions";
export * from "./payouts";
export * from "./webhooks";
