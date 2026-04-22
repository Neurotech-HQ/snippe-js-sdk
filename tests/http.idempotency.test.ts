import { describe, expect, it } from "vitest";
import { Snippe, SnippeValidationError, generateIdempotencyKey } from "../src";
import { createMockFetch, successEnvelope } from "./helpers/mockFetch";

describe("Idempotency keys", () => {
  it("auto-generates a key ≤30 chars on POST when the caller omits one", async () => {
    const mock = createMockFetch([{ status: 201, body: successEnvelope({ reference: "pi_1" }) }]);
    const snippe = new Snippe({ apiKey: "snp_test", fetch: mock.fetch });

    await snippe.payments.create({
      payment_type: "mobile",
      details: { amount: 500 },
      phone_number: "255781000000",
      customer: { firstname: "A", lastname: "B", email: "a@b.co" },
    });

    const key = mock.lastRequest().headers["idempotency-key"];
    expect(key).toBeDefined();
    expect(key.length).toBeGreaterThan(0);
    expect(key.length).toBeLessThanOrEqual(30);
  });

  it("honours a caller-supplied idempotency key", async () => {
    const mock = createMockFetch([{ status: 201, body: successEnvelope({ reference: "pi_1" }) }]);
    const snippe = new Snippe({ apiKey: "snp_test", fetch: mock.fetch });

    await snippe.payments.create(
      {
        payment_type: "mobile",
        details: { amount: 500 },
        phone_number: "255781000000",
        customer: { firstname: "A", lastname: "B", email: "a@b.co" },
      },
      { idempotencyKey: "ord-123-t1" },
    );

    expect(mock.lastRequest().headers["idempotency-key"]).toBe("ord-123-t1");
  });

  it("rejects caller-supplied keys longer than 30 chars before hitting fetch", async () => {
    const mock = createMockFetch([{ status: 201, body: successEnvelope({}) }]);
    const snippe = new Snippe({ apiKey: "snp_test", fetch: mock.fetch });

    const longKey = "a".repeat(31);
    await expect(
      snippe.payments.create(
        {
          payment_type: "mobile",
          details: { amount: 500 },
          phone_number: "255781000000",
          customer: { firstname: "A", lastname: "B", email: "a@b.co" },
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

  it("generateIdempotencyKey produces unique ≤30-char keys", () => {
    const keys = new Set<string>();
    for (let i = 0; i < 100; i++) {
      const key = generateIdempotencyKey();
      expect(key.length).toBeLessThanOrEqual(30);
      keys.add(key);
    }
    expect(keys.size).toBeGreaterThan(95);
  });
});
