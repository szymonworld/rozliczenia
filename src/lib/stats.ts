// Spending statistics derived from the ledger. Integer grosze throughout.
import type { Entry, ExpenseCategory, Member } from "../../shared/types";

export type MemberStats = {
  memberId: string;
  /** Total this person actually paid out of pocket (expenses they were payer of). */
  paidGrosze: number;
  /** Total this person consumed (sum of their shares). */
  shareGrosze: number;
  /** How many expenses they took part in. */
  entryCount: number;
};

export type CategoryStats = {
  category: ExpenseCategory;
  amountGrosze: number;
  entryCount: number;
};

export type LedgerStats = {
  totalGrosze: number;
  expenseCount: number;
  settlementCount: number;
  perMember: MemberStats[];
  /** Spend per category, largest first. Only categories actually used appear. */
  perCategory: CategoryStats[];
  /** Largest single expense, if any. */
  biggest: { description: string; amountGrosze: number; date: string } | null;
};

export type Period = "all" | "month";

/** Keeps only entries inside the requested period. */
export function filterByPeriod(entries: Entry[], period: Period): Entry[] {
  if (period === "all") return entries;
  const now = new Date();
  const prefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return entries.filter((e) => e.date.startsWith(prefix));
}

export function computeStats(members: Member[], entries: Entry[]): LedgerStats {
  const perMember = new Map<string, MemberStats>();
  for (const m of members) {
    perMember.set(m.id, { memberId: m.id, paidGrosze: 0, shareGrosze: 0, entryCount: 0 });
  }
  const ensure = (id: string): MemberStats => {
    let s = perMember.get(id);
    if (!s) {
      s = { memberId: id, paidGrosze: 0, shareGrosze: 0, entryCount: 0 };
      perMember.set(id, s);
    }
    return s;
  };

  let totalGrosze = 0;
  let expenseCount = 0;
  let settlementCount = 0;
  let biggest: LedgerStats["biggest"] = null;
  const perCategory = new Map<ExpenseCategory, CategoryStats>();

  for (const entry of entries) {
    if (entry.deletedAt) continue;

    if (entry.type === "settlement") {
      settlementCount++;
      continue;
    }

    expenseCount++;
    totalGrosze += entry.amountGrosze;
    ensure(entry.payerId).paidGrosze += entry.amountGrosze;

    // Entries predating categories fall into "other" rather than vanishing
    // from the breakdown.
    const category = entry.category ?? "other";
    const bucket = perCategory.get(category) ?? { category, amountGrosze: 0, entryCount: 0 };
    bucket.amountGrosze += entry.amountGrosze;
    bucket.entryCount++;
    perCategory.set(category, bucket);

    for (const share of entry.shares) {
      const s = ensure(share.memberId);
      s.shareGrosze += share.amountGrosze;
      s.entryCount++;
    }

    if (!biggest || entry.amountGrosze > biggest.amountGrosze) {
      biggest = {
        description: entry.description,
        amountGrosze: entry.amountGrosze,
        date: entry.date,
      };
    }
  }

  return {
    totalGrosze,
    expenseCount,
    settlementCount,
    perMember: [...perMember.values()].sort((a, b) => b.shareGrosze - a.shareGrosze),
    perCategory: [...perCategory.values()].sort((a, b) => b.amountGrosze - a.amountGrosze),
    biggest,
  };
}
