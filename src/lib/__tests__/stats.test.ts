import { describe, expect, it } from "vitest";
import { computeStats, filterByPeriod } from "../stats";
import type { Entry, Member } from "../../../shared/types";

const members: Member[] = [
  { id: "a", name: "A" },
  { id: "b", name: "B" },
];

function expense(id: string, payerId: string, amount: number, date = "2026-08-21"): Entry {
  return {
    id,
    type: "expense",
    description: `wydatek ${id}`,
    amountGrosze: amount,
    payerId,
    date,
    shares: [
      { memberId: "a", amountGrosze: amount / 2 },
      { memberId: "b", amountGrosze: amount / 2 },
    ],
    createdAt: `${date}T10:00:00.000Z`,
    createdBy: payerId,
  };
}

describe("computeStats", () => {
  it("totals only expenses, counting settlements separately", () => {
    const stats = computeStats(members, [
      expense("e1", "a", 1000),
      {
        id: "s1",
        type: "settlement",
        fromId: "b",
        toId: "a",
        amountGrosze: 500,
        date: "2026-08-21",
        createdAt: "2026-08-21T11:00:00.000Z",
        createdBy: "b",
      },
    ]);
    expect(stats.totalGrosze).toBe(1000);
    expect(stats.expenseCount).toBe(1);
    expect(stats.settlementCount).toBe(1);
  });

  it("separates what someone paid from what they consumed", () => {
    const stats = computeStats(members, [expense("e1", "a", 1000)]);
    const a = stats.perMember.find((m) => m.memberId === "a")!;
    const b = stats.perMember.find((m) => m.memberId === "b")!;
    expect(a.paidGrosze).toBe(1000);
    expect(a.shareGrosze).toBe(500);
    expect(b.paidGrosze).toBe(0);
    expect(b.shareGrosze).toBe(500);
  });

  it("shares always add up to the total spent", () => {
    const stats = computeStats(members, [
      expense("e1", "a", 1000),
      expense("e2", "b", 2500),
    ]);
    const shareSum = stats.perMember.reduce((sum, m) => sum + m.shareGrosze, 0);
    expect(shareSum).toBe(stats.totalGrosze);
  });

  it("skips deleted entries", () => {
    const deleted = { ...expense("e2", "b", 9999), deletedAt: "2026-08-21T12:00:00.000Z" };
    const stats = computeStats(members, [expense("e1", "a", 1000), deleted]);
    expect(stats.totalGrosze).toBe(1000);
  });

  it("finds the largest single expense", () => {
    const stats = computeStats(members, [
      expense("e1", "a", 1000),
      expense("e2", "b", 5000),
      expense("e3", "a", 2000),
    ]);
    expect(stats.biggest?.amountGrosze).toBe(5000);
  });

  it("has no biggest expense when there are none", () => {
    const stats = computeStats(members, []);
    expect(stats.biggest).toBeNull();
    expect(stats.totalGrosze).toBe(0);
  });

  it("includes members who never spent anything", () => {
    const stats = computeStats(members, []);
    expect(stats.perMember).toHaveLength(2);
  });
});

describe("filterByPeriod", () => {
  it("returns everything for the all-time period", () => {
    const entries = [expense("e1", "a", 100, "2020-01-01"), expense("e2", "a", 100)];
    expect(filterByPeriod(entries, "all")).toHaveLength(2);
  });

  it("keeps only the current month", () => {
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-15`;
    const entries = [
      expense("old", "a", 100, "2020-01-01"),
      expense("new", "a", 100, thisMonth),
    ];
    const filtered = filterByPeriod(entries, "month");
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe("new");
  });
});
