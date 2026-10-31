import { describe, expect, it } from "vitest";
import { Snippe, SnippeValidationError, generateIdempotencyKey } from "../src";
import { createMockFetch, successEnvelope } from "./helpers/mockFetch";

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
