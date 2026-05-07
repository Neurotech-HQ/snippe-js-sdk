import type { HttpClient } from "../../http";
import { validatePayoutAmount } from "../../internal/validateAmount";
import type {
  CreateBankPayoutInput,
  Payout,
  PayoutFee,
  PayoutFeeInput,
  RequestOptions,
  ResolvedSnippeConfig,
} from "../../types";

/**
 * Bank-transfer disbursements (CRDB, NMB, NBC, ABSA, etc.). Settles within
 * 1–2 business days; status arrives via `payout.completed` / `payout.failed`
 * webhooks.
 */
export class BankPayouts {
  constructor(
    private readonly http: HttpClient,
    private readonly config: ResolvedSnippeConfig,
  ) {}

  async send(
    input: CreateBankPayoutInput,
    options?: RequestOptions,
  ): Promise<Payout> {
    validatePayoutAmount(input.amount);
    const body = {
      channel: "bank",
      amount: input.amount,
      // Map SDK-friendly names onto the API's `recipient_*` fields.
      recipientBank: input.bankCode,
      recipientAccount: input.accountNumber,
      recipientName: input.accountName,
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
