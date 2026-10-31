import { describe, expect, it } from "vitest";
import { Snippe, SnippeValidationError } from "../src";
import { createMockFetch, successEnvelope } from "./helpers/mockFetch";

describe("PaymentsResource — mobile", () => {
  it("posts to /v1/payments with paymentType=mobile and default webhook URL", async () => {
    const mock = createMockFetch([
      { status: 201, body: successEnvelope({ reference: "pi_1", status: "pending" }) },
    ]);
    const snippe = new Snippe({
      apiKey: "snp_test",
      fetch: mock.fetch,
      webhookUrl: "https://example.com/webhooks/snippe",
    });

    await snippe.payments.mobile.create({
      amount: 500,
      phoneNumber: "255781000000",
      customer: { firstName: "Jane", lastName: "Doe", email: "jane@example.com" },
    });

    const req = mock.lastRequest();
    expect(req.method).toBe("POST");
    expect(new URL(req.url).pathname).toBe("/v1/payments");
    expect(req.body).toMatchObject({
      payment_type: "mobile",
      details: { amount: 500, currency: "TZS" },
      phone_number: "255781000000",
      webhook_url: "https://example.com/webhooks/snippe",
    });
  });

  it("passes subaccount through to the wire", async () => {
    const mock = createMockFetch([{ status: 201, body: successEnvelope({ reference: "pi_1" }) }]);
    const snippe = new Snippe({ apiKey: "snp_test", fetch: mock.fetch });

    await snippe.payments.mobile.create({
      amount: 500,
      phoneNumber: "255781000000",
      customer: { firstName: "A", lastName: "B", email: "a@b.co" },
      subaccount: "wallet_shop",
    });

    expect(mock.lastRequest().body).toMatchObject({ subaccount: "wallet_shop" });
  });

  it("normalises a local 0XXXXXXXXX phone before sending", async () => {
    const mock = createMockFetch([{ status: 201, body: successEnvelope({ reference: "pi_1" }) }]);
    const snippe = new Snippe({ apiKey: "snp_test", fetch: mock.fetch });

    await snippe.payments.mobile.create({
      amount: 500,
      phoneNumber: "0781000000",
      customer: { firstName: "A", lastName: "B", email: "a@b.co" },
    });

    expect(mock.lastRequest().body).toMatchObject({ phone_number: "255781000000" });
  });

  it("translates firstName/lastName to firstname/lastname on the wire", async () => {
    const mock = createMockFetch([{ status: 201, body: successEnvelope({ reference: "pi_1" }) }]);
    const snippe = new Snippe({ apiKey: "snp_test", fetch: mock.fetch });

    await snippe.payments.mobile.create({
      amount: 500,
      phoneNumber: "255781000000",
      customer: { firstName: "Jane", lastName: "Doe", email: "j@d.co" },
    });

    expect(mock.lastRequest().body).toMatchObject({
      customer: { firstname: "Jane", lastname: "Doe", email: "j@d.co" },
    });
  });

  it("does not overwrite a per-call webhookUrl", async () => {
    const mock = createMockFetch([{ status: 201, body: successEnvelope({ reference: "pi_1" }) }]);
    const snippe = new Snippe({
      apiKey: "snp_test",
      fetch: mock.fetch,
      webhookUrl: "https://default.example/wh",
    });

    await snippe.payments.mobile.create({
      amount: 500,
      phoneNumber: "255781000000",
      customer: { firstName: "A", lastName: "B", email: "a@b.co" },
      webhookUrl: "https://override.example/wh",
    });

    expect(mock.lastRequest().body).toMatchObject({
      webhook_url: "https://override.example/wh",
    });
  });

  it("rejects amounts below 500 TZS before hitting fetch", async () => {
    const mock = createMockFetch([{ status: 201, body: successEnvelope({ reference: "pi_1" }) }]);
    const snippe = new Snippe({ apiKey: "snp_test", fetch: mock.fetch });

    await expect(
      snippe.payments.mobile.create({
        amount: 499,
        phoneNumber: "255781000000",
        customer: { firstName: "A", lastName: "B", email: "a@b.co" },
      }),
    ).rejects.toBeInstanceOf(SnippeValidationError);

    expect(mock.requests).toHaveLength(0);
  });

  it("rejects an invalid phone number before hitting fetch", async () => {
    const mock = createMockFetch([{ status: 201, body: successEnvelope({ reference: "pi_1" }) }]);
    const snippe = new Snippe({ apiKey: "snp_test", fetch: mock.fetch });

    await expect(
      snippe.payments.mobile.create({
        amount: 500,
        phoneNumber: "not-a-phone",
        customer: { firstName: "A", lastName: "B", email: "a@b.co" },
      }),
    ).rejects.toBeInstanceOf(SnippeValidationError);

    expect(mock.requests).toHaveLength(0);
  });
});

describe("PaymentsResource — card", () => {
  it("posts to /v1/payments with paymentType=card and full details", async () => {
    const mock = createMockFetch([
      { status: 201, body: successEnvelope({ reference: "pi_2", status: "pending" }) },
    ]);
    const snippe = new Snippe({ apiKey: "snp_test", fetch: mock.fetch });

    await snippe.payments.card.create({
      amount: 50_000,
      phoneNumber: "+255781000000",
      redirectUrl: "https://shop.example.com/done",
      cancelUrl: "https://shop.example.com/cart",
      customer: {
        firstName: "Jane",
        lastName: "Doe",
        email: "jane@example.com",
        address: "Plot 12, Msasani",
        city: "Dar es Salaam",
        state: "Dar",
        postcode: "11101",
        country: "TZ",
      },
    });

    const req = mock.lastRequest();
    expect(new URL(req.url).pathname).toBe("/v1/payments");
    expect(req.body).toMatchObject({
      payment_type: "card",
      details: {
        amount: 50_000,
        currency: "TZS",
        redirect_url: "https://shop.example.com/done",
        cancel_url: "https://shop.example.com/cart",
      },
      phone_number: "255781000000",
      customer: {
        firstname: "Jane",
        lastname: "Doe",
        address: "Plot 12, Msasani",
        country: "TZ",
      },
    });
  });

  it("allows omitting cancelUrl (only redirectUrl is required by the API)", async () => {
    const mock = createMockFetch([{ status: 201, body: successEnvelope({ reference: "pi_3" }) }]);
    const snippe = new Snippe({ apiKey: "snp_test", fetch: mock.fetch });

    await snippe.payments.card.create({
      amount: 50_000,
      phoneNumber: "255781000000",
      redirectUrl: "https://shop.example.com/done",
      customer: {
        firstName: "Jane",
        lastName: "Doe",
        email: "jane@example.com",
        address: "Plot 12",
        city: "Dar es Salaam",
        state: "Dar",
        postcode: "11101",
        country: "TZ",
      },
    });

    const details = (mock.lastRequest().body as { details: Record<string, unknown> }).details;
    expect(details.redirect_url).toBe("https://shop.example.com/done");
    expect(details).not.toHaveProperty("cancel_url");
  });
});

describe("PaymentsResource — cross-channel reads", () => {
  it("fetches a single payment by reference", async () => {
    const mock = createMockFetch([
      { body: successEnvelope({ reference: "pi_abc", status: "completed" }) },
    ]);
    const snippe = new Snippe({ apiKey: "snp_test", fetch: mock.fetch });

    const payment = await snippe.payments.get("pi_abc");
    expect(payment.reference).toBe("pi_abc");
    expect(new URL(mock.lastRequest().url).pathname).toBe("/v1/payments/pi_abc");
  });

  it("re-triggers a USSD push and returns the push result", async () => {
    const mock = createMockFetch([
      {
        body: successEnvelope({
          reference: "pi_abc",
          external_reference: "psp_1",
          status: "pending",
          phone: "255781000000",
        }),
      },
    ]);
    const snippe = new Snippe({ apiKey: "snp_test", fetch: mock.fetch });

    const result = await snippe.payments.retriggerPush("pi_abc");
    expect(result.externalReference).toBe("psp_1");
    const req = mock.lastRequest();
    expect(req.method).toBe("POST");
    expect(new URL(req.url).pathname).toBe("/v1/payments/pi_abc/push");
    expect(req.body).toBeUndefined();
  });

  it("re-triggers a USSD push to a different, normalised phone", async () => {
    const mock = createMockFetch([{ body: successEnvelope({ reference: "pi_abc" }) }]);
    const snippe = new Snippe({ apiKey: "snp_test", fetch: mock.fetch });

    await snippe.payments.retriggerPush("pi_abc", { phoneNumber: "0712000000" });
    expect(mock.lastRequest().body).toEqual({ phone: "255712000000" });
  });

  it("calls /v1/payments/balance", async () => {
    const mock = createMockFetch([
      {
        body: successEnvelope({
          available: { currency: "TZS", value: 1234 },
          balance: { currency: "TZS", value: 1234 },
          object: "balance",
        }),
      },
    ]);
    const snippe = new Snippe({ apiKey: "snp_test", fetch: mock.fetch });

    const balance = await snippe.payments.balance();
    expect(balance.available.value).toBe(1234);
    expect(new URL(mock.lastRequest().url).pathname).toBe("/v1/payments/balance");
  });

  it("searches via /api/v1/payments/search with phone and status", async () => {
    const mock = createMockFetch([
      { body: successEnvelope({ items: [], total: 0, limit: 10, offset: 0 }) },
    ]);
    const snippe = new Snippe({ apiKey: "snp_test", fetch: mock.fetch });

    const page = await snippe.payments.search({ phone: "781000000", status: "completed" });
    expect(page.items).toEqual([]);
    const url = new URL(mock.lastRequest().url);
    expect(url.pathname).toBe("/api/v1/payments/search");
    expect(url.searchParams.get("phone")).toBe("781000000");
    expect(url.searchParams.get("status")).toBe("completed");
  });

  it("lists payments as a page and snake_cases date filters", async () => {
    const mock = createMockFetch([
      {
        body: successEnvelope({
          items: [{ reference: "pi_1", status: "completed", payment_type: "mobile" }],
          total: 1,
          limit: 20,
          offset: 0,
        }),
      },
    ]);
    const snippe = new Snippe({ apiKey: "snp_test", fetch: mock.fetch });

    const page = await snippe.payments.list({ limit: 20, fromDate: "2026-01-01", toDate: "2026-01-31" });
    expect(page.total).toBe(1);
    expect(page.items[0].paymentType).toBe("mobile");
    const url = new URL(mock.lastRequest().url);
    expect(url.pathname).toBe("/v1/payments");
    expect(url.searchParams.get("limit")).toBe("20");
    expect(url.searchParams.get("from_date")).toBe("2026-01-01");
    expect(url.searchParams.get("to_date")).toBe("2026-01-31");
  });
});
