// Access control for the group. Several URL slugs may grant access, and they
// all resolve to the same stored ledger — that is what lets us hand out a new
// secret link without splitting the data or locking anyone out mid-migration.
//
// Configure with ROZLICZENIA_SLUGS (comma-separated). When unset we fall back
// to the original slug so an env misconfiguration can never lock everyone out.
import { GROUP_SLUG } from "../../shared/types.js";

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

/** Returns the storage slug for a URL slug, or null if the slug is not valid. */
export function resolveSlug(slug: unknown): string | null {
  if (typeof slug !== "string" || slug.length === 0) return null;
  return allowedSlugs().includes(slug) ? GROUP_SLUG : null;
}
