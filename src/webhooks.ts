import { createHmac, timingSafeEqual } from "crypto";
import { SnippeWebhookVerificationError } from "./errors";
import type { AnyWebhookEvent } from "./types";

export interface VerifyWebhookOptions {
  /** Raw request body exactly as received — string or Buffer. Do NOT re-serialize JSON. */
  rawBody: string | Buffer;
  /** Value of the `X-Webhook-Signature` header. */
  signature: string | null | undefined;
  /** Value of the `X-Webhook-Timestamp` header. */
  timestamp: string | null | undefined;
  /** Signing key from Snippe Dashboard → Settings → Webhook Secret. */
  signingKey: string;
  /**
   * Maximum permitted age of a webhook in seconds. Defaults to 300 (5 minutes).
   * Events older than this are rejected to prevent replay attacks.
   */
  toleranceSeconds?: number;
}

/**
 * Verify a Snippe webhook signature and return the parsed event.
 *
 * Throws {@link SnippeWebhookVerificationError} when the signature, timestamp,
 * or body fail validation. Always call this *before* acting on the payload.
 *
 * @example
 * ```ts
 * // Express
 * app.post(
 *   "/webhooks/snippe",
 *   express.raw({ type: "application/json" }),
 *   (req, res) => {
 *     try {
 *       const event = verifyWebhook({
 *         rawBody: req.body, // Buffer
 *         signature: req.header("X-Webhook-Signature"),
 *         timestamp: req.header("X-Webhook-Timestamp"),
 *         signingKey: process.env.SNIPPE_WEBHOOK_SECRET!,
 *       });
 *       // ... dispatch on event.type, dedupe on event.id
 *       res.status(200).send("OK");
 *     } catch (err) {
 *       res.status(400).send("Invalid signature");
 *     }
 *   },
 * );
 * ```
 */
export function verifyWebhook(options: VerifyWebhookOptions): AnyWebhookEvent {
  const { signature, timestamp, signingKey, toleranceSeconds = 300 } = options;

  if (!signature || !timestamp) {
    throw new SnippeWebhookVerificationError(
      "Missing X-Webhook-Signature or X-Webhook-Timestamp header",
    );
  }
  if (!signingKey) {
    throw new SnippeWebhookVerificationError("Missing webhook signing key");
  }

  const eventTime = Number.parseInt(timestamp, 10);
  if (!Number.isFinite(eventTime)) {
    throw new SnippeWebhookVerificationError("Malformed webhook timestamp");
  }
  const currentTime = Math.floor(Date.now() / 1000);
  if (currentTime - eventTime > toleranceSeconds) {
    throw new SnippeWebhookVerificationError(
      `Webhook timestamp is older than ${toleranceSeconds}s (possible replay)`,
    );
  }

  const rawBodyString =
    typeof options.rawBody === "string"
      ? options.rawBody
      : options.rawBody.toString("utf8");

  const expected = createHmac("sha256", signingKey)
    .update(`${timestamp}.${rawBodyString}`)
    .digest("hex");

  const expectedBuf = Buffer.from(expected, "utf8");
  const providedBuf = Buffer.from(signature, "utf8");
  if (
    expectedBuf.length !== providedBuf.length ||
    !timingSafeEqual(expectedBuf, providedBuf)
  ) {
    throw new SnippeWebhookVerificationError("Invalid webhook signature");
  }

  try {
    return JSON.parse(rawBodyString) as AnyWebhookEvent;
  } catch (err) {
    throw new SnippeWebhookVerificationError(
      `Webhook body is not valid JSON: ${(err as Error).message}`,
    );
  }
}

/** Compute the expected HMAC-SHA256 signature for a given payload. Useful in tests. */
export function computeWebhookSignature(
  rawBody: string | Buffer,
  timestamp: string | number,
  signingKey: string,
): string {
  const body = typeof rawBody === "string" ? rawBody : rawBody.toString("utf8");
  return createHmac("sha256", signingKey)
    .update(`${timestamp}.${body}`)
    .digest("hex");
}
