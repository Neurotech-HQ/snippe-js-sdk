import { describe, expect, it } from "vitest";
import { SnippeValidationError } from "../src/errors";
import { normalisePhone } from "../src/internal/normalisePhone";

describe("normalisePhone", () => {
  it("passes through canonical 255XXXXXXXXX format", () => {
    expect(normalisePhone("255781000000")).toBe("255781000000");
  });

  it("strips the leading + from +255XXXXXXXXX", () => {
    expect(normalisePhone("+255781000000")).toBe("255781000000");
  });

  it("converts local 0XXXXXXXXX to 255XXXXXXXXX", () => {
    expect(normalisePhone("0781000000")).toBe("255781000000");
  });

  it("converts bare 9-digit number to 255XXXXXXXXX", () => {
    expect(normalisePhone("781000000")).toBe("255781000000");
  });

  it("strips whitespace, dashes, and parens", () => {
    expect(normalisePhone("+255 781 000 000")).toBe("255781000000");
    expect(normalisePhone("0781-000-000")).toBe("255781000000");
    expect(normalisePhone("(0781) 000 000")).toBe("255781000000");
  });

  it("accepts all TZ mobile carrier prefixes (6, 7, 8)", () => {
    expect(normalisePhone("0612345678")).toBe("255612345678");
    expect(normalisePhone("0712345678")).toBe("255712345678");
    expect(normalisePhone("0812345678")).toBe("255812345678");
  });

  it("throws SnippeValidationError on empty string", () => {
    expect(() => normalisePhone("")).toThrow(SnippeValidationError);
  });

  it("throws on non-Tanzania country codes", () => {
    expect(() => normalisePhone("+254712345678")).toThrow(SnippeValidationError);
  });

  it("throws on too-short numbers", () => {
    expect(() => normalisePhone("0712345")).toThrow(SnippeValidationError);
  });

  it("throws on too-long numbers", () => {
    expect(() => normalisePhone("071234567890")).toThrow(SnippeValidationError);
  });

  it("throws on landline prefix (e.g. 22 for Dar es Salaam)", () => {
    expect(() => normalisePhone("0223123456")).toThrow(SnippeValidationError);
  });

  it("throws on non-numeric content", () => {
    expect(() => normalisePhone("not-a-phone")).toThrow(SnippeValidationError);
  });

  it("includes the original input in the error message", () => {
    try {
      normalisePhone("0223123456");
    } catch (err) {
      expect((err as Error).message).toContain('"0223123456"');
      return;
    }
    throw new Error("expected normalisePhone to throw");
  });
});
