import type { HttpClient } from "../../http";
import { normalisePhone } from "../../internal/normalisePhone";
import { validatePaymentAmount } from "../../internal/validateAmount";
import type {
  CreateCardPaymentInput,
  Payment,
  RequestOptions,
  ResolvedSnippeConfig,
} from "../../types";
import { customerToWire } from "./customer";

/**
 * Card payments (Visa / Mastercard via Selcom). Returns a `paymentUrl` the
 * user should be redirected to in order to enter their card details.
 */
export class CardPayments {
  constructor(
    private readonly http: HttpClient,
    private readonly config: ResolvedSnippeConfig,
  ) {}

  async create(
    input: CreateCardPaymentInput,
    options?: RequestOptions,
  ): Promise<Payment> {
    validatePaymentAmount(input.amount);
    const body = {
      paymentType: "card",
      details: {
        amount: input.amount,
        currency: "TZS",
        redirectUrl: input.redirectUrl,
        cancelUrl: input.cancelUrl,
      },
      phoneNumber: normalisePhone(input.phoneNumber),
      customer: customerToWire(input.customer),
      webhookUrl: input.webhookUrl ?? this.config.webhookUrl,
      metadata: input.metadata,
    };
    return this.http.request<Payment>({
      method: "POST",
      path: "/v1/payments",
      body,
      options,
    });
  }
}
