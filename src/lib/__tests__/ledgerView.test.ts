import { describe, expect, it } from "vitest";
import {
  awaitingOthers,
  countableEntries,
  pendingConfirmations,
  settlementStatus,
  visibleEntries,
} from "../ledgerView";
import type { Ledger, SettlementEntry } from "../../../shared/types";

function ledgerWith(
  settlementProps: Partial<SettlementEntry>,
  settings?: Ledger["settings"],
): Ledger {
  return {
    slug: "test",
    settings,
    members: [
      { id: "a", name: "A" },
      { id: "b", name: "B" },
    ],
    entries: [
      {
        id: "e1",
        type: "expense",
        description: "obiad",
        amountGrosze: 1000,
        payerId: "a",
        date: "2026-08-21",
        shares: [
          { memberId: "a", amountGrosze: 500 },
          { memberId: "b", amountGrosze: 500 },
        ],
        createdAt: "2026-08-21T10:00:00.000Z",
        createdBy: "a",
      },
      {
        id: "s1",
        type: "settlement",
        fromId: "b",
        toId: "a",
        amountGrosze: 500,
        date: "2026-08-21",
        createdAt: "2026-08-21T11:00:00.000Z",
        createdBy: "b",
        ...settlementProps,
      },
    ],
  };
}

describe("settlementStatus", () => {
  it("reports pending, confirmed and rejected", () => {
    const base = ledgerWith({}).entries[1] as SettlementEntry;
    expect(settlementStatus(base)).toBe("pending");
    expect(settlementStatus({ ...base, confirmedAt: "now" })).toBe("confirmed");
    expect(settlementStatus({ ...base, rejectedAt: "now" })).toBe("rejected");
  });

  it("treats rejection as decisive even if it was once confirmed", () => {
    const base = ledgerWith({}).entries[1] as SettlementEntry;
    expect(settlementStatus({ ...base, confirmedAt: "then", rejectedAt: "now" })).toBe("rejected");
  });
});

describe("countableEntries", () => {
  it("counts an unconfirmed settlement when confirmation is not required", () => {
    expect(countableEntries(ledgerWith({}))).toHaveLength(2);
  });

  it("ignores an unconfirmed settlement when confirmation is required", () => {
    const entries = countableEntries(ledgerWith({}, { requireConfirmation: true }));
    expect(entries).toHaveLength(1);
    expect(entries[0].type).toBe("expense");
  });

  it("counts a confirmed settlement under either policy", () => {
    const props = { confirmedAt: "2026-08-21T12:00:00.000Z", confirmedBy: "a" };
    expect(countableEntries(ledgerWith(props))).toHaveLength(2);
    expect(countableEntries(ledgerWith(props, { requireConfirmation: true }))).toHaveLength(2);
  });

  it("never counts a rejected settlement, whatever the policy", () => {
    const props = { rejectedAt: "2026-08-21T12:00:00.000Z", rejectedBy: "a" };
    expect(countableEntries(ledgerWith(props))).toHaveLength(1);
    expect(countableEntries(ledgerWith(props, { requireConfirmation: true }))).toHaveLength(1);
  });

  it("never counts deleted entries", () => {
    expect(countableEntries(ledgerWith({ deletedAt: "2026-08-21T12:00:00.000Z" }))).toHaveLength(1);
  });

  it("copes with no ledger at all", () => {
    expect(countableEntries(null)).toEqual([]);
    expect(visibleEntries(null)).toEqual([]);
  });
});

describe("pendingConfirmations", () => {
  it("asks only the recipient to confirm", () => {
    const ledger = ledgerWith({});
    expect(pendingConfirmations(ledger, "a")).toHaveLength(1);
    expect(pendingConfirmations(ledger, "b")).toHaveLength(0);
  });

  it("drops out once ruled on", () => {
    expect(pendingConfirmations(ledgerWith({ confirmedAt: "now" }), "a")).toHaveLength(0);
    expect(pendingConfirmations(ledgerWith({ rejectedAt: "now" }), "a")).toHaveLength(0);
  });

  it("ignores deleted settlements", () => {
    expect(pendingConfirmations(ledgerWith({ deletedAt: "now" }), "a")).toHaveLength(0);
  });

  it("tracks what the sender is still waiting on", () => {
    expect(awaitingOthers(ledgerWith({}), "b")).toHaveLength(1);
    expect(awaitingOthers(ledgerWith({ confirmedAt: "now" }), "b")).toHaveLength(0);
  });
});
