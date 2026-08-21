import { describe, expect, it } from "vitest";
import { formatGrosze, groszeToInputValue, parsePlnToGrosze, splitEqual } from "../money";

describe("parsePlnToGrosze", () => {
  it("accepts both comma and dot, because PL keyboards disagree", () => {
    expect(parsePlnToGrosze("12,34")).toBe(1234);
    expect(parsePlnToGrosze("12.34")).toBe(1234);
  });

  it("accepts whole numbers and a single decimal digit", () => {
    expect(parsePlnToGrosze("12")).toBe(1200);
    expect(parsePlnToGrosze("12,5")).toBe(1250);
  });

  it("ignores spaces used as thousands separators", () => {
    expect(parsePlnToGrosze("1 234,50")).toBe(123450);
  });

  it("rejects anything that is not a clean amount", () => {
    expect(parsePlnToGrosze("")).toBeNull();
    expect(parsePlnToGrosze("abc")).toBeNull();
    expect(parsePlnToGrosze("12,345")).toBeNull(); // more precision than grosze
    expect(parsePlnToGrosze("1,2,3")).toBeNull();
  });

  it("round-trips through the input formatter", () => {
    for (const grosze of [0, 1, 99, 100, 1234, 123450]) {
      expect(parsePlnToGrosze(groszeToInputValue(grosze))).toBe(grosze);
    }
  });
});

describe("formatGrosze", () => {
  // Polish CLDR sets minimumGroupingDigits to 2, so four-digit amounts are
  // deliberately ungrouped: "1234,50 zł", but "12 345,50 zł".
  const normalise = (s: string) => s.replace(/[  ]/g, " ");

  it("uses a comma decimal separator and the złoty suffix", () => {
    expect(normalise(formatGrosze(500))).toBe("5,00 zł");
    expect(normalise(formatGrosze(0))).toBe("0,00 zł");
    expect(normalise(formatGrosze(123450))).toBe("1234,50 zł");
  });

  it("groups thousands only from five digits up, as Polish expects", () => {
    expect(normalise(formatGrosze(1234550))).toBe("12 345,50 zł");
    expect(normalise(formatGrosze(12345678))).toBe("123 456,78 zł");
  });

  it("shows grosze precisely, without floating-point drift", () => {
    expect(normalise(formatGrosze(1))).toBe("0,01 zł");
    expect(normalise(formatGrosze(3333))).toBe("33,33 zł");
  });
});

describe("splitEqual", () => {
  it("splits evenly when it divides cleanly", () => {
    const shares = splitEqual(12000, ["a", "b", "c", "d"], "a");
    expect(shares.map((s) => s.amountGrosze)).toEqual([3000, 3000, 3000, 3000]);
  });

  it("gives the leftover grosze to the payer", () => {
    const shares = splitEqual(100, ["a", "b", "c"], "b");
    expect(shares.find((s) => s.memberId === "b")!.amountGrosze).toBe(34);
    expect(shares.find((s) => s.memberId === "a")!.amountGrosze).toBe(33);
    expect(shares.find((s) => s.memberId === "c")!.amountGrosze).toBe(33);
  });

  it("falls back to the first participant when the payer is not splitting", () => {
    const shares = splitEqual(100, ["a", "b", "c"], "zzz");
    expect(shares[0].amountGrosze).toBe(34);
  });

  it("always sums exactly to the total — no grosz may be invented or lost", () => {
    for (let total = 0; total <= 500; total++) {
      for (const n of [1, 2, 3, 4, 7]) {
        const ids = Array.from({ length: n }, (_, i) => `m${i}`);
        const shares = splitEqual(total, ids, "m0");
        const sum = shares.reduce((acc, s) => acc + s.amountGrosze, 0);
        expect(sum).toBe(total);
      }
    }
  });

  it("returns nothing when nobody is participating", () => {
    expect(splitEqual(1000, [], "a")).toEqual([]);
  });
});
