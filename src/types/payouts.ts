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

interface BasePayoutParams {
  amount: number;
  narration?: string;
  webhook_url?: string;
  metadata?: Record<string, unknown>;
}

export interface CreateMobilePayoutParams extends BasePayoutParams {
  channel: "mobile";
  recipient_phone: string;
  recipient_name: string;
}

export interface CreateBankPayoutParams extends BasePayoutParams {
  channel: "bank";
  recipient_bank: BankCode;
  recipient_account: string;
  recipient_name: string;
}

export type CreatePayoutParams =
  | CreateMobilePayoutParams
  | CreateBankPayoutParams;

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
  external_reference?: string;
  failure_reason?: string;
  metadata?: Record<string, unknown>;
}

export interface PayoutFee {
  amount: number;
  fee_amount: number;
  total_amount: number;
  currency: "TZS";
}

export interface ListPayoutsParams {
  limit?: number;
  offset?: number;
  status?: PayoutStatus;
  channel?: PayoutChannel;
}
