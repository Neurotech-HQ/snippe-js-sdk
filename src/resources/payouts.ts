import type { HttpClient } from "../http";
import type {
  CreatePayoutParams,
  ListPayoutsParams,
  Payout,
  PayoutFee,
  RequestOptions,
  ResolvedSnippeConfig,
} from "../types";

export class PayoutsResource {
  constructor(
    private readonly http: HttpClient,
    private readonly config: ResolvedSnippeConfig,
  ) {}

  /**
   * Send a payout to a mobile wallet or bank account.
   *
   * Recommended preflight: `const { total_amount } = await snippe.payouts.fee(amount);`
   * then verify against `snippe.payments.balance()` before calling `send`.
   */
  async send(
    params: CreatePayoutParams,
    options?: RequestOptions,
  ): Promise<Payout> {
    const body = {
      ...params,
      webhook_url: params.webhook_url ?? this.config.webhookUrl,
    };
    return this.http.request<Payout>({
      method: "POST",
      path: "/v1/payouts/send",
      body,
      options,
    });
  }

  async get(reference: string, options?: RequestOptions): Promise<Payout> {
    return this.http.request<Payout>({
      method: "GET",
      path: `/v1/payouts/${encodeURIComponent(reference)}`,
      options,
    });
  }

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

  /** Calculate the fee and total that will be debited for a given payout amount. */
  async fee(amount: number, options?: RequestOptions): Promise<PayoutFee> {
    return this.http.request<PayoutFee>({
      method: "GET",
      path: "/v1/payouts/fee",
      query: { amount },
      options,
    });
  }
}
