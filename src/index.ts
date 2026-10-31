export { Snippe } from "./client.js";
export { PaymentsResource } from "./resources/payments/index.js";
export { CheckoutResource } from "./resources/checkout.js";
export { PayoutsResource } from "./resources/payouts/index.js";

export { verifyWebhook, computeWebhookSignature } from "./webhooks.js";
export type { VerifyWebhookOptions } from "./webhooks.js";

export { generateIdempotencyKey } from "./http.js";
export { normalisePhone } from "./internal/normalisePhone.js";

export {
  SnippeError,
  SnippeAuthenticationError,
  SnippeValidationError,
  SnippeRateLimitError,
  SnippeWebhookVerificationError,
} from "./errors.js";
export type { SnippeErrorCode, SnippeErrorOptions } from "./errors.js";

export type {
  Environment,
  SnippeConfig,
  ResolvedSnippeConfig,
  RequestOptions,
  SnippeEnvelope,
  SnippeErrorEnvelope,
  Money,
  Page,
  RateLimitInfo,
  // Payments
  PaymentType,
  PaymentStatus,
  PaymentCustomer,
  PaymentCustomerWithAddress,
  CreateMobilePaymentInput,
  CreateCardPaymentInput,
  Payment,
  Balance,
  ListPaymentsParams,
  SearchPaymentsParams,
  RetriggerPushInput,
  PushResult,
  // Sessions
  Session,
  SessionStatus,
  SessionPaymentMethod,
  SessionCustomer,
  SessionLineItem,
  SessionCustomField,
  SessionDisplaySettings,
  SessionBilling,
  SessionList,
  CreateSessionParams,
  CreateFixedAmountSessionParams,
  CreateCustomAmountSessionParams,
  ListSessionsParams,
  // Payouts
  Payout,
  PayoutStatus,
  PayoutChannel,
  MobileProvider,
  BankCode,
  CreateMobilePayoutInput,
  CreateBankPayoutInput,
  PayoutFee,
  PayoutFeeInput,
  MobilePayoutFeeInput,
  ListPayoutsParams,
  // Webhooks
  WebhookEvent,
  WebhookEventType,
  WebhookPaymentData,
  WebhookPayoutData,
  PaymentWebhookEvent,
  PayoutWebhookEvent,
  AnyWebhookEvent,
} from "./types/index.js";

import { Snippe } from "./client.js";
export default Snippe;
