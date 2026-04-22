import { describe, expect, it } from "vitest";
import { SnippeError } from "../src";

describe("SnippeError.retryable", () => {
  const cases: Array<[string, { status: number; errorCode: string }, boolean]> = [
    ["rate limit", { status: 429, errorCode: "rate_limit_exceeded" }, true],
    ["PAY_001", { status: 500, errorCode: "PAY_001" }, true],
    ["network error", { status: 0, errorCode: "network_error" }, true],
    ["timeout", { status: 0, errorCode: "timeout" }, true],
    ["500 server error", { status: 500, errorCode: "server_error" }, true],
    ["502 bad gateway", { status: 502, errorCode: "unknown" }, true],
    ["400 validation", { status: 400, errorCode: "validation_error" }, false],
    ["401 unauthorized", { status: 401, errorCode: "unauthorized" }, false],
    ["403 insufficient_scope", { status: 403, errorCode: "insufficient_scope" }, false],
    ["404 not found", { status: 404, errorCode: "not_found" }, false],
    ["422 idempotency conflict", { status: 422, errorCode: "validation_error" }, false],
  ];

  it.each(cases)("%s → retryable: %s", (_label, opts, expected) => {
    const err = new SnippeError({ ...opts, message: "test" });
    expect(err.retryable).toBe(expected);
  });

  it("preserves optional fields on the error", () => {
    const err = new SnippeError({
      status: 429,
      errorCode: "rate_limit_exceeded",
      message: "slow down",
      requestId: "req_1",
      rateLimit: { limit: 60, remaining: 0, resetSeconds: 30 },
      raw: { foo: "bar" },
      cause: new Error("inner"),
    });
    expect(err.requestId).toBe("req_1");
    expect(err.rateLimit?.resetSeconds).toBe(30);
    expect(err.raw).toEqual({ foo: "bar" });
    expect((err.cause as Error).message).toBe("inner");
  });
});
