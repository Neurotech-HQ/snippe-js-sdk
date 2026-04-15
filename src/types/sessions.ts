export type SessionPaymentMethod = "mobile_money" | "qr" | "card";

export type SessionStatus =
  | "pending"
  | "active"
  | "completed"
  | "expired"
  | "cancelled";

export interface SessionCustomer {
  name?: string;
  phone?: string;
  email?: string;
}

interface BaseCreateSessionParams {
  currency?: "TZS";
  allowed_methods?: SessionPaymentMethod[];
  customer?: SessionCustomer;
  redirect_url?: string;
  webhook_url?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  /** Seconds until the session expires (default 3600). */
  expires_in?: number;
  /** Reference a payment profile created in the Snippe dashboard. */
  profile_id?: string;
}

export interface CreateFixedAmountSessionParams extends BaseCreateSessionParams {
  amount: number;
  allow_custom_amount?: false;
}

export interface CreateCustomAmountSessionParams extends BaseCreateSessionParams {
  allow_custom_amount: true;
  min_amount: number;
  max_amount: number;
  amount?: never;
}

export type CreateSessionParams =
  | CreateFixedAmountSessionParams
  | CreateCustomAmountSessionParams;

export interface Session {
  reference: string;
  status: SessionStatus;
  amount?: number;
  currency: "TZS";
  checkout_url: string;
  short_code: string;
  payment_link_url: string;
  expires_at: string;
  allow_custom_amount?: boolean;
  min_amount?: number;
  max_amount?: number;
  metadata?: Record<string, unknown>;
}

export interface ListSessionsParams {
  limit?: number;
  offset?: number;
  status?: SessionStatus;
}
