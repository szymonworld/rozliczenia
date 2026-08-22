// Cosmetic formatting for a BLIK phone number. Never touches what gets
// stored, copied, or encoded into a QR payload — those all want the plain
// digit string, not something a human finds easier to read.

/** Strips everything but digits — the form actually used for copying, QR
 * payloads, and anywhere else the number has to be machine-readable. */
export function phoneDigitsOnly(raw: string): string {
  return raw.replace(/\D/g, "");
}

/** Groups digits into 3s for reading, e.g. "600123456" -> "600-123-456". */
export function formatPhoneDisplay(raw: string): string {
  const digits = phoneDigitsOnly(raw);
  return digits.match(/.{1,3}/g)?.join("-") ?? digits;
}
