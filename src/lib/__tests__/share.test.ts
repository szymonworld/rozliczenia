import { describe, expect, it } from "vitest";
import { buildCsv } from "../share";
import type { Entry, Member } from "../../../shared/types";

const members: Member[] = [
  { id: "ala", name: "Ala" },
  { id: "bartek", name: "Bartek" },
];

const expense = (extra: Partial<Entry> = {}): Entry =>
  ({
    id: "e1",
    type: "expense",
    description: "Kolacja",
    amountGrosze: 12900,
    payerId: "ala",
    date: "2026-08-22",
    shares: [
      { memberId: "ala", amountGrosze: 6450 },
      { memberId: "bartek", amountGrosze: 6450 },
    ],
    createdAt: "2026-08-22T10:00:00.000Z",
    createdBy: "ala",
    ...extra,
  }) as Entry;

const settlement = (extra: Partial<Entry> = {}): Entry =>
  ({
    id: "s1",
    type: "settlement",
    fromId: "bartek",
    toId: "ala",
    amountGrosze: 6450,
    date: "2026-08-22",
    createdAt: "2026-08-22T11:00:00.000Z",
    createdBy: "bartek",
    ...extra,
  }) as Entry;

const rows = (csv: string) => csv.trim().split("\n");
const cells = (row: string) => row.split(";");

describe("buildCsv", () => {
  it("gives every row exactly as many columns as the header", () => {
    const csv = buildCsv(members, [
      expense(),
      expense({ foreign: { code: "EUR", amountMinor: 3000, rate: 4.3 } }),
      settlement(),
      settlement({ foreign: { code: "EUR", amountMinor: 1500, rate: 4.3 } }),
    ]);
    const all = rows(csv);
    const headerWidth = cells(all[0]).length;
    expect(headerWidth).toBe(12);
    for (const row of all.slice(1)) {
      expect(cells(row)).toHaveLength(headerWidth);
    }
  });

  it("records the currency on a foreign expense", () => {
    const csv = buildCsv(members, [
      expense({ foreign: { code: "EUR", amountMinor: 3000, rate: 4.3 } }),
    ]);
    const head = cells(rows(csv)[0]);
    const row = cells(rows(csv)[1]);
    expect(row[head.indexOf("waluta")]).toBe("EUR");
    expect(row[head.indexOf("kwota_waluta")]).toBe("30,00");
    expect(row[head.indexOf("kurs")]).toBe("4,3");
  });

  // Settlements gained a foreign amount after expenses did, and their row
  // kept hardcoded blanks in those columns for a while.
  it("records the currency on a foreign settlement too", () => {
    const csv = buildCsv(members, [
      settlement({ foreign: { code: "EUR", amountMinor: 1500, rate: 4.3 } }),
    ]);
    const head = cells(rows(csv)[0]);
    const row = cells(rows(csv)[1]);
    expect(row[head.indexOf("waluta")]).toBe("EUR");
    expect(row[head.indexOf("kwota_waluta")]).toBe("15,00");
    expect(row[head.indexOf("kurs")]).toBe("4,3");
    expect(row[head.indexOf("od")]).toBe("Bartek");
    expect(row[head.indexOf("do")]).toBe("Ala");
  });

  it("leaves the currency columns empty for base-currency rows", () => {
    const csv = buildCsv(members, [expense(), settlement()]);
    const head = cells(rows(csv)[0]);
    for (const row of rows(csv).slice(1)) {
      const c = cells(row);
      expect(c[head.indexOf("waluta")]).toBe("");
      expect(c[head.indexOf("kwota_waluta")]).toBe("");
      expect(c[head.indexOf("kurs")]).toBe("");
    }
  });
});
