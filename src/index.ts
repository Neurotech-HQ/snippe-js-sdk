export { Snippe } from "./client";
export { PaymentsResource } from "./resources/payments";
export { SessionsResource } from "./resources/sessions";
export { PayoutsResource } from "./resources/payouts";

export { verifyWebhook, computeWebhookSignature } from "./webhooks";
export type { VerifyWebhookOptions } from "./webhooks";

export { generateIdempotencyKey } from "./http";

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
  RateLimitInfo,
  // Payments
  PaymentType,
  PaymentStatus,
  PaymentCustomer,
  CreatePaymentParams,
  CreateMobilePaymentParams,
  CreateCardPaymentParams,
  CreateQrPaymentParams,
  Payment,
  Balance,
  ListPaymentsParams,
  SearchPaymentsParams,
  // Sessions
  Session,
  SessionStatus,
  SessionPaymentMethod,
  SessionCustomer,
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
  CreatePayoutParams,
  CreateMobilePayoutParams,
  CreateBankPayoutParams,
  PayoutFee,
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
