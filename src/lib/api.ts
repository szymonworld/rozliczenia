import type { Entry, EntryWriteRequest, Ledger } from "../../shared/types";

const CACHE_KEY = "rozliczenia:ledger-cache";
const PENDING_KEY = "rozliczenia:pending-entries";

export function readCachedLedger(): Ledger | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Ledger) : null;
  } catch {
    return null;
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

export async function fetchLedger(): Promise<Ledger> {
  const res = await fetch("/api/ledger", { cache: "no-store" });
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
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new ApiError("Brak połączenia z internetem — spróbuj ponownie, gdy będziesz online.");
  }
  if (!res.ok) {
    const data = await res.json().catch(() => null);
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
