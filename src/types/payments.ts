import type { Money } from "./index";

export type PaymentType = "mobile" | "card" | "dynamic-qr";

export type PaymentStatus =
  | "pending"
  | "completed"
  | "failed"
  | "voided"
  | "expired";

export interface PaymentCustomer {
  firstname: string;
  lastname: string;
  email: string;
  address?: string;
  city?: string;
  state?: string;
  postcode?: string;
  /** ISO 3166-1 alpha-2 country code, e.g. "TZ". */
  country?: string;
}

export interface CreateMobilePaymentParams {
  payment_type: "mobile";
  details: { amount: number; currency?: "TZS" };
  phone_number: string;
  customer: PaymentCustomer;
  webhook_url?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateCardPaymentParams {
  payment_type: "card";
  details: {
    amount: number;
    currency?: "TZS";
    redirect_url: string;
    cancel_url: string;
  };
  phone_number: string;
  customer: PaymentCustomer &
    Required<Pick<PaymentCustomer, "address" | "city" | "state" | "postcode" | "country">>;
  webhook_url?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateQrPaymentParams {
  payment_type: "dynamic-qr";
  details: {
    amount: number;
    currency?: "TZS";
    redirect_url?: string;
    cancel_url?: string;
  };
  phone_number?: string;
  customer?: PaymentCustomer;
  webhook_url?: string;
  metadata?: Record<string, unknown>;
}

export type CreatePaymentParams =
  | CreateMobilePaymentParams
  | CreateCardPaymentParams
  | CreateQrPaymentParams;

export interface Payment {
  reference: string;
  status: PaymentStatus;
  payment_type: PaymentType;
  amount: Money;
  expires_at: string;
  api_version?: string;
  object?: "payment";
  /** Card / QR only — hosted checkout URL. */
  payment_url?: string;
  /** Card / QR only — short numeric token. */
  payment_token?: string;
  /** Dynamic QR only — raw EMV QR payload to render as an image. */
  payment_qr_code?: string;
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
  payment_type?: PaymentType;
}

export interface SearchPaymentsParams {
  q?: string;
  reference?: string;
  external_reference?: string;
  phone_number?: string;
  status?: PaymentStatus;
  limit?: number;
}
