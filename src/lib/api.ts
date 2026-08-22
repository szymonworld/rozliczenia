import type {
  Entry,
  EntryWriteRequest,
  GroupCreateResponse,
  Ledger,
  LedgerSettings,
} from "../../shared/types";

const CACHE_KEY = "rozliczenia:ledger-cache";
const SLUG_KEY = "rozliczenia:group-slug";

/**
 * The group slug from the secret link, remembered per device. Requests without
 * a valid slug are rejected by the API, so this is what gates access.
 */
export function getGroupSlug(): string | null {
  try {
    return localStorage.getItem(SLUG_KEY);
  } catch {
    return null;
  }
}

export function setGroupSlug(slug: string) {
  try {
    localStorage.setItem(SLUG_KEY, slug);
  } catch {
    // Without storage the slug lasts only for this page load.
  }
}
const PENDING_KEY = "rozliczenia:pending-entries";
const UNLOCK_PREFIX = "rozliczenia:unlock:";

/**
 * The unlock token proving this device knew the event's PIN. Kept per slug so
 * switching between events does not mix them up, and sent as a header so it
 * never appears in a URL.
 */
function readUnlockToken(slug: string): string | null {
  try {
    return localStorage.getItem(UNLOCK_PREFIX + slug);
  } catch {
    return null;
  }
}

function unlockHeaders(): Record<string, string> {
  const slug = getGroupSlug();
  const token = slug ? readUnlockToken(slug) : null;
  return token ? { "X-Group-Unlock": token } : {};
}

/** Exchanges the event's PIN for an unlock token and remembers it. */
export async function unlockGroup(pin: string): Promise<void> {
  const slug = getGroupSlug();
  if (!slug) throw new ApiError("Brak linku do grupy");

  const res = await fetch("/api/unlock", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug, pin }),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => null);
    throw new ApiError(detail?.error ?? "Nie udało się odblokować wydarzenia");
  }
  const { token } = (await res.json()) as { token: string };
  try {
    localStorage.setItem(UNLOCK_PREFIX + slug, token);
  } catch {
    // Without storage the unlock lasts only for this page load.
  }
}

export function forgetUnlockToken() {
  const slug = getGroupSlug();
  if (!slug) return;
  try {
    localStorage.removeItem(UNLOCK_PREFIX + slug);
  } catch {
    // ignore
  }
}

export async function setPin(pin: string, currentPin?: string): Promise<Ledger> {
  const ledger = await postEntry({ action: "setPin", pin, currentPin });
  // The old token was signed with the previous secret, so re-unlock straight
  // away rather than locking this device out of the event it just secured.
  await unlockGroup(pin);
  return ledger;
}

export async function clearPin(currentPin: string): Promise<Ledger> {
  const ledger = await postEntry({ action: "clearPin", currentPin });
  forgetUnlockToken();
  return ledger;
}

export function readCachedLedger(): Ledger | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Ledger) : null;
  } catch {
    return null;
  }
}

export function clearCachedLedger() {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // Nothing to clear if storage is unavailable.
  }
}

function writeCachedLedger(ledger: Ledger) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(ledger));
  } catch {
    // storage full or unavailable — ignore, cache is best-effort
  }
}

type PendingRecord = { id: string; submittedAt: string };

function readPending(): PendingRecord[] {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    return raw ? (JSON.parse(raw) as PendingRecord[]) : [];
  } catch {
    return [];
  }
}

function writePending(records: PendingRecord[]) {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify(records));
  } catch {
    // ignore
  }
}

export function markPendingEntry(id: string) {
  const pending = readPending();
  pending.push({ id, submittedAt: new Date().toISOString() });
  writePending(pending);
}

function clearPendingEntry(id: string) {
  writePending(readPending().filter((p) => p.id !== id));
}

/** Checks pending entries against a freshly-fetched ledger; returns ids missing from it. */
export function reconcilePending(ledger: Ledger): string[] {
  const presentIds = new Set(ledger.entries.map((e) => e.id));
  const pending = readPending();
  const missing: string[] = [];
  for (const p of pending) {
    if (presentIds.has(p.id)) {
      clearPendingEntry(p.id);
    } else {
      // Give the write a short grace period before flagging it as unsynced.
      const ageMs = Date.now() - new Date(p.submittedAt).getTime();
      if (ageMs > 15_000) missing.push(p.id);
      if (ageMs > 5 * 60_000) clearPendingEntry(p.id); // stop nagging after a while
    }
  }
  return missing;
}

export class ApiError extends Error {}
/** The slug this device holds is not valid for any group. */
export class GroupNotFoundError extends ApiError {}
/** The event has a PIN and this device has not proved it knows it. */
export class PinRequiredError extends ApiError {}

/**
 * Creates a brand new event on its own secret link. Deliberately does not
 * touch this device's stored slug — the caller decides whether to switch over
 * once the link has been handed out.
 */
export async function createGroup(
  name: string,
  memberNames: string[],
): Promise<GroupCreateResponse> {
  if (!navigator.onLine) {
    throw new ApiError("Brak połączenia z internetem — spróbuj ponownie, gdy będziesz online.");
  }
  const res = await fetch("/api/group", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, memberNames, fromSlug: getGroupSlug() ?? undefined }),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => null);
    throw new ApiError(detail?.error ?? "Nie udało się utworzyć wydarzenia");
  }
  return (await res.json()) as GroupCreateResponse;
}

export async function fetchLedger(): Promise<Ledger> {
  const res = await fetch(`/api/ledger?slug=${encodeURIComponent(getGroupSlug() ?? "")}`, {
    cache: "no-store",
    headers: unlockHeaders(),
  });
  if (res.status === 404) {
    clearCachedLedger();
    throw new GroupNotFoundError("Nie znaleziono grupy");
  }
  if (res.status === 401) {
    // Nothing readable may sit in the cache for a locked event.
    clearCachedLedger();
    throw new PinRequiredError("To wydarzenie jest zabezpieczone PIN-em");
  }
  if (!res.ok) throw new ApiError("Nie udało się pobrać danych z serwera");
  const ledger = (await res.json()) as Ledger;
  writeCachedLedger(ledger);
  return ledger;
}

async function postEntry(body: EntryWriteRequest): Promise<Ledger> {
  if (!navigator.onLine) {
    throw new ApiError("Brak połączenia z internetem — spróbuj ponownie, gdy będziesz online.");
  }
  let res: Response;
  try {
    res = await fetch("/api/entry", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...unlockHeaders() },
      body: JSON.stringify({ ...body, slug: getGroupSlug() ?? "" }),
    });
  } catch {
    throw new ApiError("Brak połączenia z internetem — spróbuj ponownie, gdy będziesz online.");
  }
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    if (res.status === 401 && data?.pinRequired) {
      throw new PinRequiredError(data.error ?? "To wydarzenie jest zabezpieczone PIN-em");
    }
    throw new ApiError(data?.error || "Nie udało się zapisać danych");
  }
  const ledger = (await res.json()) as Ledger;
  writeCachedLedger(ledger);
  return ledger;
}

export async function createEntry(entry: Entry): Promise<Ledger> {
  markPendingEntry(entry.id);
  return postEntry({ action: "create", entry });
}

export async function updateEntry(
  id: string,
  changes: Partial<Entry>,
  editedBy: string,
): Promise<Ledger> {
  return postEntry({ action: "update", id, changes, editedBy });
}

export async function deleteEntry(id: string): Promise<Ledger> {
  return postEntry({ action: "delete", id });
}

export async function restoreEntry(id: string): Promise<Ledger> {
  return postEntry({ action: "restore", id });
}

export async function addMember(name: string): Promise<Ledger> {
  return postEntry({ action: "addMember", name });
}

/** Marks the event finished: fully readable, but no longer writable. */
export async function closeGroup(memberId?: string): Promise<Ledger> {
  return postEntry({ action: "closeGroup", memberId });
}

export async function reopenGroup(memberId?: string): Promise<Ledger> {
  return postEntry({ action: "reopenGroup", memberId });
}

/**
 * Soft-deletes the current event: the ledger stays in storage, but the link
 * stops working. Only the admin console can undo it.
 */
export async function archiveGroup(memberId?: string): Promise<Ledger> {
  return postEntry({ action: "archiveGroup", memberId });
}

/** Forgets the group this device belongs to, so the app falls back to NeedLink. */
export function clearGroupSlug() {
  try {
    localStorage.removeItem(SLUG_KEY);
  } catch {
    // Nothing to clear if storage is unavailable.
  }
}

/** Only possible for someone who appears in no entry at all. */
export async function removeMember(memberId: string): Promise<Ledger> {
  return postEntry({ action: "removeMember", memberId });
}

export async function setMemberHidden(memberId: string, hidden: boolean): Promise<Ledger> {
  return postEntry({ action: "setMemberHidden", memberId, hidden });
}

export async function setMemberPayment(
  memberId: string,
  payment: { blik?: string; iban?: string },
): Promise<Ledger> {
  return postEntry({ action: "setMemberPayment", memberId, payment });
}

export async function renameMember(memberId: string, name: string): Promise<Ledger> {
  return postEntry({ action: "renameMember", memberId, name });
}

export async function confirmSettlement(id: string, memberId: string): Promise<Ledger> {
  return postEntry({ action: "confirmSettlement", id, memberId });
}

export async function rejectSettlement(id: string, memberId: string): Promise<Ledger> {
  return postEntry({ action: "rejectSettlement", id, memberId });
}

export async function setSettings(settings: LedgerSettings): Promise<Ledger> {
  return postEntry({ action: "setSettings", settings });
}
