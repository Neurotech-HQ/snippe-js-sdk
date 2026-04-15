import { HttpClient } from "./http";
import { PaymentsResource } from "./resources/payments";
import { PayoutsResource } from "./resources/payouts";
import { SessionsResource } from "./resources/sessions";
import type {
  Environment,
  ResolvedSnippeConfig,
  SnippeConfig,
} from "./types";

const DEFAULT_BASE_URLS: Record<Environment, string> = {
  sandbox: "https://api.snippe.sh",
  production: "https://api.snippe.sh",
};

const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * Snippe SDK client.
 *
 * @example
 * ```ts
 * const snippe = new Snippe({ apiKey: process.env.SNIPPE_API_KEY! });
 *
 * const payment = await snippe.payments.create({
 *   payment_type: "mobile",
 *   details: { amount: 500 },
 *   phone_number: "255781000000",
 *   customer: { firstname: "Jane", lastname: "Doe", email: "jane@example.com" },
 *   webhook_url: "https://example.com/webhooks/snippe",
 * });
 * ```
 */
export class Snippe {
  readonly payments: PaymentsResource;
  readonly sessions: SessionsResource;
  readonly payouts: PayoutsResource;

  private readonly config: ResolvedSnippeConfig;
  private readonly http: HttpClient;

  constructor(config: SnippeConfig) {
    if (!config?.apiKey) {
      throw new Error("Snippe SDK: `apiKey` is required.");
    }

    const environment: Environment = config.environment ?? "production";
    const fetchImpl = config.fetch ?? resolveGlobalFetch();

    this.config = {
      apiKey: config.apiKey,
      environment,
      baseUrl: config.baseUrl ?? DEFAULT_BASE_URLS[environment],
      timeoutMs: config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      webhookUrl: config.webhookUrl,
      fetch: fetchImpl,
    };

    this.http = new HttpClient(this.config);
    this.payments = new PaymentsResource(this.http, this.config);
    this.sessions = new SessionsResource(this.http, this.config);
    this.payouts = new PayoutsResource(this.http, this.config);
  }

  getConfig(): Readonly<ResolvedSnippeConfig> {
    return this.config;
  }
}

function resolveGlobalFetch(): typeof fetch {
  if (typeof globalThis.fetch !== "function") {
    throw new Error(
      "Snippe SDK: global `fetch` is not available. Upgrade to Node.js 18+ or pass a `fetch` implementation via `new Snippe({ fetch })`.",
    );
  }
  return globalThis.fetch.bind(globalThis);
}
