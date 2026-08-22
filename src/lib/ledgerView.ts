// Which entries actually count, given deletions, rejections and the group's
// confirmation policy. Every balance calculation should start here.
import type { Entry, Ledger, SettlementEntry } from "../../shared/types";

export const DEFAULT_GROUP_NAME = "Rozliczenia";

/** What this group calls itself, falling back to the app's own name. */
export function groupName(ledger: Ledger | null): string {
  return ledger?.settings?.groupName?.trim() || DEFAULT_GROUP_NAME;
}

/** Whether the event has been settled and closed for writing. */
export function isClosed(ledger: Ledger | null): boolean {
  return Boolean(ledger?.closedAt);
}

/** How many entries would break if this member were removed. */
export function memberUsageCount(ledger: Ledger | null, memberId: string): number {
  if (!ledger) return 0;
  return ledger.entries.filter((e) =>
    e.type === "expense"
      ? e.payerId === memberId || e.shares.some((sh) => sh.memberId === memberId)
      : e.fromId === memberId || e.toId === memberId,
  ).length;
}

export type SettlementStatus = "confirmed" | "rejected" | "pending";

export function settlementStatus(entry: SettlementEntry): SettlementStatus {
  if (entry.rejectedAt) return "rejected";
  if (entry.confirmedAt) return "confirmed";
  return "pending";
}

/**
 * Entries that feed the balance math:
 *  - deleted entries never count
 *  - rejected settlements never count (the recipient says it never arrived)
 *  - unconfirmed settlements count unless the group requires confirmation
 */
export function countableEntries(ledger: Ledger | null): Entry[] {
  if (!ledger) return [];
  const requireConfirmation = ledger.settings?.requireConfirmation ?? false;

  return ledger.entries.filter((entry) => {
    if (entry.deletedAt) return false;
    if (entry.type !== "settlement") return true;
    if (entry.rejectedAt) return false;
    if (requireConfirmation && !entry.confirmedAt) return false;
    return true;
  });
}

/** Non-deleted entries, for display purposes (history, counts). */
export function visibleEntries(ledger: Ledger | null): Entry[] {
  return ledger ? ledger.entries.filter((e) => !e.deletedAt) : [];
}

/** Settlements sent to `memberId` that they have not yet ruled on. */
export function pendingConfirmations(
  ledger: Ledger | null,
  memberId: string | null,
): SettlementEntry[] {
  if (!ledger || !memberId) return [];
  return ledger.entries.filter(
    (e): e is SettlementEntry =>
      e.type === "settlement" &&
      !e.deletedAt &&
      e.toId === memberId &&
      !e.confirmedAt &&
      !e.rejectedAt,
  );
}

/** Settlements this member sent that the other side has not confirmed yet. */
export function awaitingOthers(
  ledger: Ledger | null,
  memberId: string | null,
): SettlementEntry[] {
  if (!ledger || !memberId) return [];
  return ledger.entries.filter(
    (e): e is SettlementEntry =>
      e.type === "settlement" &&
      !e.deletedAt &&
      e.fromId === memberId &&
      !e.confirmedAt &&
      !e.rejectedAt,
  );
}
