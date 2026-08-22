// Shared types used by both the client (src/) and the serverless functions (api/).
// Keep this file framework-free (no React, no Node-only APIs) so it can be
// imported from either context.

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

/** What an expense was for. Closed list so totals stay groupable. */
export type ExpenseCategory = "food" | "transport" | "stay" | "fun" | "shop" | "other";

export type ExpenseEntry = {
  id: string;
  type: "expense";
  description: string;
  amountGrosze: number;
  payerId: string;
  date: string; // ISO date (yyyy-mm-dd)
  /** Absent on entries created before categories existed — treat as "other". */
  category?: ExpenseCategory;
  /**
   * Set when the amount was typed in the group's second currency.
   * `amountGrosze` is still the source of truth; this is what to show.
   */
  foreign?: ForeignAmount;
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
  /**
   * Set when the amount was typed in the group's second currency.
   * `amountGrosze` is still the source of truth; this is what to show.
   */
  foreign?: ForeignAmount;
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

/**
 * A second currency the group can enter amounts in. Balances stay in base
 * grosze — conversion happens once, when the expense is written — so no
 * balance or statistic ever depends on a rate that might change later.
 */
export type CurrencySettings = {
  /** ISO 4217 code, e.g. "EUR". */
  code: string;
  /** Base-currency units per 1 unit of `code`. 4.3 means 1 EUR = 4,30 zł. */
  rate: number;
};

/** What an amount looked like before it was converted to base grosze. */
export type ForeignAmount = {
  code: string;
  /** Amount in the foreign currency's minor units, e.g. eurocents. */
  amountMinor: number;
  /**
   * The rate used at entry time. Kept per entry on purpose: changing the
   * group's rate later must not silently rewrite what past expenses cost.
   */
  rate: number;
};

export type LedgerSettings = {
  /**
   * What this group is called — shown as the app's title. Free-form, so
   * "Kawalerski Sławka" and "Mieszkanie 4B" are equally valid. Empty or
   * missing falls back to the default title.
   */
  groupName?: string;
  /**
   * When true, a settlement only counts towards balances once the recipient
   * confirms it. When false (default) the money is assumed to have moved and
   * confirmation is just an acknowledgement.
   */
  requireConfirmation?: boolean;
  /** Absent means the group only ever deals in the base currency. Null clears it. */
  currency?: CurrencySettings | null;
};

export type Ledger = {
  slug: string;
  members: Member[];
  entries: Entry[];
  settings?: LedgerSettings;
  /** When this event was created. Absent on the original group. */
  createdAt?: string;
  /** Stamped on every write — this is what decides when an event goes stale. */
  updatedAt?: string;
  /**
   * Soft delete. The ledger stays in storage untouched; it just stops
   * answering to its link. Only the admin console can bring it back.
   */
  archivedAt?: string;
  archivedBy?: string;
  /**
   * Settled and done. The ledger stays fully readable — that is the point,
   * it is the record of what happened — but nothing can be written to it
   * until someone reopens it.
   */
  closedAt?: string;
  closedBy?: string;
  /**
   * Optional second factor on top of the secret link. Server-side only — the
   * API strips this before a ledger ever reaches a browser.
   */
  pin?: PinConfig;
  /** What the client sees instead: whether a PIN is set, never the material. */
  pinEnabled?: boolean;
};

/** Stretched PIN material. Never leaves the server. */
export type PinConfig = {
  salt: string;
  hash: string;
  /** Signs this event's unlock tokens; rotated whenever the PIN changes. */
  secret: string;
};

/** Bounds the UI and the server agree on for an event PIN. */
export const PIN_MIN_LENGTH = 4;
export const PIN_MAX_LENGTH = 12;

export type UnlockRequest = { slug: string; pin: string };
export type UnlockResponse = { token: string };

/** Body of POST /api/group — spins up a fresh event on its own secret link. */
export type GroupCreateRequest = {
  name: string;
  memberNames: string[];
  /**
   * Slug of the group the creator is already in. Proves they belong somewhere
   * before they can spawn another group; the admin console sends none and
   * authenticates with its session instead.
   */
  fromSlug?: string;
};

export type GroupCreateResponse = {
  slug: string;
  ledger: Ledger;
};

/**
 * Staleness thresholds. Nothing is ever removed on a timer — an idle event is
 * only *labelled*, so a person can decide what to do with it.
 */
export const STALE_DAYS = 30;
export const VERY_STALE_DAYS = 60;

export type Staleness = "fresh" | "stale" | "very-stale";

/** Which staleness bucket an idle count falls into. */
export function stalenessOf(idleDays: number | null): Staleness {
  if (idleDays === null) return "fresh";
  if (idleDays >= VERY_STALE_DAYS) return "very-stale";
  if (idleDays >= STALE_DAYS) return "stale";
  return "fresh";
}

/** One row of the admin console's event list. */
export type AdminGroupSummary = {
  slug: string;
  name: string;
  memberCount: number;
  entryCount: number;
  createdAt?: string;
  updatedAt?: string;
  archivedAt?: string;
  archivedBy?: string;
  idleDays: number | null;
  staleness: Staleness;
  pinEnabled: boolean;
};

export type AdminListResponse = {
  staleDays: number;
  veryStaleDays: number;
  groups: AdminGroupSummary[];
};

export type AdminActionRequest = {
  action: "archive" | "restore" | "purge" | "clear-pin";
  slug: string;
};

/**
 * Fields to merge into an existing entry.
 *
 * `foreign: null` is the only way to remove a currency record: JSON.stringify
 * drops keys whose value is undefined, so an undefined `foreign` never reaches
 * the server and the merge there would silently keep the old one.
 */
// Spelled out per entry type rather than as an intersection over
// Partial<Entry>: an intersection narrows `foreign` back to ForeignAmount and
// would reject the null this type exists to allow.
export type EntryChanges =
  | (Omit<Partial<ExpenseEntry>, "foreign"> & { foreign?: ForeignAmount | null })
  | (Omit<Partial<SettlementEntry>, "foreign"> & { foreign?: ForeignAmount | null });

// Request body accepted by POST /api/entry
export type EntryWriteRequest =
  | { action: "create"; entry: Entry }
  | { action: "update"; id: string; changes: EntryChanges; editedBy: string }
  | { action: "delete"; id: string }
  | { action: "restore"; id: string }
  | { action: "addMember"; name: string }
  | { action: "removeMember"; memberId: string }
  | { action: "archiveGroup"; memberId?: string }
  | { action: "closeGroup"; memberId?: string }
  | { action: "reopenGroup"; memberId?: string }
  | { action: "setPin"; pin: string; currentPin?: string }
  | { action: "clearPin"; currentPin: string }
  | { action: "setMemberHidden"; memberId: string; hidden: boolean }
  | { action: "setMemberPayment"; memberId: string; payment: PaymentDetails }
  | { action: "renameMember"; memberId: string; name: string }
  | { action: "confirmSettlement"; id: string; memberId: string }
  | { action: "rejectSettlement"; id: string; memberId: string }
  | { action: "setSettings"; settings: LedgerSettings };
