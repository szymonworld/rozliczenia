// Integer-grosze money helpers. Never use floats for money math.

const formatter = new Intl.NumberFormat("pl-PL", {
  style: "currency",
  currency: "PLN",
});

export function formatGrosze(grosze: number): string {
  return formatter.format(grosze / 100);
}

/** Format grosze as a plain PLN number string for editing inputs, e.g. 1234 -> "12,34". */
export function groszeToInputValue(grosze: number): string {
  const sign = grosze < 0 ? "-" : "";
  const abs = Math.abs(grosze);
  const zl = Math.floor(abs / 100);
  const gr = abs % 100;
  return `${sign}${zl},${gr.toString().padStart(2, "0")}`;
}

/**
 * Parse a user-entered PLN amount (accepts comma or dot decimal separator,
 * spaces as thousands separators) into integer grosze. Returns null if invalid.
 */
export function parsePlnToGrosze(input: string): number | null {
  if (!input) return null;
  const cleaned = input.trim().replace(/\s/g, "").replace(",", ".");
  if (!/^-?\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const value = Number(cleaned);
  if (Number.isNaN(value)) return null;
  return Math.round(value * 100);
}

/**
 * Split `totalGrosze` equally among `participantIds`, assigning the leftover
 * remainder grosze to `payerId` (or the first participant if the payer isn't
 * among them) so shares always sum exactly to the total.
 */
export function splitEqual(
  totalGrosze: number,
  participantIds: string[],
  payerId: string,
): { memberId: string; amountGrosze: number }[] {
  const n = participantIds.length;
  if (n === 0) return [];
  const base = Math.floor(totalGrosze / n);
  let remainder = totalGrosze - base * n;

  const shares = participantIds.map((memberId) => ({ memberId, amountGrosze: base }));

  // Assign remainder grosze to the payer first, then in order, one grosz at a time.
  const payerIndex = shares.findIndex((s) => s.memberId === payerId);
  let i = payerIndex >= 0 ? payerIndex : 0;
  while (remainder > 0) {
    shares[i].amountGrosze += 1;
    remainder -= 1;
    i = (i + 1) % n;
  }

  return shares;
}
