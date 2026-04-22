import { describe, expect, it } from "vitest";
import {
  SnippeWebhookVerificationError,
  computeWebhookSignature,
  verifyWebhook,
} from "../src";

const SIGNING_KEY = "whsec_test_key";

function fixture(data: Record<string, unknown> = {}) {
  return JSON.stringify({
    id: "evt_01",
    type: "payment.completed",
    api_version: "2026-01-25",
    created_at: "2026-01-24T10:30:00Z",
    data: {
      reference: "pi_abc",
      status: "completed",
      amount: { value: 500, currency: "TZS" },
      ...data,
    },
  });
}

function freshTimestamp(offsetSeconds = 0): string {
  return String(Math.floor(Date.now() / 1000) + offsetSeconds);
}

describe("verifyWebhook", () => {
  it("verifies a valid signature and returns the parsed event", () => {
    const body = fixture();
    const ts = freshTimestamp();
    const sig = computeWebhookSignature(body, ts, SIGNING_KEY);

    const event = verifyWebhook({
      rawBody: body,
      signature: sig,
      timestamp: ts,
      signingKey: SIGNING_KEY,
    });

    expect(event.type).toBe("payment.completed");
    expect(event.data.reference).toBe("pi_abc");
  });

  it("accepts the raw body as a Buffer", () => {
    const body = fixture();
    const ts = freshTimestamp();
    const sig = computeWebhookSignature(body, ts, SIGNING_KEY);

    const event = verifyWebhook({
      rawBody: Buffer.from(body, "utf8"),
      signature: sig,
      timestamp: ts,
      signingKey: SIGNING_KEY,
    });

    expect(event.id).toBe("evt_01");
  });

  it("rejects an invalid signature", () => {
    const body = fixture();
    const ts = freshTimestamp();

    expect(() =>
      verifyWebhook({
        rawBody: body,
        signature: "a".repeat(64),
        timestamp: ts,
        signingKey: SIGNING_KEY,
      }),
    ).toThrow(SnippeWebhookVerificationError);
  });

  it("rejects signatures of a different length without crashing", () => {
    const body = fixture();
    const ts = freshTimestamp();

    expect(() =>
      verifyWebhook({
        rawBody: body,
        signature: "short",
        timestamp: ts,
        signingKey: SIGNING_KEY,
      }),
    ).toThrow(/Invalid webhook signature/);
  });

  it("rejects stale timestamps (replay protection)", () => {
    const body = fixture();
    const ts = freshTimestamp(-400); // 400s in the past, > 300s tolerance
    const sig = computeWebhookSignature(body, ts, SIGNING_KEY);

    expect(() =>
      verifyWebhook({
        rawBody: body,
        signature: sig,
        timestamp: ts,
        signingKey: SIGNING_KEY,
      }),
    ).toThrow(/older than 300s/);
  });

  it("honours a custom tolerance", () => {
    const body = fixture();
    const ts = freshTimestamp(-60); // 60s old
    const sig = computeWebhookSignature(body, ts, SIGNING_KEY);

    // With default tolerance (300s) it passes; with 30s it fails.
    expect(() =>
      verifyWebhook({
        rawBody: body,
        signature: sig,
        timestamp: ts,
        signingKey: SIGNING_KEY,
        toleranceSeconds: 30,
      }),
    ).toThrow(/older than 30s/);
  });

  it("rejects missing headers", () => {
    expect(() =>
      verifyWebhook({
        rawBody: "{}",
        signature: null,
        timestamp: "1700000000",
        signingKey: SIGNING_KEY,
      }),
    ).toThrow(/Missing/);
    expect(() =>
      verifyWebhook({
        rawBody: "{}",
        signature: "x",
        timestamp: undefined,
        signingKey: SIGNING_KEY,
      }),
    ).toThrow(/Missing/);
  });

  it("rejects malformed timestamps", () => {
    const body = fixture();
    expect(() =>
      verifyWebhook({
        rawBody: body,
        signature: "a".repeat(64),
        timestamp: "not-a-number",
        signingKey: SIGNING_KEY,
      }),
    ).toThrow(/Malformed webhook timestamp/);
  });

  it("rejects invalid JSON bodies after signature passes", () => {
    const body = "not json";
    const ts = freshTimestamp();
    const sig = computeWebhookSignature(body, ts, SIGNING_KEY);

    expect(() =>
      verifyWebhook({
        rawBody: body,
        signature: sig,
        timestamp: ts,
        signingKey: SIGNING_KEY,
      }),
    ).toThrow(/not valid JSON/);
  });

  it("rejects a missing signing key", () => {
    expect(() =>
      verifyWebhook({
        rawBody: "{}",
        signature: "x",
        timestamp: freshTimestamp(),
        signingKey: "",
      }),
    ).toThrow(/Missing webhook signing key/);
  });
});
