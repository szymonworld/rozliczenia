// Access control.
//
// Every group is the same kind of thing: a ledger behind a generated,
// unguessable slug. There is no privileged "main" group and no allowlist —
// the link *is* the credential, uniformly, so a slug either has the right
// shape or it is refused.
import { randomBytes } from "crypto";

const SLUG_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
const SLUG_LENGTH = 24;
const GENERATED_SLUG = new RegExp(`^[a-z0-9]{${SLUG_LENGTH}}$`);

/**
 * A fresh slug with 24 chars drawn from a 36-symbol alphabet (~124 bits).
 * Bytes landing in the biased tail are rejected rather than folded in.
 */
export function newSlug(): string {
  let out = "";
  while (out.length < SLUG_LENGTH) {
    for (const b of randomBytes(SLUG_LENGTH)) {
      if (b >= 252) continue; // 252 = 7 * 36
      out += SLUG_ALPHABET[b % SLUG_ALPHABET.length];
      if (out.length === SLUG_LENGTH) break;
    }
  }
  return out;
}

/**
 * The storage slug for a URL slug, or null if it is not even shaped like one.
 * Whether it actually exists is storage's problem, not this module's.
 */
export function resolveSlug(slug: unknown): string | null {
  if (typeof slug !== "string") return null;
  return GENERATED_SLUG.test(slug) ? slug : null;
}
