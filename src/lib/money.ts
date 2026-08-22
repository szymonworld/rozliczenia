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

export type WeightedParticipant = { memberId: string; weight: number };

/**
 * Split `totalGrosze` in proportion to each participant's weight — weight 2
 * means "counts as two people", for someone bringing a partner or eating twice
 * as much. Everyone floors first, then the leftover grosze go to the payer and
 * round-robin from there, so shares always sum exactly to the total.
 *
 * Non-positive weights are dropped rather than producing negative shares.
 */
export function splitByWeights(
  totalGrosze: number,
  participants: WeightedParticipant[],
  payerId: string,
): { memberId: string; amountGrosze: number }[] {
  const usable = participants.filter((p) => p.weight > 0);
  const totalWeight = usable.reduce((sum, p) => sum + p.weight, 0);
  if (usable.length === 0 || totalWeight <= 0) return [];

  const shares = usable.map((p) => ({
    memberId: p.memberId,
    amountGrosze: Math.floor((totalGrosze * p.weight) / totalWeight),
  }));

  let remainder = totalGrosze - shares.reduce((sum, s) => sum + s.amountGrosze, 0);
  const payerIndex = shares.findIndex((s) => s.memberId === payerId);
  let i = payerIndex >= 0 ? payerIndex : 0;
  while (remainder > 0) {
    shares[i].amountGrosze += 1;
    remainder -= 1;
    i = (i + 1) % shares.length;
  }

  return shares;
}

/**
 * Split `totalGrosze` equally — the everyone-weighs-one case of
 * {@link splitByWeights}, remainder handling and all.
 */
export function splitEqual(
  totalGrosze: number,
  participantIds: string[],
  payerId: string,
): { memberId: string; amountGrosze: number }[] {
  return splitByWeights(
    totalGrosze,
    participantIds.map((memberId) => ({ memberId, weight: 1 })),
    payerId,
  );
}
