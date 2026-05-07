import type { HttpClient } from "../../http";
import type {
  ListPayoutsParams,
  Payout,
  RequestOptions,
  ResolvedSnippeConfig,
} from "../../types";
import { BankPayouts } from "./bank";
import { MobilePayouts } from "./mobile";

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

  /** List payouts (paginated). Optionally filter by `status` or `channel`. */
  async list(
    params: ListPayoutsParams = {},
    options?: RequestOptions,
  ): Promise<Payout[]> {
    return this.http.request<Payout[]>({
      method: "GET",
      path: "/v1/payouts",
      query: params as Record<string, unknown>,
      options,
    });
  }
}

export { BankPayouts } from "./bank";
export { MobilePayouts } from "./mobile";
