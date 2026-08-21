// Polish "2D barcode" payment standard (Związek Banków Polskich recommendation).
// Scanning one of these in a Polish banking app pre-fills a transfer.
//
// Pipe-separated, 11 fields:
//   NIP | kraj | telefon | kwota(grosze) | rachunek | rezerwa | odbiorca | tytuł | r1 | r2 | r3
import qrcode from "qrcode-generator";

/** Strips spaces and a leading PL so the account is 26 digits, as the standard wants. */
export function normaliseIban(iban: string): string {
  return iban.replace(/\s+/g, "").replace(/^PL/i, "");
}

export function isUsableIban(iban: string | undefined): boolean {
  if (!iban) return false;
  return /^\d{26}$/.test(normaliseIban(iban));
}

export function buildPaymentString({
  iban,
  amountGrosze,
  recipientName,
  title,
  phone,
}: {
  iban: string;
  amountGrosze: number;
  recipientName: string;
  title: string;
  phone?: string;
}): string {
  const account = normaliseIban(iban);
  // Amount is grosze, zero-padded to six digits per the recommendation.
  const amount = String(Math.max(0, Math.round(amountGrosze))).padStart(6, "0");
  // The separator is structural — it must not appear inside a field.
  const clean = (v: string, max: number) => v.replace(/\|/g, " ").trim().slice(0, max);

  return [
    "", // NIP — not applicable between people
    "PL",
    clean(phone?.replace(/\s+/g, "") ?? "", 20),
    amount,
    account,
    "", // rezerwa
    clean(recipientName, 20),
    clean(title, 32),
    "",
    "",
    "",
  ].join("|");
}

/** Renders the payload as an inline SVG string, sized to fit its container. */
export function buildQrSvg(payload: string): string {
  const qr = qrcode(0, "M");
  qr.addData(payload);
  qr.make();

  const count = qr.getModuleCount();
  const cells: string[] = [];
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (qr.isDark(row, col)) cells.push(`M${col} ${row}h1v1h-1z`);
    }
  }

  // currentColor lets the QR follow the theme's ink colour.
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 ${count + 2} ${count + 2}"`,
    ` shape-rendering="crispEdges" width="100%" height="100%" role="img"`,
    ` aria-label="Kod QR do przelewu">`,
    `<rect x="-1" y="-1" width="${count + 2}" height="${count + 2}" fill="#ffffff"/>`,
    `<path d="${cells.join("")}" fill="#000000"/>`,
    `</svg>`,
  ].join("");
}
