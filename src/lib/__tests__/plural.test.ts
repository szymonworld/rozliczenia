import { describe, expect, it } from "vitest";
import { plural } from "../plural";

const udzial = (n: number) => plural(n, "udział", "udziały", "udziałów");

describe("plural", () => {
  it("uses the singular for exactly one", () => {
    expect(udzial(1)).toBe("udział");
  });

  it("uses the few form for counts ending 2-4", () => {
    expect(udzial(2)).toBe("udziały");
    expect(udzial(4)).toBe("udziały");
    expect(udzial(22)).toBe("udziały");
    expect(udzial(104)).toBe("udziały");
  });

  it("uses the many form for the teens, which look like few but are not", () => {
    expect(udzial(12)).toBe("udziałów");
    expect(udzial(13)).toBe("udziałów");
    expect(udzial(14)).toBe("udziałów");
    expect(udzial(112)).toBe("udziałów");
  });

  it("uses the many form for everything else", () => {
    expect(udzial(0)).toBe("udziałów");
    expect(udzial(5)).toBe("udziałów");
    expect(udzial(11)).toBe("udziałów");
    expect(udzial(25)).toBe("udziałów");
  });
});
