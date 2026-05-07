/** Wire-format payment-method values accepted by the Sessions API. */
export type SessionPaymentMethod = "mobile_money" | "card";

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
  allowedMethods?: SessionPaymentMethod[];
  customer?: SessionCustomer;
  redirectUrl?: string;
  webhookUrl?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  /** Seconds until the session expires (default 3600). */
  expiresIn?: number;
  /** Reference a payment profile created in the Snippe dashboard. */
  profileId?: string;
}

export interface CreateFixedAmountSessionParams extends BaseCreateSessionParams {
  amount: number;
  allowCustomAmount?: false;
}

export interface CreateCustomAmountSessionParams extends BaseCreateSessionParams {
  allowCustomAmount: true;
  minAmount: number;
  maxAmount: number;
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
  checkoutUrl: string;
  shortCode: string;
  paymentLinkUrl: string;
  expiresAt: string;
  allowCustomAmount?: boolean;
  minAmount?: number;
  maxAmount?: number;
  metadata?: Record<string, unknown>;
}

export interface ListSessionsParams {
  limit?: number;
  offset?: number;
  status?: SessionStatus;
}
