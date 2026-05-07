/**
 * 05 — Custom-amount session (donation / tip jar)
 *
 * When the customer picks the amount (donations, tips, pay-what-you-want),
 * use `allowCustomAmount: true` with `minAmount` and `maxAmount`
 * instead of a fixed `amount`.
 */
import { Snippe } from "../src";

const snippe = new Snippe({
  apiKey: requireEnv("SNIPPE_API_KEY"),
  webhookUrl: "https://example.com/webhooks/snippe",
});

async function main() {
  const session = await snippe.checkout.create({
    allowCustomAmount: true,
    minAmount: 1_000, // 1,000 TZS
    maxAmount: 500_000, // 500,000 TZS
    allowedMethods: ["mobile_money", "card"],
    description: "Donate to School Supplies Fund",
    metadata: { campaign: "school-2026" },
  });

  console.log("Public donation page:");
  console.log(" ", session.paymentLinkUrl);
  console.log(`Accepts amounts between ${session.minAmount} and ${session.maxAmount} TZS.`);
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
