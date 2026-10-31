import type { Money } from "./index";

export type PayoutStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed"
  | "reversed"
  | "insufficient_balance";

export type PayoutChannel = "mobile" | "bank";

export type MobileProvider = "airtel" | "mpesa" | "mixx" | "halotel";

export type BankCode =
  | "ABSA"
  | "ACCESS"
  | "AKIBA"
  | "AMANA"
  | "AZANIA"
  | "BANCABC"
  | "BARODA"
  | "BOA"
  | "BOI"
  | "CITI"
  | "CRDB"
  | "DASHENG"
  | "DCB"
  | "DTB"
  | "ECOBANK"
  | "EQUITY"
  | "EXIM"
  | "FNB"
  | "GT BANK"
  | "HABIB"
  | "ICB"
  | "IMBANK"
  | "KCB"
  | "KILIMANJARO"
  | "MAENDELEO"
  | "MKOMBOZI"
  | "MWALIMU"
  | "MWANGA"
  | "NBC"
  | "NCBA"
  | "NMB"
  | "PBZ"
  | "SCB"
  | "SELCOMPESA"
  | "STANBIC"
  | "TCB"
  | "UBA"
  | "UCHUMI"
  | "YETU"
  // Allow forward-compatible bank codes and raw SWIFT/BIC codes.
  | (string & {});

export interface CreateMobilePayoutInput {
  amount: number;
  phoneNumber: string;
  recipientName: string;
  /** Statement description visible to the recipient. Required by the API. */
  narration: string;
  webhookUrl?: string;
  metadata?: Record<string, unknown>;
  /** Subaccount (wallet) id or reference to pay out of. Omit for your main account. */
  subaccount?: string;
}

export interface CreateBankPayoutInput {
  amount: number;
  bankCode: BankCode;
  accountNumber: string;
  accountName: string;
  /** Statement description visible to the recipient. Required by the API. */
  narration: string;
  webhookUrl?: string;
  metadata?: Record<string, unknown>;
  /** Subaccount (wallet) id or reference to pay out of. Omit for your main account. */
  subaccount?: string;
}

export interface PayoutFeeInput {
  amount: number;
}

export interface MobilePayoutFeeInput extends PayoutFeeInput {
  /** Recipient phone — the fee can differ per mobile network. */
  phoneNumber?: string;
}

export interface Payout {
  object: "payout";
  apiVersion: string;
  id: string;
  reference: string;
  status: PayoutStatus;
  amount: Money;
  fees: Money;
  total: Money;
  channel?: {
    type: "mobile_money" | "bank" | (string & {});
    provider: MobileProvider | (string & {});
  };
  recipient: {
    name: string;
    phone?: string;
    account?: string;
    bank?: string;
  };
  createdAt: string;
  source?: string;
  narration?: string;
  externalReference?: string;
  failureReason?: string;
  completedAt?: string;
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
  /** Free-text search across reference and recipient fields. */
  search?: string;
  /** `YYYY-MM-DD`, inclusive. */
  startDate?: string;
  /** `YYYY-MM-DD`, inclusive. */
  endDate?: string;
}
