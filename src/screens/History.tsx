import { useMemo, useState } from "react";
import { Header } from "../components/Header";
import { Banner } from "../components/Banner";
import { Icon } from "../components/Icon";
import { PullToRefresh } from "../components/PullToRefresh";
import { EntryRow } from "../components/EntryRow";
import { useLedger } from "../context/LedgerContext";
import { useToast } from "../context/ToastContext";
import { deleteEntry, restoreEntry } from "../lib/api";
import { isClosed } from "../lib/ledgerView";
import type { Entry, Ledger, Member } from "../../shared/types";

/** "Dziś" / "Wczoraj" / "21 sierpnia" for a yyyy-mm-dd date string. */
function dayLabel(date: string): string {
  const d = new Date(`${date}T00:00:00`);
  if (Number.isNaN(d.getTime())) return date;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today.getTime() - d.getTime()) / 86_400_000);

  if (diffDays === 0) return "Dziś";
  if (diffDays === 1) return "Wczoraj";

  return d.toLocaleDateString("pl-PL", {
    day: "numeric",
    month: "long",
    ...(d.getFullYear() !== today.getFullYear() ? { year: "numeric" } : {}),
  });
}

/** Free-text match over description, people involved and amount. */
function matches(entry: Entry, members: Member[], query: string): boolean {
  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? "";
  const haystack =
    entry.type === "expense"
      ? [entry.description, nameOf(entry.payerId), ...entry.shares.map((s) => nameOf(s.memberId))]
      : ["rozliczenie", nameOf(entry.fromId), nameOf(entry.toId)];
  haystack.push((entry.amountGrosze / 100).toFixed(2));

  return haystack.join(" ").toLocaleLowerCase("pl-PL").includes(query);
}

export function History() {
  const { ledger, refetch, applyLedger } = useLedger();
  const isClosedEvent = isClosed(ledger);
  const { showToast } = useToast();
  const [showDeleted, setShowDeleted] = useState(false);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const groups = useMemo(() => {
    if (!ledger) return [];
    let filtered = showDeleted ? ledger.entries : ledger.entries.filter((e) => !e.deletedAt);

    const q = query.trim().toLocaleLowerCase("pl-PL");
    if (q) filtered = filtered.filter((e) => matches(e, ledger.members, q));

    const sorted = [...filtered].sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return a.createdAt < b.createdAt ? 1 : -1;
    });

    const out: { date: string; entries: Entry[] }[] = [];
    for (const entry of sorted) {
      const last = out[out.length - 1];
      if (last && last.date === entry.date) last.entries.push(entry);
      else out.push({ date: entry.date, entries: [entry] });
    }
    return out;
  }, [ledger, showDeleted, query]);

  const run = async (fn: () => Promise<Ledger>, fallback: string) => {
    setBusy(true);
    setError(null);
    try {
      applyLedger(await fn());
    } catch (err) {
      setError(err instanceof Error ? err.message : fallback);
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = (id: string) =>
    run(() => restoreEntry(id), "Nie udało się przywrócić wpisu");

  const handleDelete = async (id: string) => {
    await run(() => deleteEntry(id), "Nie udało się usunąć wpisu");
    showToast("Wpis usunięty", { label: "Cofnij", onAction: () => void handleRestore(id) });
  };

  return (
    <div className="app-shell bg-bg">
      <Header
        title="Historia"
        back
        right={
          <button
            onClick={() => setShowDeleted((v) => !v)}
            aria-pressed={showDeleted}
            className={`press mr-1 flex h-11 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium ${
              showDeleted ? "bg-accent-soft text-accent" : "text-muted"
            }`}
          >
            <Icon name="trash" className="h-4 w-4" />
            Usunięte
          </button>
        }
      />
      <PullToRefresh onRefresh={refetch}>
        <div
          style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom))" }}
          className="stagger mx-auto w-full max-w-md space-y-5 px-4 pt-4"
        >
          {error && (
            <Banner tone="neg" icon="alert">
              {error}
            </Banner>
          )}

          <div className="relative">
            <Icon
              name="search"
              className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Szukaj opisu, osoby lub kwoty"
              aria-label="Szukaj wpisów"
              className="min-h-12 w-full rounded-2xl border border-line bg-surface py-2.5 pl-11 pr-4 text-[15px] text-ink outline-none transition-colors placeholder:text-muted focus:border-accent focus:ring-4 focus:ring-accent/15"
            />
          </div>

          {!ledger ? (
            <div className="space-y-3">
              <div className="h-20 animate-pulse rounded-3xl bg-surface-2" />
              <div className="h-20 animate-pulse rounded-3xl bg-surface-2" />
            </div>
          ) : groups.length === 0 ? (
            <div className="card flex flex-col items-center gap-2 rounded-3xl px-6 py-12 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-muted">
                <Icon name="receipt" className="h-6 w-6" />
              </span>
              <p className="font-medium text-ink">
                {query.trim() ? "Nic nie znaleziono" : "Brak wpisów"}
              </p>
              <p className="text-sm text-muted">
                {query.trim()
                  ? "Spróbuj innej frazy."
                  : "Dodaj pierwszy wydatek przyciskiem +."}
              </p>
            </div>
          ) : (
            groups.map((group) => (
              <section key={group.date} className={busy ? "opacity-60" : ""}>
                <h2 className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-[0.06em] text-muted">
                  {dayLabel(group.date)}
                </h2>
                <ul className="stagger-rows card divide-y divide-line overflow-hidden rounded-3xl">
                  {group.entries.map((entry) => (
                    <EntryRow
                      key={entry.id}
                      entry={entry}
                      members={ledger.members}
                      readOnly={isClosedEvent}
                      onDelete={handleDelete}
                      onRestore={handleRestore}
                    />
                  ))}
                </ul>
              </section>
            ))
          )}
        </div>
      </PullToRefresh>
    </div>
  );
}
