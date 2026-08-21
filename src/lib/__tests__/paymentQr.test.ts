import { describe, expect, it } from "vitest";
import { buildPaymentString, buildQrSvg, isUsableIban, normaliseIban } from "../paymentQr";

describe("normaliseIban", () => {
  it("strips spaces and the PL prefix", () => {
    expect(normaliseIban("PL27 1140 2004 0000 3002 0135 5387")).toBe(
      "27114020040000300201355387",
    );
    expect(normaliseIban("27114020040000300201355387")).toBe("27114020040000300201355387");
  });
});

describe("isUsableIban", () => {
  it("accepts a 26-digit Polish account in any spacing", () => {
    expect(isUsableIban("PL27 1140 2004 0000 3002 0135 5387")).toBe(true);
    expect(isUsableIban("27114020040000300201355387")).toBe(true);
  });

  it("rejects anything that cannot produce a valid transfer", () => {
    expect(isUsableIban(undefined)).toBe(false);
    expect(isUsableIban("")).toBe(false);
    expect(isUsableIban("123")).toBe(false);
    expect(isUsableIban("DE89370400440532013000")).toBe(false); // not a PL account
  });
});

describe("buildPaymentString", () => {
  const base = {
    iban: "PL27 1140 2004 0000 3002 0135 5387",
    amountGrosze: 500,
    recipientName: "Szymon",
    title: "Rozliczenie",
  };

  it("emits the 11 pipe-separated fields the ZBP standard expects", () => {
    expect(buildPaymentString(base).split("|")).toHaveLength(11);
  });

  it("puts country, account, name and title in the right slots", () => {
    const fields = buildPaymentString(base).split("|");
    expect(fields[0]).toBe(""); // NIP — not applicable between people
    expect(fields[1]).toBe("PL");
    expect(fields[4]).toBe("27114020040000300201355387");
    expect(fields[6]).toBe("Szymon");
    expect(fields[7]).toBe("Rozliczenie");
  });

  it("writes the amount in grosze, zero-padded to six digits", () => {
    expect(buildPaymentString({ ...base, amountGrosze: 500 }).split("|")[3]).toBe("000500");
    expect(buildPaymentString({ ...base, amountGrosze: 123456 }).split("|")[3]).toBe("123456");
    expect(buildPaymentString({ ...base, amountGrosze: 0 }).split("|")[3]).toBe("000000");
  });

  it("keeps the phone digits only", () => {
    const fields = buildPaymentString({ ...base, phone: "601 234 567" }).split("|");
    expect(fields[2]).toBe("601234567");
  });

  it("strips pipes from free text so the payload cannot be broken", () => {
    const fields = buildPaymentString({
      ...base,
      recipientName: "Sz|ymon",
      title: "a|b|c",
    }).split("|");
    expect(fields).toHaveLength(11);
    expect(fields[6]).toBe("Sz ymon");
    expect(fields[7]).toBe("a b c");
  });

  it("truncates over-long fields rather than emitting an invalid code", () => {
    const fields = buildPaymentString({
      ...base,
      recipientName: "x".repeat(50),
      title: "y".repeat(80),
    }).split("|");
    expect(fields[6]).toHaveLength(20);
    expect(fields[7]).toHaveLength(32);
  });
});

describe("buildQrSvg", () => {
  it("produces a self-contained square SVG", () => {
    const svg = buildQrSvg(buildPaymentString({
      iban: "27114020040000300201355387",
      amountGrosze: 500,
      recipientName: "Szymon",
      title: "Rozliczenie",
    }));
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg.endsWith("</svg>")).toBe(true);
    expect(svg).toContain("<path");
    // Must render offline: the only http here is the SVG namespace, and there
    // are no fetched resources.
    expect(svg).not.toContain("href");
    expect(svg).not.toContain("<image");
    expect(svg.replace('xmlns="http://www.w3.org/2000/svg"', "")).not.toContain("http");
  });
});
