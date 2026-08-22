/**
 * Nudges for someone who owes you money. Picked at random so the tenth
 * reminder does not read like the first — the same sentence twice starts to
 * feel passive-aggressive, whereas variety keeps it light.
 *
 * Deliberately warm and jokey rather than stern: these go to friends, and the
 * app has no idea whether the debt is a day or a month old.
 *
 * This is the "sent to someone else" voice — written as if a creditor is
 * addressing the debtor by name. It is a different voice from
 * `SELF_TEMPLATES` below (see that constant's comment): reusing one pool for
 * both directions read backwards half the time ("Twoje 500 zł tęskni za
 * *moim* kontem" makes no sense as your own balance-card caption — whose
 * account is "moim" then?).
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

/**
 * The "talking to yourself" voice — shown as the balance card's own caption
 * when you're the one who owes. No name placeholder: the card already shows
 * whose balance this is (avatar + name next to the amount), so repeating the
 * name in the caption right below it would just echo. No amount either, for
 * the same reason: the card's headline figure sits right above this caption,
 * so restating it reads as a copy-paste error rather than emphasis. No emoji
 * either — this renders as the card's small muted subtitle alongside plain
 * captions like "Do 2 osób", and emoji there reads as visually noisy rather
 * than playful.
 */
const SELF_TEMPLATES: string[] = [
  "Nadal czeka, żeby zniknąć z listy.",
  "Dobry moment, żeby to zamknąć.",
  "Samo się nie przeleje.",
  "Bez pośpiechu, ale przydałoby się oddać.",
  "Wystarczy jeden przelew i znika z rozliczeń.",
  "Czeka na swoje pięć minut wolności.",
  "Może dziś? Nadal tam jest.",
  "Krótkie przypomnienie: wciąż czeka na przelew.",
];

/** A random self-nudge for the balance card caption when you're in the red. */
export function buildSelfReminderLine(): string {
  return SELF_TEMPLATES[Math.floor(Math.random() * SELF_TEMPLATES.length)];
}

export const SELF_REMINDER_TEMPLATE_COUNT = SELF_TEMPLATES.length;
export const selfReminderTemplatesForTest = SELF_TEMPLATES;
