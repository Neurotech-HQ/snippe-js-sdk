/**
 * 04 — Hosted checkout session
 *
 * A session gives you a Snippe-hosted checkout page that handles method
 * selection (mobile money / card / QR), UI, and status polling. You get
 * back two URLs:
 *
 *   - `checkout_url`     — for embedding in an app or WebView
 *   - `payment_link_url` — short vanity URL, best for SMS/WhatsApp/email
 */
import { Snippe } from "../src";

const snippe = new Snippe({
  apiKey: requireEnv("SNIPPE_API_KEY"),
  webhookUrl: "https://example.com/webhooks/snippe",
});

async function main() {
  const session = await snippe.sessions.create({
    amount: 50_000, // 50,000 TZS
    allowed_methods: ["mobile_money", "qr"],
    customer: {
      name: "Jane Doe",
      phone: "+255781000000",
      email: "jane@example.com",
    },
    redirect_url: "https://example.com/checkout/thanks",
    description: "Order #12345",
    expires_in: 3600, // 1 hour
    metadata: { order_id: "ORD-12345" },
  });

  console.log("Share this link with the customer:");
  console.log(" ", session.payment_link_url);
  console.log("Or redirect them to:");
  console.log(" ", session.checkout_url);
  console.log("Session reference:", session.reference);
  console.log("Expires at       :", session.expires_at);
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required env var: ${name}`);
    process.exit(1);
  }
  return value;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
