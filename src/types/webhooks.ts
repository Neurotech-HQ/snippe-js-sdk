import type { Money } from "./index";

export type WebhookEventType =
  | "payment.completed"
  | "payment.failed"
  | "payment.voided"
  | "payment.expired"
  | "payout.completed"
  | "payout.failed"
  | "payout.reversed";

export interface WebhookPaymentData {
  reference: string;
  external_reference?: string;
  status: string;
  amount: Money;
  settlement?: {
    gross: Money;
    fees: Money;
    net: Money;
  };
  channel?: { type: string; provider?: string };
  customer?: { phone?: string; name?: string; email?: string };
  metadata?: Record<string, unknown>;
  completed_at?: string;
  failed_at?: string;
  failure_reason?: string;
}

export interface WebhookPayoutData {
  reference: string;
  external_reference?: string;
  status: string;
  amount: Money;
  fees?: Money;
  total?: Money;
  channel?: { type: string; provider?: string };
  recipient?: { name?: string; phone?: string; account?: string };
  metadata?: Record<string, unknown>;
  completed_at?: string;
  failed_at?: string;
  failure_reason?: string;
}

export interface WebhookEvent<
  TType extends WebhookEventType = WebhookEventType,
  TData = unknown,
> {
  id: string;
  type: TType;
  api_version: string;
  created_at: string;
  data: TData;
}

export type PaymentWebhookEvent = WebhookEvent<
  "payment.completed" | "payment.failed" | "payment.voided" | "payment.expired",
  WebhookPaymentData
>;

export type PayoutWebhookEvent = WebhookEvent<
  "payout.completed" | "payout.failed" | "payout.reversed",
  WebhookPayoutData
>;

export type AnyWebhookEvent = PaymentWebhookEvent | PayoutWebhookEvent;
