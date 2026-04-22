import { describe, expect, it } from "vitest";
import {
  Snippe,
  SnippeAuthenticationError,
  SnippeError,
  SnippeRateLimitError,
  SnippeValidationError,
} from "../src";
import { createMockFetch, errorEnvelope } from "./helpers/mockFetch";

describe("HTTP error handling", () => {
  it("maps 401 to SnippeAuthenticationError", async () => {
    const mock = createMockFetch([
      { status: 401, body: errorEnvelope(401, "unauthorized", "invalid or missing API key") },
    ]);
    const snippe = new Snippe({ apiKey: "snp_bad", fetch: mock.fetch });

    await expect(snippe.payments.balance()).rejects.toMatchObject({
      name: "SnippeAuthenticationError",
      status: 401,
      errorCode: "unauthorized",
    });
    await expect(snippe.payments.balance()).rejects.toBeInstanceOf(SnippeAuthenticationError);
  });

  it("maps 403 to SnippeAuthenticationError with insufficient_scope", async () => {
    const mock = createMockFetch([
      { status: 403, body: errorEnvelope(403, "insufficient_scope", "API key lacks disbursement:create scope") },
    ]);
    const snippe = new Snippe({ apiKey: "snp_test", fetch: mock.fetch });

    await expect(
      snippe.payouts.send({
        amount: 5000,
        channel: "mobile",
        recipient_phone: "255781000000",
        recipient_name: "R",
      }),
    ).rejects.toMatchObject({ status: 403, errorCode: "insufficient_scope" });
  });

  it("maps 400 to SnippeValidationError", async () => {
    const mock = createMockFetch([
      { status: 400, body: errorEnvelope(400, "validation_error", "amount is required") },
    ]);
    const snippe = new Snippe({ apiKey: "snp_test", fetch: mock.fetch });

    await expect(snippe.payments.get("x")).rejects.toBeInstanceOf(SnippeValidationError);
  });

  it("maps 422 to SnippeValidationError (idempotency conflict)", async () => {
    const mock = createMockFetch([
      { status: 422, body: errorEnvelope(422, "validation_error", "idempotency key already used with different body") },
    ]);
    const snippe = new Snippe({ apiKey: "snp_test", fetch: mock.fetch });

    await expect(
      snippe.payments.create({
        payment_type: "mobile",
        details: { amount: 500 },
        phone_number: "255781000000",
        customer: { firstname: "A", lastname: "B", email: "a@b.co" },
      }),
    ).rejects.toBeInstanceOf(SnippeValidationError);
  });

  it("maps 429 to SnippeRateLimitError with parsed rate-limit headers", async () => {
    const mock = createMockFetch([
      {
        status: 429,
        body: errorEnvelope(429, "rate_limit_exceeded", "Too many requests"),
        headers: {
          "x-ratelimit-limit": "60",
          "x-ratelimit-remaining": "0",
          "x-ratelimit-reset": "42",
        },
      },
    ]);
    const snippe = new Snippe({ apiKey: "snp_test", fetch: mock.fetch });

    try {
      await snippe.payments.balance();
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(SnippeRateLimitError);
      const e = err as SnippeRateLimitError;
      expect(e.rateLimit).toEqual({ limit: 60, remaining: 0, resetSeconds: 42 });
    }
  });

  it("maps 5xx to SnippeError", async () => {
    const mock = createMockFetch([
      { status: 503, body: errorEnvelope(503, "server_error", "service unavailable") },
    ]);
    const snippe = new Snippe({ apiKey: "snp_test", fetch: mock.fetch });

    await expect(snippe.payments.balance()).rejects.toMatchObject({
      name: "SnippeError",
      status: 503,
    });
  });

  it("handles non-JSON response bodies", async () => {
    const mock = createMockFetch([
      { status: 502, rawText: "<html>bad gateway</html>", headers: { "content-type": "text/html" } },
    ]);
    const snippe = new Snippe({ apiKey: "snp_test", fetch: mock.fetch });

    await expect(snippe.payments.balance()).rejects.toMatchObject({
      status: 502,
      errorCode: "unknown",
    });
  });

  it("translates network errors to SnippeError{network_error}", async () => {
    const mock = createMockFetch([{ throwError: new TypeError("ECONNREFUSED") }]);
    const snippe = new Snippe({ apiKey: "snp_test", fetch: mock.fetch });

    try {
      await snippe.payments.balance();
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(SnippeError);
      expect((err as SnippeError).errorCode).toBe("network_error");
      expect((err as SnippeError).retryable).toBe(true);
    }
  });

  it("translates timeouts to SnippeError{timeout}", async () => {
    const mock = createMockFetch([{ delayMs: 200, body: {} }]);
    const snippe = new Snippe({ apiKey: "snp_test", fetch: mock.fetch, timeoutMs: 50 });

    try {
      await snippe.payments.balance();
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(SnippeError);
      expect((err as SnippeError).errorCode).toBe("timeout");
    }
  });

  it("captures the X-Request-Id header when present", async () => {
    const mock = createMockFetch([
      {
        status: 500,
        body: errorEnvelope(500, "payment_failed", "insufficient balance"),
        headers: { "x-request-id": "req_abc123" },
      },
    ]);
    const snippe = new Snippe({ apiKey: "snp_test", fetch: mock.fetch });

    try {
      await snippe.payments.balance();
      throw new Error("should have thrown");
    } catch (err) {
      expect((err as SnippeError).requestId).toBe("req_abc123");
    }
  });
});
