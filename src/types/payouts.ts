import type { Money } from "./index";

export type PayoutStatus = "pending" | "completed" | "failed" | "reversed";

export type PayoutChannel = "mobile" | "bank";

export type MobileProvider = "airtel" | "mpesa" | "mixx" | "halotel";

export type BankCode =
  | "ABSA"
  | "ACCESS"
  | "AKIBA"
  | "AMANA"
  | "AZANIA"
  | "BARODA"
  | "BOA"
  | "CITI"
  | "CRDB"
  | "DTB"
  | "ECOBANK"
  | "EQUITY"
  | "EXIM"
  | "FNB"
  | "HABIB"
  | "IMBANK"
  | "KCB"
  | "NBC"
  | "NCBA"
  | "NMB"
  | "PBZ"
  | "SCB"
  | "STANBIC"
  | "TCB"
  | "UBA"
  // Allow forward-compatible bank codes.
  | (string & {});

export interface CreateMobilePayoutInput {
  amount: number;
  phoneNumber: string;
  recipientName: string;
  /** Free-text statement description visible to the recipient. */
  narration?: string;
  webhookUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateBankPayoutInput {
  amount: number;
  bankCode: BankCode;
  accountNumber: string;
  accountName: string;
  /** Free-text statement description visible to the recipient. */
  narration?: string;
  webhookUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface PayoutFeeInput {
  amount: number;
}

export interface Payout {
  reference: string;
  status: PayoutStatus;
  amount: Money;
  fees: Money;
  total: Money;
  channel: {
    type: "mobile_money" | "bank";
    provider?: MobileProvider | string;
    bank?: string;
  };
  recipient: {
    name: string;
    phone?: string;
    account?: string;
    bank?: string;
  };
  externalReference?: string;
  failureReason?: string;
  metadata?: Record<string, unknown>;
}

export interface PayoutFee {
  amount: number;
  feeAmount: number;
  totalAmount: number;
  currency: "TZS";
}

export interface ListPayoutsParams {
  limit?: number;
  offset?: number;
  status?: PayoutStatus;
  channel?: PayoutChannel;
}
