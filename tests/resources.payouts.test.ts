import { describe, expect, it } from "vitest";
import { Snippe, SnippeValidationError } from "../src";
import { createMockFetch, successEnvelope } from "./helpers/mockFetch";

describe("PayoutsResource — mobile", () => {
  it("sends a mobile payout to /v1/payouts/send with channel=mobile and recipient_* fields", async () => {
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

    const payout = await snippe.payouts.mobile.send({
      amount: 5000,
      phoneNumber: "0781000000",
      recipientName: "R",
      narration: "Salary January",
    });

    expect(payout.reference).toBe("po_1");
    expect(payout.total.value).toBe(6500);

    const req = mock.lastRequest();
    expect(req.method).toBe("POST");
    expect(new URL(req.url).pathname).toBe("/v1/payouts/send");
    expect(req.body).toMatchObject({
      channel: "mobile",
      amount: 5000,
      recipient_phone: "255781000000",
      recipient_name: "R",
      narration: "Salary January",
    });
    expect(req.headers["idempotency-key"]).toBeDefined();
  });

  it("calculates the fee for a given amount", async () => {
    const mock = createMockFetch([
      {
        body: successEnvelope({
          amount: 50000,
          fee_amount: 1000,
          total_amount: 51000,
          currency: "TZS",
        }),
      },
    ]);
    const snippe = new Snippe({ apiKey: "snp_test", fetch: mock.fetch });

    const fee = await snippe.payouts.mobile.fee({ amount: 50000 });
    expect(fee.totalAmount).toBe(51000);

    const url = new URL(mock.lastRequest().url);
    expect(url.pathname).toBe("/v1/payouts/fee");
    expect(url.searchParams.get("amount")).toBe("50000");
  });
});

describe("PayoutsResource — min-amount validation", () => {
  it("rejects mobile payouts below 5000 TZS before hitting fetch", async () => {
    const mock = createMockFetch([{ status: 201, body: successEnvelope({ reference: "po_1" }) }]);
    const snippe = new Snippe({ apiKey: "snp_test", fetch: mock.fetch });

    await expect(
      snippe.payouts.mobile.send({
        amount: 4999,
        phoneNumber: "255781000000",
        recipientName: "R",
      }),
    ).rejects.toBeInstanceOf(SnippeValidationError);

    expect(mock.requests).toHaveLength(0);
  });

  it("rejects bank payouts below 5000 TZS before hitting fetch", async () => {
    const mock = createMockFetch([{ status: 201, body: successEnvelope({ reference: "po_2" }) }]);
    const snippe = new Snippe({ apiKey: "snp_test", fetch: mock.fetch });

    await expect(
      snippe.payouts.bank.send({
        amount: 4999,
        bankCode: "CRDB",
        accountNumber: "0150300012345",
        accountName: "Vendor",
      }),
    ).rejects.toBeInstanceOf(SnippeValidationError);

    expect(mock.requests).toHaveLength(0);
  });
});

describe("PayoutsResource — bank", () => {
  it("sends a bank payout with bankCode/accountNumber/accountName mapped to recipient_* fields", async () => {
    const mock = createMockFetch([
      {
        status: 201,
        body: successEnvelope({
          reference: "po_2",
          status: "pending",
          amount: { currency: "TZS", value: 100000 },
          fees: { currency: "TZS", value: 2000 },
          total: { currency: "TZS", value: 102000 },
          channel: { type: "bank", bank: "CRDB" },
          recipient: { name: "Vendor", account: "0150300012345" },
        }),
      },
    ]);
    const snippe = new Snippe({ apiKey: "snp_test", fetch: mock.fetch });

    await snippe.payouts.bank.send({
      amount: 100000,
      bankCode: "CRDB",
      accountNumber: "0150300012345",
      accountName: "Vendor",
      narration: "Vendor Q1",
    });

    expect(mock.lastRequest().body).toMatchObject({
      channel: "bank",
      amount: 100000,
      recipient_bank: "CRDB",
      recipient_account: "0150300012345",
      recipient_name: "Vendor",
    });
  });

  it("calculates the fee via the same /v1/payouts/fee endpoint", async () => {
    const mock = createMockFetch([
      {
        body: successEnvelope({
          amount: 100000,
          fee_amount: 2000,
          total_amount: 102000,
          currency: "TZS",
        }),
      },
    ]);
    const snippe = new Snippe({ apiKey: "snp_test", fetch: mock.fetch });

    await snippe.payouts.bank.fee({ amount: 100000 });
    const url = new URL(mock.lastRequest().url);
    expect(url.pathname).toBe("/v1/payouts/fee");
    expect(url.searchParams.get("amount")).toBe("100000");
  });
});

describe("PayoutsResource — cross-channel reads", () => {
  it("fetches a single payout by reference", async () => {
    const mock = createMockFetch([
      {
        body: successEnvelope({
          reference: "po_1",
          status: "completed",
          amount: { currency: "TZS", value: 5000 },
          fees: { currency: "TZS", value: 1500 },
          total: { currency: "TZS", value: 6500 },
          channel: { type: "mobile_money" },
          recipient: { name: "R" },
        }),
      },
    ]);
    const snippe = new Snippe({ apiKey: "snp_test", fetch: mock.fetch });

    await snippe.payouts.get("po_1");
    expect(new URL(mock.lastRequest().url).pathname).toBe("/v1/payouts/po_1");
  });

  it("lists payouts with status and channel filters", async () => {
    const mock = createMockFetch([{ body: successEnvelope([]) }]);
    const snippe = new Snippe({ apiKey: "snp_test", fetch: mock.fetch });

    await snippe.payouts.list({ limit: 10, status: "completed", channel: "mobile" });
    const url = new URL(mock.lastRequest().url);
    expect(url.pathname).toBe("/v1/payouts");
    expect(url.searchParams.get("limit")).toBe("10");
    expect(url.searchParams.get("status")).toBe("completed");
    expect(url.searchParams.get("channel")).toBe("mobile");
  });
});
