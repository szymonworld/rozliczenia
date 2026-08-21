// Shared types used by both the client (src/) and the serverless functions (api/).
// Keep this file framework-free (no React, no Node-only APIs) so it can be
// imported from either context.

export const GROUP_SLUG = "domownicy";

/** Where to actually send this person money. Both fields are free-form. */
export type PaymentDetails = {
  blik?: string; // phone number for a BLIK transfer
  iban?: string; // bank account number
};

export type Member = {
  id: string;
  name: string;
  hidden?: boolean;
  payment?: PaymentDetails;
};

export type Share = {
  memberId: string;
  amountGrosze: number;
};

export type ExpenseEntry = {
  id: string;
  type: "expense";
  description: string;
  amountGrosze: number;
  payerId: string;
  date: string; // ISO date (yyyy-mm-dd)
  shares: Share[];
  createdAt: string;
  createdBy: string;
  editedAt?: string;
  editedBy?: string;
  previousValue?: Partial<Omit<ExpenseEntry, "id" | "type">>;
  deletedAt?: string;
};

export type SettlementEntry = {
  id: string;
  type: "settlement";
  fromId: string;
  toId: string;
  amountGrosze: number;
  date: string;
  createdAt: string;
  createdBy: string;
  editedAt?: string;
  editedBy?: string;
  previousValue?: Partial<Omit<SettlementEntry, "id" | "type">>;
  deletedAt?: string;
  /** The recipient acknowledged the money arrived. */
  confirmedAt?: string;
  confirmedBy?: string;
  /** The recipient says it never arrived — always excluded from balances. */
  rejectedAt?: string;
  rejectedBy?: string;
};

export type Entry = ExpenseEntry | SettlementEntry;

export type LedgerSettings = {
  /**
   * When true, a settlement only counts towards balances once the recipient
   * confirms it. When false (default) the money is assumed to have moved and
   * confirmation is just an acknowledgement.
   */
  requireConfirmation?: boolean;
};

export type Ledger = {
  slug: string;
  members: Member[];
  entries: Entry[];
  settings?: LedgerSettings;
};

// Request body accepted by POST /api/entry
export type EntryWriteRequest =
  | { action: "create"; entry: Entry }
  | { action: "update"; id: string; changes: Partial<Entry>; editedBy: string }
  | { action: "delete"; id: string }
  | { action: "restore"; id: string }
  | { action: "addMember"; name: string }
  | { action: "setMemberHidden"; memberId: string; hidden: boolean }
  | { action: "setMemberPayment"; memberId: string; payment: PaymentDetails }
  | { action: "renameMember"; memberId: string; name: string }
  | { action: "confirmSettlement"; id: string; memberId: string }
  | { action: "rejectSettlement"; id: string; memberId: string }
  | { action: "setSettings"; settings: LedgerSettings };
