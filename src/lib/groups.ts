// Every group this device has opened, so coming back does not mean hunting
// for the link again. Purely local: the server has no idea which groups a
// given phone knows about, and the link is still the only credential.

const KEY = "rozliczenia:known-groups";
const MAX_GROUPS = 30;

export type KnownGroup = {
  slug: string;
  name: string;
  /** ISO timestamp, used to put the most recently used group first. */
  lastOpenedAt: string;
};

function read(): KnownGroup[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Anything malformed is dropped rather than crashing the app on boot.
    return parsed.filter(
      (g): g is KnownGroup =>
        typeof g === "object" &&
        g !== null &&
        typeof (g as KnownGroup).slug === "string" &&
        typeof (g as KnownGroup).name === "string",
    );
  } catch {
    return [];
  }
}

function write(groups: KnownGroup[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(groups.slice(0, MAX_GROUPS)));
  } catch {
    // Storage full or unavailable — the app still works, it just forgets.
  }
}

/** Most recently opened first. */
export function listKnownGroups(): KnownGroup[] {
  return read().sort((a, b) => (b.lastOpenedAt ?? "").localeCompare(a.lastOpenedAt ?? ""));
}

/**
 * Records a group as known, or refreshes its name and timestamp. Called after
 * a successful fetch, so a renamed group updates here too and an archived one
 * (which no longer fetches) keeps its last known name until forgotten.
 */
export function rememberGroup(slug: string, name: string) {
  if (!slug) return;
  const groups = read().filter((g) => g.slug !== slug);
  groups.unshift({ slug, name, lastOpenedAt: new Date().toISOString() });
  write(groups);
}

export function forgetGroup(slug: string) {
  write(read().filter((g) => g.slug !== slug));
}
