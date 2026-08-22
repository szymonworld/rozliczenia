// Access control. Two kinds of slug reach this module:
//
//  * the original group's links, listed in ROZLICZENIA_SLUGS. Several may be
//    live at once and they all resolve to the same stored ledger — that is
//    what lets us hand out a new secret link without splitting the data.
//  * events created in-app, which own a generated slug and their own ledger.
//
// For both, the unguessable link *is* the credential, so a generated slug has
// to be long enough that guessing one is hopeless.
import { randomBytes } from "crypto";
import { GROUP_SLUG } from "../../shared/types.js";

const SLUG_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
const SLUG_LENGTH = 24;
const GENERATED_SLUG = new RegExp(`^[a-z0-9]{${SLUG_LENGTH}}$`);

function allowedSlugs(): string[] {
  const raw = process.env.ROZLICZENIA_SLUGS;
  const configured = raw
    ? raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  return configured.length > 0 ? configured : [GROUP_SLUG];
}

export function isGeneratedSlug(slug: string): boolean {
  return GENERATED_SLUG.test(slug);
}

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
 * The storage slug for a URL slug, or null if the slug is not valid. A
 * generated slug maps to itself; whether it actually exists is storage's
 * problem, not this module's.
 */
export function resolveSlug(slug: unknown): string | null {
  if (typeof slug !== "string" || slug.length === 0) return null;
  if (allowedSlugs().includes(slug)) return GROUP_SLUG;
  return isGeneratedSlug(slug) ? slug : null;
}
