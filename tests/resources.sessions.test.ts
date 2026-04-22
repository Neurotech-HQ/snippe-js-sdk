import { describe, expect, it } from "vitest";
import { Snippe } from "../src";
import { createMockFetch, successEnvelope } from "./helpers/mockFetch";

describe("SessionsResource", () => {
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

    const session = await snippe.sessions.create({
      amount: 50000,
      allowed_methods: ["mobile_money", "qr"],
      description: "Order #12345",
    });

    expect(session.reference).toBe("sess_1");
    expect(session.payment_link_url).toBe("https://snippe.me/p/Ax7kM2");

    const req = mock.lastRequest();
    expect(req.method).toBe("POST");
    expect(new URL(req.url).pathname).toBe("/api/v1/sessions");
    expect(req.body).toMatchObject({
      amount: 50000,
      currency: "TZS",
      allowed_methods: ["mobile_money", "qr"],
    });
  });

  it("creates a custom-amount session", async () => {
    const mock = createMockFetch([
      { status: 201, body: { reference: "sess_2", status: "pending", currency: "TZS", checkout_url: "x", short_code: "y", payment_link_url: "z", expires_at: "2026-01-01T00:00:00Z" } },
    ]);
    const snippe = new Snippe({ apiKey: "snp_test", fetch: mock.fetch });

    await snippe.sessions.create({
      allow_custom_amount: true,
      min_amount: 1000,
      max_amount: 500000,
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
      { body: { reference: "sess_1", status: "cancelled", currency: "TZS", checkout_url: "x", short_code: "y", payment_link_url: "z", expires_at: "x" } },
    ]);
    const snippe = new Snippe({ apiKey: "snp_test", fetch: mock.fetch });

    await snippe.sessions.cancel("sess_1");
    const req = mock.lastRequest();
    expect(req.method).toBe("POST");
    expect(new URL(req.url).pathname).toBe("/api/v1/sessions/sess_1/cancel");
  });

  it("lists sessions with query params", async () => {
    const mock = createMockFetch([{ body: successEnvelope([]) }]);
    const snippe = new Snippe({ apiKey: "snp_test", fetch: mock.fetch });

    await snippe.sessions.list({ limit: 5, status: "pending" });
    const url = new URL(mock.lastRequest().url);
    expect(url.pathname).toBe("/api/v1/sessions");
    expect(url.searchParams.get("limit")).toBe("5");
    expect(url.searchParams.get("status")).toBe("pending");
  });
});
