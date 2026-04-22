import { describe, expect, it } from "vitest";
import { Snippe } from "../src";
import { createMockFetch, successEnvelope } from "./helpers/mockFetch";

describe("HTTP client", () => {
  it("sends Authorization, version, and User-Agent headers", async () => {
    const mock = createMockFetch([{ body: successEnvelope({ available: { value: 0, currency: "TZS" }, balance: { value: 0, currency: "TZS" }, object: "balance" }) }]);
    const snippe = new Snippe({ apiKey: "snp_abc", fetch: mock.fetch });

    await snippe.payments.balance();

    const req = mock.lastRequest();
    expect(req.headers["authorization"]).toBe("Bearer snp_abc");
    expect(req.headers["snippe-version"]).toBe("2026-01-25");
    expect(req.headers["user-agent"]).toMatch(/^@snippe\/sdk\//);
    expect(req.headers["accept"]).toBe("application/json");
  });

  it("unwraps the success envelope and returns the inner data", async () => {
    const balance = { available: { value: 5000, currency: "TZS" as const }, balance: { value: 5000, currency: "TZS" as const }, object: "balance" as const };
    const mock = createMockFetch([{ body: successEnvelope(balance) }]);
    const snippe = new Snippe({ apiKey: "snp_test", fetch: mock.fetch });

    const result = await snippe.payments.balance();
    expect(result).toEqual(balance);
  });

  it("builds query strings, skipping undefined/null values", async () => {
    const mock = createMockFetch([{ body: successEnvelope([]) }]);
    const snippe = new Snippe({ apiKey: "snp_test", fetch: mock.fetch });

    await snippe.payments.list({ limit: 10, status: undefined, payment_type: "mobile" });

    const url = new URL(mock.lastRequest().url);
    expect(url.pathname).toBe("/v1/payments");
    expect(url.searchParams.get("limit")).toBe("10");
    expect(url.searchParams.get("payment_type")).toBe("mobile");
    expect(url.searchParams.has("status")).toBe(false);
  });

  it("URL-encodes path parameters", async () => {
    const mock = createMockFetch([{ body: successEnvelope({ reference: "a b/c" }) }]);
    const snippe = new Snippe({ apiKey: "snp_test", fetch: mock.fetch });

    await snippe.payments.get("a b/c");

    expect(mock.lastRequest().url).toContain("/v1/payments/a%20b%2Fc");
  });

  it("sends Content-Type and a JSON body on POST", async () => {
    const mock = createMockFetch([{ status: 201, body: successEnvelope({ reference: "pi_1", status: "pending" }) }]);
    const snippe = new Snippe({ apiKey: "snp_test", fetch: mock.fetch });

    await snippe.payments.create({
      payment_type: "mobile",
      details: { amount: 500 },
      phone_number: "255781000000",
      customer: { firstname: "A", lastname: "B", email: "a@b.co" },
    });

    const req = mock.lastRequest();
    expect(req.method).toBe("POST");
    expect(req.headers["content-type"]).toBe("application/json");
    expect(req.body).toMatchObject({
      payment_type: "mobile",
      details: { amount: 500, currency: "TZS" },
    });
  });

  it("passes non-enveloped responses through unchanged", async () => {
    // Sessions API returns responses with `code` + `data` but no `status: success` marker documented
    const payload = { reference: "sess_1", status: "pending", checkout_url: "https://snippe.me/c/x" };
    const mock = createMockFetch([{ status: 201, body: payload }]);
    const snippe = new Snippe({ apiKey: "snp_test", fetch: mock.fetch });

    const result = await snippe.sessions.get("sess_1");
    expect(result).toEqual(payload);
  });
});
