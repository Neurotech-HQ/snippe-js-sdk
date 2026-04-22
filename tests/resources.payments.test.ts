import { describe, expect, it } from "vitest";
import { Snippe } from "../src";
import { createMockFetch, successEnvelope } from "./helpers/mockFetch";

describe("PaymentsResource", () => {
  it("posts mobile payments to /v1/payments with auto-filled currency and default webhook URL", async () => {
    const mock = createMockFetch([{ status: 201, body: successEnvelope({ reference: "pi_1", status: "pending" }) }]);
    const snippe = new Snippe({
      apiKey: "snp_test",
      fetch: mock.fetch,
      webhookUrl: "https://example.com/webhooks/snippe",
    });

    await snippe.payments.create({
      payment_type: "mobile",
      details: { amount: 500 },
      phone_number: "255781000000",
      customer: { firstname: "A", lastname: "B", email: "a@b.co" },
    });

    const req = mock.lastRequest();
    expect(req.method).toBe("POST");
    expect(new URL(req.url).pathname).toBe("/v1/payments");
    expect(req.body).toMatchObject({
      payment_type: "mobile",
      details: { amount: 500, currency: "TZS" },
      webhook_url: "https://example.com/webhooks/snippe",
    });
  });

  it("does not overwrite a per-call webhook_url", async () => {
    const mock = createMockFetch([{ status: 201, body: successEnvelope({ reference: "pi_1" }) }]);
    const snippe = new Snippe({
      apiKey: "snp_test",
      fetch: mock.fetch,
      webhookUrl: "https://default.example/wh",
    });

    await snippe.payments.create({
      payment_type: "mobile",
      details: { amount: 500 },
      phone_number: "255781000000",
      customer: { firstname: "A", lastname: "B", email: "a@b.co" },
      webhook_url: "https://override.example/wh",
    });

    expect(mock.lastRequest().body).toMatchObject({ webhook_url: "https://override.example/wh" });
  });

  it("preserves an explicit currency instead of auto-filling", async () => {
    const mock = createMockFetch([{ status: 201, body: successEnvelope({ reference: "pi_1" }) }]);
    const snippe = new Snippe({ apiKey: "snp_test", fetch: mock.fetch });

    await snippe.payments.create({
      payment_type: "mobile",
      details: { amount: 500, currency: "TZS" },
      phone_number: "255781000000",
      customer: { firstname: "A", lastname: "B", email: "a@b.co" },
    });

    expect((mock.lastRequest().body as { details: { currency: string } }).details.currency).toBe("TZS");
  });

  it("fetches a single payment by reference", async () => {
    const mock = createMockFetch([{ body: successEnvelope({ reference: "pi_abc", status: "completed" }) }]);
    const snippe = new Snippe({ apiKey: "snp_test", fetch: mock.fetch });

    const payment = await snippe.payments.get("pi_abc");
    expect(payment.reference).toBe("pi_abc");
    expect(new URL(mock.lastRequest().url).pathname).toBe("/v1/payments/pi_abc");
  });

  it("re-triggers a USSD push", async () => {
    const mock = createMockFetch([{ body: successEnvelope({ reference: "pi_abc", status: "pending" }) }]);
    const snippe = new Snippe({ apiKey: "snp_test", fetch: mock.fetch });

    await snippe.payments.retriggerPush("pi_abc");
    const req = mock.lastRequest();
    expect(req.method).toBe("POST");
    expect(new URL(req.url).pathname).toBe("/v1/payments/pi_abc/push");
  });

  it("calls /v1/payments/balance", async () => {
    const mock = createMockFetch([
      { body: successEnvelope({ available: { currency: "TZS", value: 1234 }, balance: { currency: "TZS", value: 1234 }, object: "balance" }) },
    ]);
    const snippe = new Snippe({ apiKey: "snp_test", fetch: mock.fetch });

    const balance = await snippe.payments.balance();
    expect(balance.available.value).toBe(1234);
    expect(new URL(mock.lastRequest().url).pathname).toBe("/v1/payments/balance");
  });

  it("searches with query params", async () => {
    const mock = createMockFetch([{ body: successEnvelope([]) }]);
    const snippe = new Snippe({ apiKey: "snp_test", fetch: mock.fetch });

    await snippe.payments.search({ phone_number: "255781000000", status: "completed" });
    const url = new URL(mock.lastRequest().url);
    expect(url.pathname).toBe("/v1/payments/search");
    expect(url.searchParams.get("phone_number")).toBe("255781000000");
    expect(url.searchParams.get("status")).toBe("completed");
  });
});
