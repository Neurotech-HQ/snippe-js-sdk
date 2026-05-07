import { describe, expect, it } from "vitest";
import { toCamelCase, toSnakeCase } from "../src/internal/caseMap";

describe("toSnakeCase", () => {
  it("converts top-level camelCase keys", () => {
    expect(toSnakeCase({ firstName: "Jane" })).toEqual({ first_name: "Jane" });
  });

  it("handles multi-word keys with consecutive transitions", () => {
    expect(toSnakeCase({ paymentLinkUrl: "abc" })).toEqual({ payment_link_url: "abc" });
  });

  it("recurses into nested objects", () => {
    expect(
      toSnakeCase({ customer: { firstName: "Jane", lastName: "Doe" } }),
    ).toEqual({ customer: { first_name: "Jane", last_name: "Doe" } });
  });

  it("recurses into arrays of objects", () => {
    expect(toSnakeCase({ items: [{ itemId: 1 }, { itemId: 2 }] })).toEqual({
      items: [{ item_id: 1 }, { item_id: 2 }],
    });
  });

  it("leaves Date instances untouched", () => {
    const date = new Date("2026-01-25T00:00:00Z");
    const out = toSnakeCase({ createdAt: date }) as { created_at: Date };
    expect(out.created_at).toBe(date);
  });

  it("leaves Buffer instances untouched", () => {
    const buf = Buffer.from("hello");
    const out = toSnakeCase({ payloadBytes: buf }) as { payload_bytes: Buffer };
    expect(out.payload_bytes).toBe(buf);
  });

  it("passes primitives through unchanged", () => {
    expect(toSnakeCase("string")).toBe("string");
    expect(toSnakeCase(42)).toBe(42);
    expect(toSnakeCase(true)).toBe(true);
    expect(toSnakeCase(null)).toBe(null);
    expect(toSnakeCase(undefined)).toBe(undefined);
  });

  it("preserves null values inside objects", () => {
    expect(toSnakeCase({ phoneNumber: null })).toEqual({ phone_number: null });
  });

  it("is idempotent for already-snake_case keys", () => {
    expect(toSnakeCase({ first_name: "Jane" })).toEqual({ first_name: "Jane" });
  });

  it("preserves arrays of primitives", () => {
    expect(toSnakeCase({ allowedMethods: ["mobile_money", "card"] })).toEqual({
      allowed_methods: ["mobile_money", "card"],
    });
  });
});

describe("toCamelCase", () => {
  it("converts top-level snake_case keys", () => {
    expect(toCamelCase({ first_name: "Jane" })).toEqual({ firstName: "Jane" });
  });

  it("handles multi-underscore keys", () => {
    expect(toCamelCase({ payment_link_url: "abc" })).toEqual({ paymentLinkUrl: "abc" });
  });

  it("recurses into nested objects", () => {
    expect(
      toCamelCase({ customer: { first_name: "Jane", last_name: "Doe" } }),
    ).toEqual({ customer: { firstName: "Jane", lastName: "Doe" } });
  });

  it("recurses into arrays", () => {
    expect(toCamelCase({ items: [{ item_id: 1 }] })).toEqual({
      items: [{ itemId: 1 }],
    });
  });

  it("is idempotent for already-camelCase keys", () => {
    expect(toCamelCase({ firstName: "Jane" })).toEqual({ firstName: "Jane" });
  });

  it("round-trips with toSnakeCase", () => {
    const input = {
      paymentType: "mobile",
      phoneNumber: "255781000000",
      customer: { firstName: "Jane", lastName: "Doe" },
      metadata: { orderId: "x", attemptCount: 2 },
      tags: [{ tagId: 1 }, { tagId: 2 }],
    };
    expect(toCamelCase(toSnakeCase(input))).toEqual(input);
  });
});
