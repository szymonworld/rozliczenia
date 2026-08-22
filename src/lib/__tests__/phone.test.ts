import { describe, expect, it } from "vitest";
import { formatPhoneDisplay, phoneDigitsOnly } from "../phone";

describe("phoneDigitsOnly", () => {
  it("strips spaces, dashes and anything else non-numeric", () => {
    expect(phoneDigitsOnly("600 123 456")).toBe("600123456");
    expect(phoneDigitsOnly("600-123-456")).toBe("600123456");
    expect(phoneDigitsOnly("+48 600 123 456")).toBe("48600123456");
  });

  it("leaves an already-clean number alone", () => {
    expect(phoneDigitsOnly("600123456")).toBe("600123456");
  });
});

describe("formatPhoneDisplay", () => {
  it("groups a Polish mobile number into threes", () => {
    expect(formatPhoneDisplay("600123456")).toBe("600-123-456");
  });

  it("normalises whatever separators were typed in", () => {
    expect(formatPhoneDisplay("600 123 456")).toBe("600-123-456");
    expect(formatPhoneDisplay("600-123-456")).toBe("600-123-456");
  });

  it("does not lose digits when the count is not a multiple of three", () => {
    expect(formatPhoneDisplay("6001234")).toBe("600-123-4");
    expect(phoneDigitsOnly(formatPhoneDisplay("6001234"))).toBe("6001234");
  });

  it("handles an empty value without throwing", () => {
    expect(formatPhoneDisplay("")).toBe("");
  });

  // The whole point of the split: what is shown is never what is copied.
  it("round-trips back to the copyable form", () => {
    const stored = "600 123 456";
    expect(phoneDigitsOnly(formatPhoneDisplay(stored))).toBe(phoneDigitsOnly(stored));
  });
});
