import { SnippeValidationError } from "../errors";

const CANONICAL = /^255[678]\d{8}$/;

/**
 * Normalise a Tanzania phone number to the canonical `255XXXXXXXXX` format
 * expected by the Snippe API. Accepts common local formats:
 *
 *   "255781000000"   → "255781000000"
 *   "+255781000000"  → "255781000000"
 *   "0781000000"     → "255781000000"
 *   "781000000"      → "255781000000"
 *
 * Whitespace, dashes, and parentheses are stripped before validation.
 * Throws `SnippeValidationError` for anything that can't be coerced into
 * a 12-digit TZ mobile number with carrier prefix 6, 7, or 8.
 */
export function normalisePhone(input: string): string {
  if (typeof input !== "string" || input.length === 0) {
    throw invalid(input, "must be a non-empty string");
  }

  const cleaned = input.replace(/[\s\-()]/g, "");

  let digits: string;
  if (cleaned.startsWith("+255")) {
    digits = cleaned.slice(1);
  } else if (cleaned.startsWith("255")) {
    digits = cleaned;
  } else if (cleaned.startsWith("0") && cleaned.length === 10) {
    digits = "255" + cleaned.slice(1);
  } else if (/^[678]\d{8}$/.test(cleaned)) {
    digits = "255" + cleaned;
  } else {
    throw invalid(
      input,
      "expected one of: 255XXXXXXXXX, +255XXXXXXXXX, 0XXXXXXXXX, XXXXXXXXX",
    );
  }

  if (!CANONICAL.test(digits)) {
    throw invalid(
      input,
      "must be a 12-digit Tanzania mobile number (255 + carrier prefix 6/7/8 + 8 digits)",
    );
  }

  return digits;
}

function invalid(input: unknown, detail: string): SnippeValidationError {
  const shown = typeof input === "string" ? ` "${input}"` : "";
  return new SnippeValidationError({
    status: 0,
    errorCode: "validation_error",
    message: `Invalid Tanzania phone number${shown}: ${detail}.`,
  });
}
