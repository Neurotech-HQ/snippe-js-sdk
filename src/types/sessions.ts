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

/** A product shown on the checkout page. Presentational only — the session charges `amount`. */
export interface SessionLineItem {
  /** Your identifier, echoed back unchanged. */
  id?: string;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  /** Defaults to `quantity * unitPrice`. */
  total?: number;
  imageUrl?: string;
  sku?: string;
  category?: string;
}

/** A field the customer fills in at checkout. */
export interface SessionCustomField {
  key: string;
  label: string;
  type: string;
  required: boolean;
  placeholder?: string;
  options?: string[];
}

export interface SessionDisplaySettings {
  /** `compact` (default) or `cards`. The only display field the checkout honours today. */
  lineItemsStyle?: "compact" | "cards" | (string & {});
  showLineItems?: boolean;
  showDescription?: boolean;
  showMerchantLogo?: boolean;
  theme?: string;
  successMessage?: string;
  buttonText?: string;
}

/** Pre-filled billing address for card payments. */
export interface SessionBilling {
  firstName?: string;
  lastName?: string;
  address?: string;
  city?: string;
  state?: string;
  postcode?: string;
  country?: string;
  phone?: string;
}

interface BaseCreateSessionParams {
  currency?: "TZS";
  /** Show the price converted into this currency on the checkout page. */
  displayCurrency?: string;
  allowedMethods?: SessionPaymentMethod[];
  customer?: SessionCustomer;
  redirectUrl?: string;
  webhookUrl?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  /** Seconds until the session expires (default 3600, range 60–604800). */
  expiresIn?: number;
  /** Reference a payment profile created in the Snippe dashboard. */
  profileId?: string;
  lineItems?: SessionLineItem[];
  customFields?: SessionCustomField[];
  display?: SessionDisplaySettings;
  billing?: SessionBilling;
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
  id: string;
  reference: string;
  status: SessionStatus;
  mode: string;
  amount?: number;
  currency: "TZS";
  displayCurrency?: string;
  /** FX-converted amount; present only when `displayCurrency` applied. */
  displayAmount?: {
    amount: number;
    currency: string;
    rate?: number;
    margin?: number;
    exact: boolean;
  };
  checkoutUrl: string;
  shortCode: string;
  paymentLinkUrl: string;
  merchantName?: string;
  merchantLogo?: string;
  brandColor?: string;
  locale?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  allowedMethods: SessionPaymentMethod[];
  redirectUrl?: string;
  webhookUrl?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  allowCustomAmount?: boolean;
  minAmount?: number;
  maxAmount?: number;
  lineItems?: SessionLineItem[];
  customFields?: SessionCustomField[];
  display?: SessionDisplaySettings;
  billing?: SessionBilling;
  collectEmail: boolean;
  paymentIntentId?: string;
  completedAt?: string;
  expiresAt: string;
  createdAt: string;
}

export interface SessionList {
  sessions: Session[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface ListSessionsParams {
  limit?: number;
  offset?: number;
  status?: SessionStatus;
  /** e.g. `payment_page` — omit for all session types. */
  sourceType?: string;
  sourceId?: string;
}
