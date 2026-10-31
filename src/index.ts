export { Snippe } from "./client";
export { PaymentsResource } from "./resources/payments";
export { CheckoutResource } from "./resources/checkout";
export { PayoutsResource } from "./resources/payouts";

export { verifyWebhook, computeWebhookSignature } from "./webhooks";
export type { VerifyWebhookOptions } from "./webhooks";

export { generateIdempotencyKey } from "./http";
export { normalisePhone } from "./internal/normalisePhone";

export {
  SnippeError,
  SnippeAuthenticationError,
  SnippeValidationError,
  SnippeRateLimitError,
  SnippeWebhookVerificationError,
} from "./errors";
export type { SnippeErrorCode, SnippeErrorOptions } from "./errors";

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
} from "./types";

import { Snippe } from "./client";
export default Snippe;
