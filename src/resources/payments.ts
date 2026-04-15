import type { HttpClient } from "../http";
import type {
  Balance,
  CreatePaymentParams,
  ListPaymentsParams,
  Payment,
  RequestOptions,
  ResolvedSnippeConfig,
  SearchPaymentsParams,
} from "../types";

export class PaymentsResource {
  constructor(
    private readonly http: HttpClient,
    private readonly config: ResolvedSnippeConfig,
  ) {}

  /**
   * Create a payment intent. The response is always `pending`; the terminal
   * state arrives via webhook or by polling `get(reference)`.
   *
   * Auto-applies `details.currency = "TZS"` and the SDK-level `webhookUrl`
   * default if neither is set on the call.
   */
  async create(
    params: CreatePaymentParams,
    options?: RequestOptions,
  ): Promise<Payment> {
    const body = this.normalise(params);
    return this.http.request<Payment>({
      method: "POST",
      path: "/v1/payments",
      body,
      options,
    });
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

  private normalise(params: CreatePaymentParams): CreatePaymentParams {
    const details = {
      currency: "TZS" as const,
      ...params.details,
    };
    const webhook_url = params.webhook_url ?? this.config.webhookUrl;
    return { ...params, details, webhook_url } as CreatePaymentParams;
  }
}
