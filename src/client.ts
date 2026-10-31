import { HttpClient } from "./http.js";
import { CheckoutResource } from "./resources/checkout.js";
import { PaymentsResource } from "./resources/payments/index.js";
import { PayoutsResource } from "./resources/payouts/index.js";
import type {
  Environment,
  ResolvedSnippeConfig,
  SnippeConfig,
} from "./types/index.js";

const DEFAULT_BASE_URL = "https://api.snippe.sh";

const DEFAULT_TIMEOUT_MS = 30_000;

let sessionsAliasWarned = false;

/**
 * Snippe SDK client.
 *
 * @example
 * ```ts
 * const snippe = new Snippe({ apiKey: process.env.SNIPPE_API_KEY! });
 *
 * const payment = await snippe.payments.mobile.create({
 *   amount: 500,
 *   phoneNumber: "0781000000",
 *   customer: { firstName: "Jane", lastName: "Doe", email: "jane@example.com" },
 *   webhookUrl: "https://example.com/webhooks/snippe",
 * });
 * ```
 */
export class Snippe {
  readonly payments: PaymentsResource;
  readonly checkout: CheckoutResource;
  readonly payouts: PayoutsResource;

  private readonly config: ResolvedSnippeConfig;
  private readonly http: HttpClient;

  constructor(config: SnippeConfig) {
    if (!config?.apiKey) {
      throw new Error("Snippe SDK: `apiKey` is required.");
    }

    const environment: Environment = config.environment ?? "production";
    // Snippe has no sandbox: every key is live. Refuse to move real money under a test label.
    if (environment === "sandbox" && !config.baseUrl) {
      throw new Error(
        'Snippe SDK: Snippe has no sandbox and every API key is live, so `environment: "sandbox"` would move real money. Remove it, or set `baseUrl` to your own test server.',
      );
    }
    const fetchImpl = config.fetch ?? resolveGlobalFetch();

    this.config = {
      apiKey: config.apiKey,
      environment,
      baseUrl: config.baseUrl ?? DEFAULT_BASE_URL,
      timeoutMs: config.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      webhookUrl: config.webhookUrl,
      fetch: fetchImpl,
    };

    this.http = new HttpClient(this.config);
    this.payments = new PaymentsResource(this.http, this.config);
    this.checkout = new CheckoutResource(this.http, this.config);
    this.payouts = new PayoutsResource(this.http, this.config);
  }

  /**
   * @deprecated Use `snippe.checkout` instead. The `sessions` alias will be
   * removed in v2.0. A console warning is logged once per process on first use.
   */
  get sessions(): CheckoutResource {
    if (!sessionsAliasWarned) {
      sessionsAliasWarned = true;
      console.warn(
        "[@snippe/sdk] `snippe.sessions` is deprecated; use `snippe.checkout` instead. " +
          "This alias will be removed in v2.0.",
      );
    }
    return this.checkout;
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
