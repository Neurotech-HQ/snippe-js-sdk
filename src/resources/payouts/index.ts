import type { HttpClient } from "../../http.js";
import type {
  ListPayoutsParams,
  Page,
  Payout,
  RequestOptions,
  ResolvedSnippeConfig,
} from "../../types/index.js";
import { BankPayouts } from "./bank.js";
import { MobilePayouts } from "./mobile.js";

/**
 * Composer over the per-channel sub-resources. Use `.mobile` or `.bank` to
 * send a payout for that channel; the cross-channel reads (`get`, `list`)
 * live here directly.
 */
export class PayoutsResource {
  readonly mobile: MobilePayouts;
  readonly bank: BankPayouts;

  constructor(
    private readonly http: HttpClient,
    config: ResolvedSnippeConfig,
  ) {
    this.mobile = new MobilePayouts(http, config);
    this.bank = new BankPayouts(http, config);
  }

  /** Fetch a single payout by reference. */
  async get(reference: string, options?: RequestOptions): Promise<Payout> {
    return this.http.request<Payout>({
      method: "GET",
      path: `/v1/payouts/${encodeURIComponent(reference)}`,
      options,
    });
  }

  /** List payouts (offset-paginated, max 100 per page). */
  async list(
    params: ListPayoutsParams = {},
    options?: RequestOptions,
  ): Promise<Page<Payout>> {
    // List is only mounted under /api/v1; it accepts the same API keys.
    return this.http.request<Page<Payout>>({
      method: "GET",
      path: "/api/v1/payouts",
      query: params as Record<string, unknown>,
      options,
    });
  }
}

export { BankPayouts } from "./bank.js";
export { MobilePayouts } from "./mobile.js";
