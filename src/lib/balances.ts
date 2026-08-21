// Pure balance-calculation logic. Integer grosze throughout — never floats for money.
import type { Entry, Member } from "../../shared/types";

/** Net balance per member: positive = is owed money, negative = owes money. Sums to zero. */
export type NetBalances = Record<string, number>;

/** Directed pairwise debt: debts[a][b] = amount `a` owes `b`, netted (only one direction is > 0). */
export type PairwiseDebts = Record<string, Record<string, number>>;

export type SuggestedTransfer = {
  fromId: string;
  toId: string;
  amountGrosze: number;
};

/**
 * Build the full pairwise debt matrix from non-deleted expenses and settlements.
 * matrix[a][b] = amount that `a` owes `b` (can be negative before netting; we net it).
 */
export function computePairwiseDebts(members: Member[], entries: Entry[]): PairwiseDebts {
  const ids = members.map((m) => m.id);
  // raw[a][b] = how much a owes b (accumulated, not yet netted against raw[b][a])
  const raw: Record<string, Record<string, number>> = {};
  for (const a of ids) {
    raw[a] = {};
    for (const b of ids) raw[a][b] = 0;
  }

  const ensure = (id: string) => {
    if (!raw[id]) {
      raw[id] = {};
      for (const b of Object.keys(raw)) {
        raw[id][b] = 0;
        raw[b][id] = 0;
      }
    }
  };

  for (const entry of entries) {
    if (entry.deletedAt) continue;
    if (entry.type === "expense") {
      ensure(entry.payerId);
      for (const share of entry.shares) {
        if (share.memberId === entry.payerId) continue;
        ensure(share.memberId);
        // share.memberId owes payerId the share amount
        raw[share.memberId][entry.payerId] += share.amountGrosze;
      }
    } else {
      ensure(entry.fromId);
      ensure(entry.toId);
      // A settlement payment reduces what fromId owes toId (i.e. it's a debt in the other direction)
      raw[entry.toId][entry.fromId] += entry.amountGrosze;
    }
  }

  // Net each pair: only the larger direction remains, as a positive amount.
  const result: PairwiseDebts = {};
  const allIds = Object.keys(raw);
  for (const a of allIds) result[a] = {};
  for (let i = 0; i < allIds.length; i++) {
    for (let j = i + 1; j < allIds.length; j++) {
      const a = allIds[i];
      const b = allIds[j];
      const net = raw[a][b] - raw[b][a]; // positive => a owes b
      if (net > 0) {
        result[a][b] = net;
        result[b][a] = 0;
      } else if (net < 0) {
        result[b][a] = -net;
        result[a][b] = 0;
      } else {
        result[a][b] = 0;
        result[b][a] = 0;
      }
    }
  }
  return result;
}

/** Net balance per person: positive = others owe them, negative = they owe others. */
export function computeNetBalances(members: Member[], entries: Entry[]): NetBalances {
  const debts = computePairwiseDebts(members, entries);
  const balances: NetBalances = {};
  for (const id of Object.keys(debts)) balances[id] = 0;
  for (const a of Object.keys(debts)) {
    for (const b of Object.keys(debts[a])) {
      const amount = debts[a][b];
      if (amount > 0) {
        balances[a] -= amount; // a owes b
        balances[b] += amount; // b is owed by a
      }
    }
  }
  return balances;
}

/**
 * Greedy minimal-transfer suggestion: repeatedly match the largest creditor
 * with the largest debtor until all balances are settled.
 */
export function suggestTransfers(balances: NetBalances): SuggestedTransfer[] {
  const entries = Object.entries(balances)
    .map(([id, amount]) => ({ id, amount }))
    .filter((e) => e.amount !== 0);

  const transfers: SuggestedTransfer[] = [];
  const working = entries.map((e) => ({ ...e }));

  while (true) {
    working.sort((a, b) => b.amount - a.amount);
    const creditor = working[0]; // most positive
    const debtor = working[working.length - 1]; // most negative
    if (!creditor || !debtor || creditor.amount <= 0 || debtor.amount >= 0) break;

    const amount = Math.min(creditor.amount, -debtor.amount);
    if (amount <= 0) break;

    transfers.push({ fromId: debtor.id, toId: creditor.id, amountGrosze: amount });
    creditor.amount -= amount;
    debtor.amount += amount;

    // Remove settled parties
    for (let i = working.length - 1; i >= 0; i--) {
      if (working[i].amount === 0) working.splice(i, 1);
    }
  }

  return transfers;
}
