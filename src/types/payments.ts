import type { Money } from "./index";

export type PaymentType = "mobile" | "card";

export type PaymentStatus =
  | "pending"
  | "completed"
  | "failed"
  | "voided"
  | "expired";

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
}

export interface CreateCardPaymentInput {
  amount: number;
  phoneNumber: string;
  redirectUrl: string;
  cancelUrl: string;
  customer: PaymentCustomerWithAddress;
  webhookUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface Payment {
  reference: string;
  status: PaymentStatus;
  paymentType: PaymentType;
  amount: Money;
  expiresAt: string;
  apiVersion?: string;
  object?: "payment";
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
  paymentType?: PaymentType;
}

export interface SearchPaymentsParams {
  q?: string;
  reference?: string;
  externalReference?: string;
  phoneNumber?: string;
  status?: PaymentStatus;
  limit?: number;
}
