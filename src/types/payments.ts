import type { Money } from "./index";

export type PaymentType = "mobile" | "card";

export type PaymentStatus =
  | "pending"
  | "completed"
  | "failed"
  /** Cancelled by the customer or system, or expired before completion. */
  | "cancelled"
  /** A previously completed payment was reversed by the provider. */
  | "reversed";

/**
 * Customer details attached to a payment. Mobile payments only require
 * `firstName`, `lastName`, and `email`; card payments additionally require
 * the full billing address (see `PaymentCustomerWithAddress`).
 */
export interface PaymentCustomer {
  firstName: string;
  lastName: string;
  email: string;
  address?: string;
  city?: string;
  state?: string;
  postcode?: string;
  /** ISO 3166-1 alpha-2 country code, e.g. "TZ". */
  country?: string;
}

/** Card payments require the full billing address. */
export type PaymentCustomerWithAddress = PaymentCustomer &
  Required<
    Pick<PaymentCustomer, "address" | "city" | "state" | "postcode" | "country">
  >;

export interface CreateMobilePaymentInput {
  amount: number;
  phoneNumber: string;
  customer: PaymentCustomer;
  webhookUrl?: string;
  metadata?: Record<string, unknown>;
  /**
   * Subaccount (wallet) id or reference to settle into. Omit to use your
   * default wallet, or your main account if you have none.
   */
  subaccount?: string;
}

export interface CreateCardPaymentInput {
  amount: number;
  phoneNumber: string;
  redirectUrl: string;
  cancelUrl?: string;
  customer: PaymentCustomerWithAddress;
  webhookUrl?: string;
  metadata?: Record<string, unknown>;
  /** Subaccount (wallet) id or reference to settle into. */
  subaccount?: string;
}

export interface Payment {
  object: "payment";
  apiVersion: string;
  reference: string;
  status: PaymentStatus;
  paymentType: PaymentType;
  amount: Money;
  /** Present on create and get; omitted from list/search results. */
  expiresAt?: string;
  /** Present on list/search results only. */
  id?: string;
  /** Omitted from the create response. */
  createdAt?: string;
  /** Gross is what the payer was charged; fees and net are what you were credited. */
  settlement?: { gross: Money; fees: Money; net: Money };
  channel?: { type: string; provider: string };
  customer?: { phone: string; firstName: string; lastName: string; email: string };
  externalReference?: string;
  failureReason?: string;
  completedAt?: string;
  /** Omitted when the payment was created through the API. */
  source?: string;
  /** Card only — hosted checkout URL the customer must be redirected to. */
  paymentUrl?: string;
  /** Card only — short numeric token. */
  paymentToken?: string;
  metadata?: Record<string, unknown>;
}

export interface Balance {
  available: Money;
  balance: Money;
  object: "balance";
}

export interface ListPaymentsParams {
  limit?: number;
  offset?: number;
  status?: PaymentStatus;
  /** Free-text search across reference and customer fields. */
  search?: string;
  /** `YYYY-MM-DD`, inclusive. */
  fromDate?: string;
  /** `YYYY-MM-DD`, inclusive. */
  toDate?: string;
}

/** At least one of `reference` or `phone` is required. Both match partially. */
export type SearchPaymentsParams = (
  | { reference: string; phone?: string }
  | { reference?: string; phone: string }
) & {
  status?: PaymentStatus;
  limit?: number;
  offset?: number;
};

export interface RetriggerPushInput {
  /** Push to a different number than the one the payment was created with. */
  phoneNumber?: string;
}

export interface PushResult {
  reference: string;
  externalReference: string;
  status: PaymentStatus;
  phone: string;
}
