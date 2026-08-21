import { describe, expect, it } from "vitest";
import { computeNetBalances, computePairwiseDebts, suggestTransfers } from "../balances";
import { splitEqual } from "../money";
import type { Entry, Member } from "../../../shared/types";

const members: Member[] = [
  { id: "szymon", name: "Szymon" },
  { id: "jarek", name: "Jarek" },
  { id: "alan", name: "Alan" },
  { id: "dawid", name: "Dawid" },
];

let seq = 0;
function expense(payerId: string, amountGrosze: number, participants: string[]): Entry {
  return {
    id: `e${seq++}`,
    type: "expense",
    description: "test",
    amountGrosze,
    payerId,
    date: "2026-08-21",
    shares: splitEqual(amountGrosze, participants, payerId),
    createdAt: new Date().toISOString(),
    createdBy: payerId,
  };
}

function settlement(fromId: string, toId: string, amountGrosze: number): Entry {
  return {
    id: `s${seq++}`,
    type: "settlement",
    fromId,
    toId,
    amountGrosze,
    date: "2026-08-21",
    createdAt: new Date().toISOString(),
    createdBy: fromId,
  };
}

describe("computePairwiseDebts", () => {
  it("credits the payer against every other participant", () => {
    const debts = computePairwiseDebts(members, [
      expense("szymon", 12000, ["szymon", "jarek", "alan", "dawid"]),
    ]);
    expect(debts.jarek.szymon).toBe(3000);
    expect(debts.alan.szymon).toBe(3000);
    expect(debts.dawid.szymon).toBe(3000);
    // The payer never owes themselves.
    expect(debts.szymon.jarek).toBe(0);
  });

  it("nets opposing debts so only one direction survives", () => {
    const debts = computePairwiseDebts(members, [
      expense("szymon", 1000, ["szymon", "jarek"]), // jarek owes 500
      expense("jarek", 400, ["szymon", "jarek"]), // szymon owes 200
    ]);
    expect(debts.jarek.szymon).toBe(300);
    expect(debts.szymon.jarek).toBe(0);
  });

  it("lets a settlement reduce the debt it repays", () => {
    const debts = computePairwiseDebts(members, [
      expense("szymon", 1000, ["szymon", "jarek"]), // jarek owes 500
      settlement("jarek", "szymon", 200),
    ]);
    expect(debts.jarek.szymon).toBe(300);
  });

  it("flips direction when someone overpays", () => {
    const debts = computePairwiseDebts(members, [
      expense("szymon", 1000, ["szymon", "jarek"]), // jarek owes 500
      settlement("jarek", "szymon", 800),
    ]);
    expect(debts.szymon.jarek).toBe(300);
    expect(debts.jarek.szymon).toBe(0);
  });

  it("excludes people who were not part of an expense", () => {
    const debts = computePairwiseDebts(members, [expense("szymon", 900, ["szymon", "jarek"])]);
    expect(debts.alan.szymon).toBe(0);
    expect(debts.dawid.szymon).toBe(0);
  });
});

describe("computeNetBalances", () => {
  it("gives the payer what the others owe them", () => {
    const balances = computeNetBalances(members, [
      expense("szymon", 12000, ["szymon", "jarek", "alan", "dawid"]),
    ]);
    expect(balances.szymon).toBe(9000);
    expect(balances.jarek).toBe(-3000);
  });

  it("always sums to zero — money cannot appear or vanish", () => {
    const entries = [
      expense("szymon", 12345, ["szymon", "jarek", "alan"]),
      expense("jarek", 777, ["jarek", "dawid"]),
      expense("alan", 100, ["szymon", "jarek", "alan", "dawid"]),
      settlement("dawid", "szymon", 250),
    ];
    const balances = computeNetBalances(members, entries);
    const sum = Object.values(balances).reduce((a, b) => a + b, 0);
    expect(sum).toBe(0);
  });

  it("is zero for everyone once debts are fully repaid", () => {
    const balances = computeNetBalances(members, [
      expense("szymon", 1000, ["szymon", "jarek"]),
      settlement("jarek", "szymon", 500),
    ]);
    expect(Object.values(balances).every((v) => v === 0)).toBe(true);
  });
});

describe("suggestTransfers", () => {
  it("produces nothing when everything is settled", () => {
    expect(suggestTransfers({ a: 0, b: 0 })).toEqual([]);
  });

  it("moves exactly the amount that is owed", () => {
    const transfers = suggestTransfers({ a: 9000, b: -3000, c: -3000, d: -3000 });
    const total = transfers.reduce((sum, t) => sum + t.amountGrosze, 0);
    expect(total).toBe(9000);
    expect(transfers.every((t) => t.toId === "a")).toBe(true);
  });

  it("nets a chain into a single transfer rather than two", () => {
    // b owes a 40, c owes b 40 → one transfer c→a covers it.
    const transfers = suggestTransfers({ a: 4000, b: 0, c: -4000 });
    expect(transfers).toHaveLength(1);
    expect(transfers[0]).toMatchObject({ fromId: "c", toId: "a", amountGrosze: 4000 });
  });

  it("never suggests more than n-1 transfers, and never self-transfers", () => {
    const balances = { a: 5000, b: 2500, c: -3000, d: -4500 };
    const transfers = suggestTransfers(balances);
    expect(transfers.length).toBeLessThanOrEqual(Object.keys(balances).length - 1);
    expect(transfers.every((t) => t.fromId !== t.toId)).toBe(true);
    expect(transfers.every((t) => t.amountGrosze > 0)).toBe(true);
  });

  it("settles every balance to zero when applied", () => {
    const balances = { a: 12345, b: -4321, c: -8024, d: 0 };
    const working = { ...balances };
    for (const t of suggestTransfers(balances)) {
      working[t.fromId as keyof typeof working] += t.amountGrosze;
      working[t.toId as keyof typeof working] -= t.amountGrosze;
    }
    expect(Object.values(working).every((v) => v === 0)).toBe(true);
  });
});

describe("randomised ledgers", () => {
  it("keeps balances zero-sum and fully settleable", () => {
    // Deterministic pseudo-random so a failure is reproducible.
    let seed = 42;
    const rand = (n: number) => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed % n;
    };

    for (let round = 0; round < 200; round++) {
      const entries: Entry[] = [];
      for (let i = 0; i < 1 + rand(6); i++) {
        const participants = members.map((m) => m.id).filter(() => rand(2) === 0);
        if (participants.length === 0) continue;
        const payer = members[rand(members.length)].id;
        entries.push(expense(payer, 1 + rand(50000), participants));
      }

      const balances = computeNetBalances(members, entries);
      expect(Object.values(balances).reduce((a, b) => a + b, 0)).toBe(0);

      const working: Record<string, number> = { ...balances };
      for (const t of suggestTransfers(balances)) {
        working[t.fromId] += t.amountGrosze;
        working[t.toId] -= t.amountGrosze;
      }
      expect(Object.values(working).every((v) => v === 0)).toBe(true);
    }
  });
});
