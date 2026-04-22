import {
  SnippeAuthenticationError,
  SnippeError,
  SnippeRateLimitError,
  SnippeValidationError,
} from "./errors";
import type {
  RateLimitInfo,
  RequestOptions,
  ResolvedSnippeConfig,
  SnippeEnvelope,
  SnippeErrorEnvelope,
} from "./types";

const SDK_VERSION = "0.2.0";
const USER_AGENT = `snippe-js-sdk/${SDK_VERSION}`;
const MAX_IDEMPOTENCY_KEY_LENGTH = 30;

export interface HttpRequest {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  /** Absolute path starting with `/`, e.g. `/v1/payments`. */
  path: string;
  query?: Record<string, unknown>;
  body?: unknown;
  options?: RequestOptions;
  /** Whether to auto-generate an idempotency key when missing (defaults to POSTs). */
  idempotent?: boolean;
}

export class HttpClient {
  constructor(private readonly config: ResolvedSnippeConfig) {}

  async request<T>(req: HttpRequest): Promise<T> {
    const url = this.buildUrl(req.path, req.query);
    const headers = this.buildHeaders(req);
    const timeoutMs = req.options?.timeoutMs ?? this.config.timeoutMs;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const signal = mergeSignals(controller.signal, req.options?.signal);

    let response: Response;
    try {
      response = await this.config.fetch(url, {
        method: req.method,
        headers,
        body: req.body === undefined ? undefined : JSON.stringify(req.body),
        signal,
      });
    } catch (err) {
      clearTimeout(timeoutId);
      if ((err as Error).name === "AbortError") {
        throw new SnippeError({
          status: 0,
          errorCode: "timeout",
          message: `Request to ${req.path} timed out after ${timeoutMs}ms`,
          cause: err,
        });
      }
      throw new SnippeError({
        status: 0,
        errorCode: "network_error",
        message: `Network error calling Snippe: ${(err as Error).message}`,
        cause: err,
      });
    }
    clearTimeout(timeoutId);

    const rateLimit = extractRateLimit(response.headers);
    const requestId =
      response.headers.get("x-request-id") ??
      response.headers.get("request-id") ??
      undefined;

    const text = await response.text();
    let parsed: unknown = undefined;
    if (text) {
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new SnippeError({
          status: response.status,
          errorCode: "unknown",
          message: `Non-JSON response from Snippe (status ${response.status}): ${text.slice(0, 200)}`,
          requestId,
          rateLimit,
          raw: text,
        });
      }
    }

    if (!response.ok || isErrorEnvelope(parsed)) {
      throw buildError(response.status, parsed, requestId, rateLimit);
    }

    if (isSuccessEnvelope<T>(parsed)) {
      return parsed.data;
    }
    return parsed as T;
  }

  private buildUrl(path: string, query?: Record<string, unknown>): string {
    const base = this.config.baseUrl.replace(/\/+$/, "");
    const normalisedPath = path.startsWith("/") ? path : `/${path}`;
    const url = new URL(base + normalisedPath);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null) continue;
        url.searchParams.append(key, String(value));
      }
    }
    return url.toString();
  }

  private buildHeaders(req: HttpRequest): Record<string, string> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.config.apiKey}`,
      Accept: "application/json",
      "User-Agent": USER_AGENT,
      "Snippe-Version": "2026-01-25",
      ...(req.options?.headers ?? {}),
    };

    if (req.body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    const wantsIdempotency = req.idempotent ?? req.method === "POST";
    if (wantsIdempotency) {
      const key = req.options?.idempotencyKey ?? generateIdempotencyKey();
      if (key.length > MAX_IDEMPOTENCY_KEY_LENGTH) {
        throw new SnippeValidationError({
          status: 0,
          errorCode: "validation_error",
          message: `Idempotency-Key must be ≤ ${MAX_IDEMPOTENCY_KEY_LENGTH} characters (got ${key.length}). Long keys cause a cryptic PAY_001 error from the API.`,
        });
      }
      headers["Idempotency-Key"] = key;
    }

    return headers;
  }
}

function isSuccessEnvelope<T>(value: unknown): value is SnippeEnvelope<T> {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as { status?: string; code?: unknown; data?: unknown };
  if (obj.status === "error") return false;
  // Two envelope shapes observed in the Snippe API:
  //   Payments/payouts/balance: { status: "success", code, data }
  //   Sessions:                 { code, data }
  // In both, `data` is present and `code` is numeric.
  if (!("data" in obj)) return false;
  if (typeof obj.code !== "number") return false;
  return obj.status === "success" || obj.status === undefined;
}

function isErrorEnvelope(value: unknown): value is SnippeErrorEnvelope {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { status?: string }).status === "error"
  );
}

function buildError(
  status: number,
  parsed: unknown,
  requestId: string | undefined,
  rateLimit: RateLimitInfo | undefined,
): SnippeError {
  const envelope = isErrorEnvelope(parsed) ? parsed : undefined;
  const errorCode = envelope?.error_code ?? inferErrorCode(status);
  const message = envelope?.message ?? `Snippe API error (HTTP ${status})`;

  const opts = { status, errorCode, message, requestId, rateLimit, raw: parsed };

  if (status === 401) return new SnippeAuthenticationError(opts);
  if (status === 403) return new SnippeAuthenticationError(opts);
  if (status === 429) return new SnippeRateLimitError(opts);
  if (status === 400 || status === 422) return new SnippeValidationError(opts);
  return new SnippeError(opts);
}

function inferErrorCode(status: number): string {
  switch (status) {
    case 400:
      return "validation_error";
    case 401:
      return "unauthorized";
    case 403:
      return "insufficient_scope";
    case 404:
      return "not_found";
    case 409:
      return "conflict";
    case 422:
      return "validation_error";
    case 429:
      return "rate_limit_exceeded";
    default:
      return status >= 500 ? "server_error" : "unknown";
  }
}

function extractRateLimit(headers: Headers): RateLimitInfo | undefined {
  const limit = headers.get("x-ratelimit-limit");
  const remaining = headers.get("x-ratelimit-remaining");
  const reset = headers.get("x-ratelimit-reset");
  if (!limit && !remaining && !reset) return undefined;
  return {
    limit: limit ? Number(limit) : undefined,
    remaining: remaining ? Number(remaining) : undefined,
    resetSeconds: reset ? Number(reset) : undefined,
  };
}

function mergeSignals(
  primary: AbortSignal,
  secondary?: AbortSignal,
): AbortSignal {
  if (!secondary) return primary;
  if (secondary.aborted) {
    const ctrl = new AbortController();
    ctrl.abort(secondary.reason);
    return ctrl.signal;
  }
  const ctrl = new AbortController();
  const onAbort = (reason: unknown) => ctrl.abort(reason);
  primary.addEventListener("abort", () => onAbort(primary.reason), { once: true });
  secondary.addEventListener("abort", () => onAbort(secondary.reason), { once: true });
  return ctrl.signal;
}

/**
 * Generate a random idempotency key that fits inside Snippe's 30-char limit.
 * Format: `snp-` prefix (4) + 20 url-safe chars = 24 total.
 */
export function generateIdempotencyKey(): string {
  const cryptoObj: Crypto | undefined =
    typeof globalThis !== "undefined" && (globalThis as { crypto?: Crypto }).crypto
      ? (globalThis as { crypto: Crypto }).crypto
      : undefined;

  let body: string;
  if (cryptoObj && typeof cryptoObj.randomUUID === "function") {
    body = cryptoObj.randomUUID().replace(/-/g, "").slice(0, 20);
  } else {
    body = Array.from({ length: 20 }, () =>
      Math.floor(Math.random() * 36).toString(36),
    ).join("");
  }
  return `snp-${body}`;
}
