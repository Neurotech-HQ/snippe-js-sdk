import { describe, expect, it, vi } from "vitest";
import { Snippe } from "../src";
import { createMockFetch, successEnvelope } from "./helpers/mockFetch";

describe("CheckoutResource (snippe.checkout)", () => {
  it("creates a fixed-amount session at /api/v1/sessions", async () => {
    const mock = createMockFetch([
      {
        status: 201,
        body: {
          code: 201,
          data: {
            reference: "sess_1",
            status: "pending",
            amount: 50000,
            currency: "TZS",
            checkout_url: "https://snippe.me/checkout/xyz",
            short_code: "Ax7kM2",
            payment_link_url: "https://snippe.me/p/Ax7kM2",
            expires_at: "2026-02-26T11:00:00Z",
          },
        },
      },
    ]);
    const snippe = new Snippe({ apiKey: "snp_test", fetch: mock.fetch });

    const session = await snippe.checkout.create({
      amount: 50000,
      allowedMethods: ["mobile_money", "card"],
      description: "Order #12345",
    });

    expect(session.reference).toBe("sess_1");
    expect(session.paymentLinkUrl).toBe("https://snippe.me/p/Ax7kM2");

    const req = mock.lastRequest();
    expect(req.method).toBe("POST");
    expect(new URL(req.url).pathname).toBe("/api/v1/sessions");
    expect(req.body).toMatchObject({
      amount: 50000,
      currency: "TZS",
      allowed_methods: ["mobile_money", "card"],
    });
  });

  it("creates a custom-amount session with camelCase inputs translated to snake_case wire format", async () => {
    const mock = createMockFetch([
      {
        status: 201,
        body: {
          reference: "sess_2",
          status: "pending",
          currency: "TZS",
          checkout_url: "x",
          short_code: "y",
          payment_link_url: "z",
          expires_at: "2026-01-01T00:00:00Z",
        },
      },
    ]);
    const snippe = new Snippe({ apiKey: "snp_test", fetch: mock.fetch });

    await snippe.checkout.create({
      allowCustomAmount: true,
      minAmount: 1000,
      maxAmount: 500000,
      description: "Donation",
    });

    expect(mock.lastRequest().body).toMatchObject({
      allow_custom_amount: true,
      min_amount: 1000,
      max_amount: 500000,
    });
  });

  it("cancels a session via POST /cancel", async () => {
    const mock = createMockFetch([
      {
        body: {
          reference: "sess_1",
          status: "cancelled",
          currency: "TZS",
          checkout_url: "x",
          short_code: "y",
          payment_link_url: "z",
          expires_at: "x",
        },
      },
    ]);
    const snippe = new Snippe({ apiKey: "snp_test", fetch: mock.fetch });

    await snippe.checkout.cancel("sess_1");
    const req = mock.lastRequest();
    expect(req.method).toBe("POST");
    expect(new URL(req.url).pathname).toBe("/api/v1/sessions/sess_1/cancel");
  });

  it("lists sessions with query params", async () => {
    const mock = createMockFetch([{ body: successEnvelope([]) }]);
    const snippe = new Snippe({ apiKey: "snp_test", fetch: mock.fetch });

    await snippe.checkout.list({ limit: 5, status: "pending" });
    const url = new URL(mock.lastRequest().url);
    expect(url.pathname).toBe("/api/v1/sessions");
    expect(url.searchParams.get("limit")).toBe("5");
    expect(url.searchParams.get("status")).toBe("pending");
  });
});

describe("snippe.sessions deprecation alias", () => {
  it("warns once on first .sessions access and returns the same CheckoutResource as .checkout", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const snippe = new Snippe({ apiKey: "snp_test" });
    const fromAlias = snippe.sessions;
    const fromCanonical = snippe.checkout;

    expect(fromAlias).toBe(fromCanonical);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toContain("snippe.sessions");
    expect(warnSpy.mock.calls[0][0]).toContain("snippe.checkout");

    // Subsequent accesses (in this process) must not warn again.
    snippe.sessions.create;
    snippe.sessions.list;
    expect(warnSpy).toHaveBeenCalledTimes(1);

    // A second client instance also doesn't re-warn (gate is per-process).
    const snippe2 = new Snippe({ apiKey: "snp_test" });
    snippe2.sessions;
    expect(warnSpy).toHaveBeenCalledTimes(1);

    warnSpy.mockRestore();
  });

  it("functionally routes to the same network calls as snippe.checkout", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const mock = createMockFetch([{ body: successEnvelope([]) }]);
    const snippe = new Snippe({ apiKey: "snp_test", fetch: mock.fetch });

    await snippe.sessions.list();
    expect(new URL(mock.lastRequest().url).pathname).toBe("/api/v1/sessions");

    warnSpy.mockRestore();
  });
});
