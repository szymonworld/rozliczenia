/**
 * Nudges for someone who owes you money. Picked at random so the tenth
 * reminder does not read like the first — the same sentence twice starts to
 * feel passive-aggressive, whereas variety keeps it light.
 *
 * Deliberately warm and jokey rather than stern: these go to friends, and the
 * app has no idea whether the debt is a day or a month old.
 */
const TEMPLATES: ((name: string, amount: string) => string)[] = [
  (n, a) => `Cześć ${n}! Twoje ${a} tęskni za moim kontem 😄`,
  (n, a) => `${n}, ${a} samo się nie przeleje 😉`,
  (n, a) => `Puk puk, ${n}! Tu ${a}. Otworzysz? 🚪`,
  (n, a) => `${n}, przypominam się delikatnie w sprawie ${a} 🙂`,
  (n, a) => `Mały remanent: ${n} → ${a}. Z góry dzięki!`,
  (n, a) => `${n}, ${a} czeka na swoje pięć minut sławy 🌟`,
  (n, a) => `${n}, bez pośpiechu — ale ${a} by się przydało 😅`,
  (n, a) => `${n}! Kwota ${a} melduje gotowość do przelewu 🫡`,
  (n, a) => `Podobno ${a} najlepiej smakuje przelane. Co ty na to, ${n}? 🍽️`,
  (n, a) => `${n}, jeden BLIK i po sprawie — ${a} 📲`,
  (n, a) => `Twoje ${a} zaczyna zapuszczać korzenie, ${n} 🌱`,
  (n, a) => `${n}, kończymy rozliczenia? Zostało ${a} 🏁`,
];

/** A random nudge, signed. `me` is who is asking. */
export function buildReminderText(name: string, amount: string, me: string): string {
  const template = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)];
  return `${template(name, amount)} — ${me}`;
}

/** Exposed so a test can assert every template renders both placeholders. */
export const REMINDER_TEMPLATE_COUNT = TEMPLATES.length;
export const reminderTemplatesForTest = TEMPLATES;
