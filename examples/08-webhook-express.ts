/**
 * 08 — Webhook handler (Express)
 *
 * Install peer deps:   npm install express
 *
 * Critical rules (the SDK helper enforces all of these):
 *   1. Use `express.raw` — do NOT parse JSON before computing the HMAC,
 *      re-serialising changes whitespace/key-order and breaks the signature.
 *   2. Verify the signature with a constant-time compare.
 *   3. Reject timestamps older than 5 minutes (replay protection).
 *   4. Deduplicate by `event.id` (Snippe may deliver duplicates).
 *   5. Respond 2xx within 30s; do heavy work async.
 *
 * The `data.amount` field in webhook payloads is an object
 * `{ value, currency }`, NOT a plain integer like in request bodies.
 */
import express from "express";
import { SnippeWebhookVerificationError, verifyWebhook } from "../src";

const app = express();

// In-memory dedupe for demo purposes. In production, persist to Redis
// or a DB with a TTL of a few hours.
const seenEventIds = new Set<string>();

app.post(
  "/webhooks/snippe",
  express.raw({ type: "application/json" }),
  (req, res) => {
    let event;
    try {
      event = verifyWebhook({
        rawBody: req.body as Buffer, // Buffer, untouched
        signature: req.header("X-Webhook-Signature"),
        timestamp: req.header("X-Webhook-Timestamp"),
        signingKey: process.env.SNIPPE_WEBHOOK_SECRET ?? "",
      });
    } catch (err) {
      if (err instanceof SnippeWebhookVerificationError) {
        console.warn("Webhook verification failed:", err.message);
        return res.status(400).send("Invalid signature");
      }
      return res.status(500).send("Internal error");
    }

    // Dedupe before doing any work.
    if (seenEventIds.has(event.id)) {
      return res.status(200).send("OK"); // already processed
    }
    seenEventIds.add(event.id);

    // Dispatch on `event.type` — NOT on the X-Webhook-Event header,
    // which is unsigned and only a hint.
    switch (event.type) {
      case "payment.completed": {
        const { reference, amount, metadata } = event.data;
        console.log(
          `✓ Payment ${reference} completed: ${amount.value} ${amount.currency}`,
          metadata,
        );
        // enqueue(processCompletedPayment, event.data);
        break;
      }
      case "payment.failed":
      case "payment.expired":
      case "payment.voided":
        console.log(`✗ Payment ${event.data.reference} ${event.type}`);
        break;
      case "payout.completed":
        console.log(`✓ Payout ${event.data.reference} delivered`);
        break;
      case "payout.failed":
      case "payout.reversed":
        console.log(`✗ Payout ${event.data.reference} ${event.type}`);
        break;
    }

    // Respond quickly. Real processing happens on the queue above.
    res.status(200).send("OK");
  },
);

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`Webhook handler listening on http://localhost:${port}/webhooks/snippe`);
});
