import { describe, expect, it } from "vitest";
import { Snippe, SnippeError, SnippeValidationError, generateIdempotencyKey } from "../src";
import { createMockFetch, errorEnvelope, successEnvelope } from "./helpers/mockFetch";

const payoutInput = {
  amount: 5000,
  phoneNumber: "255781000000",
  recipientName: "R",
  narration: "x",
};

async function failedSend(snippe: Snippe): Promise<SnippeError> {
  try {
    await snippe.payouts.mobile.send(payoutInput);
  } catch (err) {
    return err as SnippeError;
  }
  throw new Error("should have thrown");
}

describe("Idempotency keys", () => {
  it("auto-generates a key ≤64 chars on POST when the caller omits one", async () => {
    const mock = createMockFetch([{ status: 201, body: successEnvelope({ reference: "pi_1" }) }]);
    const snippe = new Snippe({ apiKey: "snp_test", fetch: mock.fetch });

    await snippe.payments.mobile.create({
      amount: 500,
      phoneNumber: "255781000000",
      customer: { firstName: "A", lastName: "B", email: "a@b.co" },
    });

    const key = mock.lastRequest().headers["idempotency-key"];
    expect(key).toBeDefined();
    expect(key.length).toBeGreaterThan(0);
    expect(key.length).toBeLessThanOrEqual(64);
  });

  it("honours a caller-supplied idempotency key", async () => {
    const mock = createMockFetch([{ status: 201, body: successEnvelope({ reference: "pi_1" }) }]);
    const snippe = new Snippe({ apiKey: "snp_test", fetch: mock.fetch });

    await snippe.payments.mobile.create(
      {
        amount: 500,
        phoneNumber: "255781000000",
        customer: { firstName: "A", lastName: "B", email: "a@b.co" },
      },
      { idempotencyKey: "ord-123-t1" },
    );

    expect(mock.lastRequest().headers["idempotency-key"]).toBe("ord-123-t1");
  });

  it("accepts caller-supplied keys up to 64 chars", async () => {
    const mock = createMockFetch([{ status: 201, body: successEnvelope({ reference: "pi_1" }) }]);
    const snippe = new Snippe({ apiKey: "snp_test", fetch: mock.fetch });

    const key = "a".repeat(64);
    await snippe.payments.mobile.create(
      {
        amount: 500,
        phoneNumber: "255781000000",
        customer: { firstName: "A", lastName: "B", email: "a@b.co" },
      },
      { idempotencyKey: key },
    );
    expect(mock.lastRequest().headers["idempotency-key"]).toBe(key);
  });

  it("rejects caller-supplied keys longer than 64 chars before hitting fetch", async () => {
    const mock = createMockFetch([{ status: 201, body: successEnvelope({}) }]);
    const snippe = new Snippe({ apiKey: "snp_test", fetch: mock.fetch });

    const longKey = "a".repeat(65);
    await expect(
      snippe.payments.mobile.create(
        {
          amount: 500,
          phoneNumber: "255781000000",
          customer: { firstName: "A", lastName: "B", email: "a@b.co" },
        },
        { idempotencyKey: longKey },
      ),
    ).rejects.toBeInstanceOf(SnippeValidationError);

    // No fetch call should have been made.
    expect(mock.requests).toHaveLength(0);
  });

  it("rejects an empty key, which would make the API skip deduplication", async () => {
    const mock = createMockFetch([{ status: 201, body: successEnvelope({}) }]);
    const snippe = new Snippe({ apiKey: "snp_test", fetch: mock.fetch });

    await expect(
      snippe.payouts.mobile.send(payoutInput, { idempotencyKey: "" }),
    ).rejects.toBeInstanceOf(SnippeValidationError);
    expect(mock.requests).toHaveLength(0);
  });

  it.each([
    ["an API error", { status: 500, body: errorEnvelope(500, "INT_001", "boom") }],
    ["a non-JSON response", { status: 502, rawText: "<html>bad gateway</html>" }],
    ["a network error", { throwError: new TypeError("ECONNREFUSED") }],
    ["a timeout", { delayMs: 200, body: {} }],
  ])("returns the generated key on %s so a retry can't pay twice", async (_label, failure) => {
    const mock = createMockFetch([
      failure,
      { status: 201, body: successEnvelope({ reference: "po_1" }) },
    ]);
    const snippe = new Snippe({ apiKey: "snp_test", fetch: mock.fetch, timeoutMs: 50 });

    const err = await failedSend(snippe);
    expect(err.retryable).toBe(true);
    expect(err.idempotencyKey).toBe(mock.requests[0].headers["idempotency-key"]);

    await snippe.payouts.mobile.send(payoutInput, { idempotencyKey: err.idempotencyKey });
    expect(mock.requests[1].headers["idempotency-key"]).toBe(err.idempotencyKey);
  });

  it("returns a caller-supplied key on the error too", async () => {
    const mock = createMockFetch([
      { status: 500, body: errorEnvelope(500, "INT_001", "boom") },
    ]);
    const snippe = new Snippe({ apiKey: "snp_test", fetch: mock.fetch });

    await expect(
      snippe.payouts.mobile.send(payoutInput, { idempotencyKey: "ord-1" }),
    ).rejects.toMatchObject({ idempotencyKey: "ord-1" });
  });

  it("leaves the key undefined on GET errors", async () => {
    const mock = createMockFetch([
      { status: 500, body: errorEnvelope(500, "INT_001", "boom") },
    ]);
    const snippe = new Snippe({ apiKey: "snp_test", fetch: mock.fetch });

    await expect(snippe.payments.balance()).rejects.toMatchObject({
      idempotencyKey: undefined,
    });
  });

  it("does not send an Idempotency-Key header on GET requests", async () => {
    const mock = createMockFetch([{ body: successEnvelope({ reference: "pi_1" }) }]);
    const snippe = new Snippe({ apiKey: "snp_test", fetch: mock.fetch });

    await snippe.payments.get("pi_1");

    expect(mock.lastRequest().headers["idempotency-key"]).toBeUndefined();
  });

  it("generateIdempotencyKey produces unique ≤64-char keys", () => {
    const keys = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const key = generateIdempotencyKey();
      expect(key.length).toBeLessThanOrEqual(64);
      keys.add(key);
    }
    expect(keys.size).toBeGreaterThan(95);
  });
});
