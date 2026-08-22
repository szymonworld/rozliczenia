// Optional per-event PIN.
//
// The secret link already gates an event; a PIN adds a second factor for
// events whose link gets forwarded around. It is deliberately modest: a short
// numeric code, so it is stretched with scrypt and the unlock is rate-limited
// rather than trusted to be strong on its own.
//
// The unlock token is signed with a secret stored *inside the ledger*, so
// changing or clearing the PIN rotates that secret and every previously
// unlocked device has to enter the new code.
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { PIN_MAX_LENGTH, PIN_MIN_LENGTH } from "../../shared/types.js";
import type { Ledger, PinConfig } from "../../shared/types.js";

const KEY_LENGTH = 32;
const UNLOCK_TTL_MS = 30 * 24 * 60 * 60 * 1000; // a month per device

export function isValidPinFormat(pin: unknown): pin is string {
  return (
    typeof pin === "string" &&
    pin.length >= PIN_MIN_LENGTH &&
    pin.length <= PIN_MAX_LENGTH &&
    /^[0-9]+$/.test(pin)
  );
}

function derive(pin: string, salt: string): Buffer {
  return scryptSync(pin, salt, KEY_LENGTH);
}

export function makePinConfig(pin: string): PinConfig {
  const salt = randomBytes(16).toString("hex");
  return {
    salt,
    hash: derive(pin, salt).toString("hex"),
    // Rotated with every PIN change, which is what invalidates old unlocks.
    secret: randomBytes(32).toString("hex"),
  };
}

export function pinMatches(pin: unknown, config: PinConfig): boolean {
  if (typeof pin !== "string" || pin.length === 0) return false;
  const expected = Buffer.from(config.hash, "hex");
  const actual = derive(pin, config.salt);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

function sign(payload: string, secret: string): string {
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

/** `<base64url payload>.<hmac>` — proof this device knew the PIN. */
export function issueUnlockToken(slug: string, config: PinConfig): string {
  const payload = Buffer.from(
    JSON.stringify({ slug, exp: Date.now() + UNLOCK_TTL_MS }),
  ).toString("base64url");
  return `${payload}.${sign(payload, config.secret)}`;
}

export function unlockTokenValid(token: unknown, slug: string, config: PinConfig): boolean {
  if (typeof token !== "string") return false;

  const dot = token.lastIndexOf(".");
  if (dot <= 0) return false;
  const payload = token.slice(0, dot);
  const supplied = token.slice(dot + 1);

  const expected = sign(payload, config.secret);
  if (supplied.length !== expected.length) return false;
  if (!timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) return false;

  try {
    const claims = JSON.parse(Buffer.from(payload, "base64url").toString()) as {
      slug?: string;
      exp?: number;
    };
    // The slug is bound into the token so an unlock for one event is useless
    // against another.
    return claims.slug === slug && typeof claims.exp === "number" && Date.now() < claims.exp;
  } catch {
    return false;
  }
}

/**
 * The client must never see the PIN material. Everything that returns a
 * ledger over the wire goes through here first.
 */
export function withoutPinSecrets(ledger: Ledger): Ledger {
  if (!ledger.pin) return ledger;
  const { pin: _pin, ...rest } = ledger;
  return { ...rest, pinEnabled: true };
}
