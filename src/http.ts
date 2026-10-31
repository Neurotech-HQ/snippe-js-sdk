import {
  SnippeAuthenticationError,
  SnippeError,
  SnippeRateLimitError,
  SnippeValidationError,
} from "./errors.js";
import { toCamelCase, toSnakeCase } from "./internal/caseMap.js";
import type {
  RateLimitInfo,
  RequestOptions,
  ResolvedSnippeConfig,
  SnippeEnvelope,
  SnippeErrorEnvelope,
} from "./types/index.js";

const SDK_VERSION = "1.1.0";
const USER_AGENT = `@snippe/sdk/${SDK_VERSION}`;
const MAX_IDEMPOTENCY_KEY_LENGTH = 64;

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
    const idempotencyKey = resolveIdempotencyKey(req);
    const url = this.buildUrl(req.path, req.query);
    const headers = this.buildHeaders(req, idempotencyKey);
    const timeoutMs = req.options?.timeoutMs ?? this.config.timeoutMs;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const signal = mergeSignals(controller.signal, req.options?.signal);

    let response: Response;
    try {
      response = await this.config.fetch(url, {
        method: req.method,
        headers,
        body:
          req.body === undefined
            ? undefined
            : JSON.stringify(toSnakeCase(req.body)),
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
          idempotencyKey,
        });
      }
      throw new SnippeError({
        status: 0,
        errorCode: "network_error",
        message: `Network error calling Snippe: ${(err as Error).message}`,
        cause: err,
        idempotencyKey,
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
          idempotencyKey,
        });
      }
    }

    if (!response.ok || isErrorEnvelope(parsed)) {
      throw buildError(response.status, parsed, requestId, rateLimit, idempotencyKey);
    }

    if (isSuccessEnvelope<T>(parsed)) {
      return toCamelCase(parsed.data) as T;
    }
    return toCamelCase(parsed) as T;
  }

  private buildUrl(path: string, query?: Record<string, unknown>): string {
    const base = this.config.baseUrl.replace(/\/+$/, "");
    const normalisedPath = path.startsWith("/") ? path : `/${path}`;
    const url = new URL(base + normalisedPath);
    if (query) {
      const snaked = toSnakeCase(query) as Record<string, unknown>;
      for (const [key, value] of Object.entries(snaked)) {
        if (value === undefined || value === null) continue;
        url.searchParams.append(key, String(value));
      }
    }
    return url.toString();
  }

  private buildHeaders(
    req: HttpRequest,
    idempotencyKey: string | undefined,
  ): Record<string, string> {
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

    if (idempotencyKey !== undefined) {
      headers["Idempotency-Key"] = idempotencyKey;
    }

    return headers;
  }
}

function resolveIdempotencyKey(req: HttpRequest): string | undefined {
  if (!(req.idempotent ?? req.method === "POST")) return undefined;
  const key = req.options?.idempotencyKey ?? generateIdempotencyKey();
  // An empty key would be sent, and the API would then skip deduplication.
  if (key.length === 0 || key.length > MAX_IDEMPOTENCY_KEY_LENGTH) {
    throw new SnippeValidationError({
      status: 0,
      errorCode: "validation_error",
      message: `Idempotency-Key must be 1-${MAX_IDEMPOTENCY_KEY_LENGTH} characters (got ${key.length}).`,
    });
  }
  return key;
}

function isSuccessEnvelope<T>(value: unknown): value is SnippeEnvelope<T> {
  if (typeof value !== "object" || value === null) return false;
  const obj = value as { status?: string; code?: unknown; data?: unknown };
  if (obj.status === "error") return false;
  // Standard envelope: { status: "success", code, data }. `status` is also
  // accepted as absent for older responses. Message-only successes (e.g.
  // session cancel) omit `data` and fall through to the raw body.
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
  idempotencyKey: string | undefined,
): SnippeError {
  const envelope = isErrorEnvelope(parsed) ? parsed : undefined;
  const errorCode = envelope?.error_code ?? inferErrorCode(status);
  const message = envelope?.message ?? `Snippe API error (HTTP ${status})`;

  const opts = { status, errorCode, message, requestId, rateLimit, raw: parsed, idempotencyKey };

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
 * Generate a random idempotency key that fits inside Snippe's 64-char limit.
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
