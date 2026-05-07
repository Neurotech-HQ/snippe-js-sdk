import type { HttpClient } from "../../http";
import { normalisePhone } from "../../internal/normalisePhone";
import { validatePayoutAmount } from "../../internal/validateAmount";
import type {
  CreateMobilePayoutInput,
  Payout,
  PayoutFee,
  PayoutFeeInput,
  RequestOptions,
  ResolvedSnippeConfig,
} from "../../types";

/**
 * Mobile-money disbursements (M-Pesa, Airtel Money, Mixx, Halotel).
 * The recipient receives the funds in their wallet; settlement is async via
 * `payout.completed` / `payout.failed` webhooks.
 */
export class MobilePayouts {
  constructor(
    private readonly http: HttpClient,
    private readonly config: ResolvedSnippeConfig,
  ) {}

  async send(
    input: CreateMobilePayoutInput,
    options?: RequestOptions,
  ): Promise<Payout> {
    validatePayoutAmount(input.amount);
    const body = {
      channel: "mobile",
      amount: input.amount,
      // Field renamed to match the API's `recipient_phone` / `recipient_name`.
      recipientPhone: normalisePhone(input.phoneNumber),
      recipientName: input.recipientName,
      narration: input.narration,
      webhookUrl: input.webhookUrl ?? this.config.webhookUrl,
      metadata: input.metadata,
    };
    return this.http.request<Payout>({
      method: "POST",
      path: "/v1/payouts/send",
      body,
      options,
    });
  }

  async fee(
    input: PayoutFeeInput,
    options?: RequestOptions,
  ): Promise<PayoutFee> {
    return this.http.request<PayoutFee>({
      method: "GET",
      path: "/v1/payouts/fee",
      query: { amount: input.amount },
      options,
    });
  }
}
