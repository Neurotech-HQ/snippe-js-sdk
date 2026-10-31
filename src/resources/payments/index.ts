import type { HttpClient } from "../../http.js";
import { normalisePhone } from "../../internal/normalisePhone.js";
import type {
  Balance,
  ListPaymentsParams,
  Page,
  Payment,
  PushResult,
  RequestOptions,
  ResolvedSnippeConfig,
  RetriggerPushInput,
  SearchPaymentsParams,
} from "../../types/index.js";
import { CardPayments } from "./card.js";
import { MobilePayments } from "./mobile.js";

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

  /** List payments (offset-paginated, max 100 per page). */
  async list(
    params: ListPaymentsParams = {},
    options?: RequestOptions,
  ): Promise<Page<Payment>> {
    return this.http.request<Page<Payment>>({
      method: "GET",
      path: "/v1/payments",
      query: params as Record<string, unknown>,
      options,
    });
  }

  /** Search payments by (partial) reference and/or payer phone. */
  async search(
    params: SearchPaymentsParams,
    options?: RequestOptions,
  ): Promise<Page<Payment>> {
    // Search is only mounted under /api/v1; it accepts the same API keys.
    return this.http.request<Page<Payment>>({
      method: "GET",
      path: "/api/v1/payments/search",
      query: params as Record<string, unknown>,
      options,
    });
  }

  /** Re-trigger the USSD push for a pending mobile payment. */
  async retriggerPush(
    reference: string,
    input: RetriggerPushInput = {},
    options?: RequestOptions,
  ): Promise<PushResult> {
    return this.http.request<PushResult>({
      method: "POST",
      path: `/v1/payments/${encodeURIComponent(reference)}/push`,
      body: input.phoneNumber
        ? { phone: normalisePhone(input.phoneNumber) }
        : undefined,
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

export { CardPayments } from "./card.js";
export { MobilePayments } from "./mobile.js";
