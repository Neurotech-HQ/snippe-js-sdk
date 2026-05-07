import type { HttpClient } from "../../http";
import { normalisePhone } from "../../internal/normalisePhone";
import { validatePaymentAmount } from "../../internal/validateAmount";
import type {
  CreateMobilePaymentInput,
  Payment,
  RequestOptions,
  ResolvedSnippeConfig,
} from "../../types";
import { customerToWire } from "./customer";

/**
 * Mobile-money payments (USSD push to M-Pesa, Airtel Money, Mixx, Halotel).
 * The customer's phone receives a prompt; the payment settles when they
 * enter their PIN. Watch for `payment.completed` / `payment.failed` webhooks.
 */
export class MobilePayments {
  constructor(
    private readonly http: HttpClient,
    private readonly config: ResolvedSnippeConfig,
  ) {}

  async create(
    input: CreateMobilePaymentInput,
    options?: RequestOptions,
  ): Promise<Payment> {
    validatePaymentAmount(input.amount);
    const body = {
      paymentType: "mobile",
      details: { amount: input.amount, currency: "TZS" },
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
