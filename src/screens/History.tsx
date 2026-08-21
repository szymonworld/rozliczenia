import { useMemo, useState } from "react";
import { Header } from "../components/Header";
import { PullToRefresh } from "../components/PullToRefresh";
import { EntryRow } from "../components/EntryRow";
import { useLedger } from "../context/LedgerContext";
import { deleteEntry, restoreEntry } from "../lib/api";

export function History() {
  const { ledger, refetch, applyLedger } = useLedger();
  const [showDeleted, setShowDeleted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const entries = useMemo(() => {
    if (!ledger) return [];
    const filtered = showDeleted ? ledger.entries : ledger.entries.filter((e) => !e.deletedAt);
    return [...filtered].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  }, [ledger, showDeleted]);

  const handleDelete = async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      const updated = await deleteEntry(id);
      applyLedger(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się usunąć wpisu");
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      const updated = await restoreEntry(id);
      applyLedger(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się przywrócić wpisu");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-neutral-100 dark:bg-neutral-950">
      <Header title="Historia" back />
      <PullToRefresh onRefresh={refetch}>
        <div className="mx-auto w-full max-w-md space-y-3 px-4 pb-10 pt-4">
          {error && (
            <p className="rounded-xl bg-rose-100 px-4 py-2 text-sm text-rose-900 dark:bg-rose-900/40 dark:text-rose-200">
              {error}
            </p>
          )}
          <label className="flex min-h-11 items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
            <input
              type="checkbox"
              checked={showDeleted}
              onChange={(e) => setShowDeleted(e.target.checked)}
              className="h-5 w-5 accent-teal-600"
            />
            pokaż usunięte
          </label>

          {!ledger ? (
            <p className="text-center text-neutral-500 dark:text-neutral-400">Ładowanie…</p>
          ) : entries.length === 0 ? (
            <p className="py-10 text-center text-neutral-500 dark:text-neutral-400">Brak wpisów.</p>
          ) : (
            <ul
              className={`divide-y divide-neutral-200 overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-900 ${busy ? "opacity-60" : ""}`}
            >
              {entries.map((entry) => (
                <EntryRow
                  key={entry.id}
                  entry={entry}
                  members={ledger.members}
                  onDelete={handleDelete}
                  onRestore={handleRestore}
                />
              ))}
            </ul>
          )}
        </div>
      </PullToRefresh>
    </div>
  );
}
