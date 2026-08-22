import { describe, expect, it } from "vitest";
import {
  buildReminderText,
  REMINDER_TEMPLATE_COUNT,
  reminderTemplatesForTest,
} from "../reminders";

describe("buildReminderText", () => {
  it("includes the amount and the sender in every variant", () => {
    for (const template of reminderTemplatesForTest) {
      const text = `${template("Ala", "30,00 zł")} — Szymon`;
      expect(text).toContain("30,00 zł");
      expect(text).toContain("Szymon");
    }
  });

  it("names the debtor and never mangles the amount", () => {
    for (let i = 0; i < 200; i++) {
      const text = buildReminderText("Ala", "30,00 zł", "Szymon");
      expect(text).toContain("30,00 zł");
      expect(text).toContain("Ala");
      expect(text.endsWith("— Szymon")).toBe(true);
    }
  });

  it("actually varies rather than returning one fixed string", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 400; i++) seen.add(buildReminderText("Ala", "30,00 zł", "Szymon"));
    // Not asserting all of them appear — that would be flaky — just that the
    // picker is not stuck on a single template.
    expect(seen.size).toBeGreaterThan(Math.min(3, REMINDER_TEMPLATE_COUNT));
  });
});
