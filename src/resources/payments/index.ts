import type { HttpClient } from "../../http";
import type {
  Balance,
  ListPaymentsParams,
  Payment,
  RequestOptions,
  ResolvedSnippeConfig,
  SearchPaymentsParams,
} from "../../types";
import { CardPayments } from "./card";
import { MobilePayments } from "./mobile";

/**
 * Composer over the per-channel sub-resources. Use `.mobile` or `.card` to
 * create a payment for that channel; the cross-channel reads (`get`, `list`,
 * `search`, `balance`, `retriggerPush`) live here directly.
 */
export class PaymentsResource {
  readonly mobile: MobilePayments;
  readonly card: CardPayments;

  constructor(
    private readonly http: HttpClient,
    config: ResolvedSnippeConfig,
  ) {
    this.mobile = new MobilePayments(http, config);
    this.card = new CardPayments(http, config);
  }

  /** Fetch a single payment by reference. */
  async get(reference: string, options?: RequestOptions): Promise<Payment> {
    return this.http.request<Payment>({
      method: "GET",
      path: `/v1/payments/${encodeURIComponent(reference)}`,
      options,
    });
  }

  /** List payments (paginated). */
  async list(
    params: ListPaymentsParams = {},
    options?: RequestOptions,
  ): Promise<Payment[]> {
    return this.http.request<Payment[]>({
      method: "GET",
      path: "/v1/payments",
      query: params as Record<string, unknown>,
      options,
    });
  }

  /** Search payments by reference, phone, status, etc. */
  async search(
    params: SearchPaymentsParams,
    options?: RequestOptions,
  ): Promise<Payment[]> {
    return this.http.request<Payment[]>({
      method: "GET",
      path: "/v1/payments/search",
      query: params as Record<string, unknown>,
      options,
    });
  }

  /** Re-trigger the USSD push for a pending mobile payment. */
  async retriggerPush(
    reference: string,
    options?: RequestOptions,
  ): Promise<Payment> {
    return this.http.request<Payment>({
      method: "POST",
      path: `/v1/payments/${encodeURIComponent(reference)}/push`,
      options,
    });
  }

  /** Get the current account balance. */
  async balance(options?: RequestOptions): Promise<Balance> {
    return this.http.request<Balance>({
      method: "GET",
      path: "/v1/payments/balance",
      options,
    });
  }
}

export { CardPayments } from "./card";
export { MobilePayments } from "./mobile";
