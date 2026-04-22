/**
 * 05 — Custom-amount session (donation / tip jar)
 *
 * When the customer picks the amount (donations, tips, pay-what-you-want),
 * use `allow_custom_amount: true` with `min_amount` and `max_amount`
 * instead of a fixed `amount`.
 */
import { Snippe } from "../src";

const snippe = new Snippe({
  apiKey: requireEnv("SNIPPE_API_KEY"),
  webhookUrl: "https://example.com/webhooks/snippe",
});

async function main() {
  const session = await snippe.sessions.create({
    allow_custom_amount: true,
    min_amount: 1_000, // 1,000 TZS
    max_amount: 500_000, // 500,000 TZS
    allowed_methods: ["mobile_money", "qr"],
    description: "Donate to School Supplies Fund",
    metadata: { campaign: "school-2026" },
  });

  console.log("Public donation page:");
  console.log(" ", session.payment_link_url);
  console.log(`Accepts amounts between ${session.min_amount} and ${session.max_amount} TZS.`);
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
