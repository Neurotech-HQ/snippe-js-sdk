import { describe, expect, it } from "vitest";
import { Snippe } from "../src";
import { createMockFetch, successEnvelope } from "./helpers/mockFetch";

describe("PayoutsResource", () => {
  it("sends a mobile payout to /v1/payouts/send", async () => {
    const mock = createMockFetch([
      {
        status: 201,
        body: successEnvelope({
          reference: "po_1",
          status: "pending",
          amount: { currency: "TZS", value: 5000 },
          fees: { currency: "TZS", value: 1500 },
          total: { currency: "TZS", value: 6500 },
          channel: { type: "mobile_money", provider: "airtel" },
          recipient: { name: "R", phone: "255781000000" },
        }),
      },
    ]);
    const snippe = new Snippe({ apiKey: "snp_test", fetch: mock.fetch });

    const payout = await snippe.payouts.send({
      amount: 5000,
      channel: "mobile",
      recipient_phone: "255781000000",
      recipient_name: "R",
      narration: "Salary January",
    });

    expect(payout.reference).toBe("po_1");
    expect(payout.total.value).toBe(6500);

    const req = mock.lastRequest();
    expect(req.method).toBe("POST");
    expect(new URL(req.url).pathname).toBe("/v1/payouts/send");
    expect(req.body).toMatchObject({
      amount: 5000,
      channel: "mobile",
      recipient_phone: "255781000000",
    });
    expect(req.headers["idempotency-key"]).toBeDefined();
  });

  it("sends a bank payout", async () => {
    const mock = createMockFetch([
      { status: 201, body: successEnvelope({ reference: "po_2", status: "pending", amount: { currency: "TZS", value: 10000 }, fees: { currency: "TZS", value: 2000 }, total: { currency: "TZS", value: 12000 }, channel: { type: "bank" }, recipient: { name: "Vendor", account: "0200000000" } }) },
    ]);
    const snippe = new Snippe({ apiKey: "snp_test", fetch: mock.fetch });

    await snippe.payouts.send({
      amount: 10000,
      channel: "bank",
      recipient_bank: "CRDB",
      recipient_account: "0200000000",
      recipient_name: "Vendor",
    });

    expect(mock.lastRequest().body).toMatchObject({
      channel: "bank",
      recipient_bank: "CRDB",
      recipient_account: "0200000000",
    });
  });

  it("calculates fees via GET /v1/payouts/fee", async () => {
    const mock = createMockFetch([
      { body: successEnvelope({ amount: 50000, fee_amount: 1000, total_amount: 51000, currency: "TZS" }) },
    ]);
    const snippe = new Snippe({ apiKey: "snp_test", fetch: mock.fetch });

    const fee = await snippe.payouts.fee(50000);
    expect(fee.total_amount).toBe(51000);

    const url = new URL(mock.lastRequest().url);
    expect(url.pathname).toBe("/v1/payouts/fee");
    expect(url.searchParams.get("amount")).toBe("50000");
  });

  it("fetches a single payout by reference", async () => {
    const mock = createMockFetch([
      { body: successEnvelope({ reference: "po_1", status: "completed", amount: { currency: "TZS", value: 5000 }, fees: { currency: "TZS", value: 1500 }, total: { currency: "TZS", value: 6500 }, channel: { type: "mobile_money" }, recipient: { name: "R" } }) },
    ]);
    const snippe = new Snippe({ apiKey: "snp_test", fetch: mock.fetch });

    await snippe.payouts.get("po_1");
    expect(new URL(mock.lastRequest().url).pathname).toBe("/v1/payouts/po_1");
  });
});
