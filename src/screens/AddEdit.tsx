import { useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ulid } from "ulid";
import { Header } from "../components/Header";
import { Chip } from "../components/Chip";
import { useIdentity } from "../context/IdentityContext";
import { useLedger } from "../context/LedgerContext";
import { createEntry, updateEntry } from "../lib/api";
import { groszeToInputValue, parsePlnToGrosze, splitEqual } from "../lib/money";
import type { Entry, Share } from "../../shared/types";
import type { SuggestedTransfer } from "../lib/balances";

type EntryType = "expense" | "settlement";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function AddEdit() {
  const { ledger, applyLedger } = useLedger();
  const { whoAmI } = useIdentity();
  const navigate = useNavigate();
  const location = useLocation();
  const { id } = useParams<{ id: string }>();

  const editingEntry = useMemo(
    () => (id ? ledger?.entries.find((e) => e.id === id) : undefined),
    [id, ledger],
  );
  const prefillSettlement = (location.state as { settlement?: SuggestedTransfer } | null)
    ?.settlement;

  const [entryType, setEntryType] = useState<EntryType>(
    editingEntry?.type ?? (prefillSettlement ? "settlement" : "expense"),
  );

  // --- expense fields ---
  const initialExpense = editingEntry?.type === "expense" ? editingEntry : undefined;
  const [amountInput, setAmountInput] = useState(
    initialExpense
      ? groszeToInputValue(initialExpense.amountGrosze)
      : prefillSettlement
        ? groszeToInputValue(prefillSettlement.amountGrosze)
        : "",
  );
  const [description, setDescription] = useState(initialExpense?.description ?? "");
  const [payerId, setPayerId] = useState(initialExpense?.payerId ?? whoAmI ?? "");
  const [date, setDate] = useState(editingEntry?.date ?? todayIso());
  const allMembers = ledger?.members ?? [];
  const selectableMembers = allMembers.filter(
    (m) => !m.hidden || initialExpense?.shares.some((s) => s.memberId === m.id) || m.id === initialExpense?.payerId,
  );
  const [participantIds, setParticipantIds] = useState<string[]>(
    initialExpense
      ? initialExpense.shares.map((s) => s.memberId)
      : selectableMembers.filter((m) => !m.hidden).map((m) => m.id),
  );
  const [exactSplit, setExactSplit] = useState(false);
  const [exactAmounts, setExactAmounts] = useState<Record<string, string>>(() => {
    if (initialExpense) {
      const map: Record<string, string> = {};
      for (const s of initialExpense.shares) map[s.memberId] = groszeToInputValue(s.amountGrosze);
      return map;
    }
    return {};
  });

  // --- settlement fields ---
  const initialSettlement = editingEntry?.type === "settlement" ? editingEntry : undefined;
  const [fromId, setFromId] = useState(
    initialSettlement?.fromId ?? prefillSettlement?.fromId ?? whoAmI ?? "",
  );
  const [toId, setToId] = useState(initialSettlement?.toId ?? prefillSettlement?.toId ?? "");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalGrosze = parsePlnToGrosze(amountInput);

  const toggleParticipant = (memberId: string) => {
    setParticipantIds((prev) =>
      prev.includes(memberId) ? prev.filter((id2) => id2 !== memberId) : [...prev, memberId],
    );
  };

  const exactSum = participantIds.reduce((sum, mid) => {
    const g = parsePlnToGrosze(exactAmounts[mid] ?? "");
    return sum + (g ?? 0);
  }, 0);
  const exactRemaining = (totalGrosze ?? 0) - exactSum;

  const canSubmitExpense =
    totalGrosze !== null &&
    totalGrosze > 0 &&
    description.trim().length > 0 &&
    payerId &&
    participantIds.length > 0 &&
    (!exactSplit || exactRemaining === 0);

  const canSubmitSettlement =
    totalGrosze !== null && totalGrosze > 0 && fromId && toId && fromId !== toId;

  const buildShares = (): Share[] => {
    if (totalGrosze === null) return [];
    if (exactSplit) {
      return participantIds.map((memberId) => ({
        memberId,
        amountGrosze: parsePlnToGrosze(exactAmounts[memberId] ?? "0") ?? 0,
      }));
    }
    return splitEqual(totalGrosze, participantIds, payerId);
  };

  const handleSubmit = async () => {
    if (!whoAmI || !ledger) return;
    setSubmitting(true);
    setError(null);
    try {
      if (entryType === "expense") {
        if (totalGrosze === null) throw new Error("Nieprawidłowa kwota");
        const shares = buildShares();
        if (editingEntry) {
          const changes: Partial<Entry> = {
            type: "expense",
            description: description.trim(),
            amountGrosze: totalGrosze,
            payerId,
            date,
            shares,
          };
          const updated = await updateEntry(editingEntry.id, changes, whoAmI);
          applyLedger(updated);
        } else {
          const entry: Entry = {
            id: ulid(),
            type: "expense",
            description: description.trim(),
            amountGrosze: totalGrosze,
            payerId,
            date,
            shares,
            createdAt: new Date().toISOString(),
            createdBy: whoAmI,
          };
          const updated = await createEntry(entry);
          applyLedger(updated);
        }
      } else {
        if (totalGrosze === null) throw new Error("Nieprawidłowa kwota");
        if (editingEntry) {
          const changes: Partial<Entry> = {
            type: "settlement",
            fromId,
            toId,
            amountGrosze: totalGrosze,
            date,
          };
          const updated = await updateEntry(editingEntry.id, changes, whoAmI);
          applyLedger(updated);
        } else {
          const entry: Entry = {
            id: ulid(),
            type: "settlement",
            fromId,
            toId,
            amountGrosze: totalGrosze,
            date,
            createdAt: new Date().toISOString(),
            createdBy: whoAmI,
          };
          const updated = await createEntry(entry);
          applyLedger(updated);
        }
      }
      navigate(-1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się zapisać wpisu");
    } finally {
      setSubmitting(false);
    }
  };

  if (!ledger || !whoAmI) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-neutral-500 dark:text-neutral-400">
        Ładowanie…
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-neutral-100 dark:bg-neutral-950">
      <Header title={editingEntry ? "Edytuj wpis" : "Dodaj wpis"} back />
      <div className="mx-auto w-full max-w-md space-y-5 px-4 pb-32 pt-4">
        {!editingEntry && (
          <div className="flex rounded-xl border border-neutral-300 bg-white p-1 dark:border-neutral-700 dark:bg-neutral-900">
            <button
              onClick={() => setEntryType("expense")}
              className={`min-h-11 flex-1 rounded-lg text-sm font-medium ${
                entryType === "expense"
                  ? "bg-teal-600 text-white dark:bg-teal-500"
                  : "text-neutral-600 dark:text-neutral-300"
              }`}
            >
              Wydatek
            </button>
            <button
              onClick={() => setEntryType("settlement")}
              className={`min-h-11 flex-1 rounded-lg text-sm font-medium ${
                entryType === "settlement"
                  ? "bg-teal-600 text-white dark:bg-teal-500"
                  : "text-neutral-600 dark:text-neutral-300"
              }`}
            >
              Rozliczenie
            </button>
          </div>
        )}

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Kwota (zł)
          </label>
          <input
            inputMode="decimal"
            value={amountInput}
            onChange={(e) => setAmountInput(e.target.value)}
            placeholder="0,00"
            className="min-h-11 w-full rounded-xl border border-neutral-300 bg-white px-4 py-2 text-2xl font-semibold text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
            style={{ fontVariantNumeric: "tabular-nums" }}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
            Data
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="min-h-11 w-full rounded-xl border border-neutral-300 bg-white px-4 py-2 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
          />
        </div>

        {entryType === "expense" ? (
          <>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Opis
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="np. zakupy, piwo, bilety"
                className="min-h-11 w-full rounded-xl border border-neutral-300 bg-white px-4 py-2 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Kto zapłacił
              </label>
              <select
                value={payerId}
                onChange={(e) => setPayerId(e.target.value)}
                className="min-h-11 w-full rounded-xl border border-neutral-300 bg-white px-4 py-2 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
              >
                {selectableMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Uczestnicy
              </label>
              <div className="flex flex-wrap gap-2">
                {selectableMembers.map((m) => (
                  <Chip
                    key={m.id}
                    label={m.name}
                    selected={participantIds.includes(m.id)}
                    onClick={() => toggleParticipant(m.id)}
                  />
                ))}
              </div>
            </div>

            <label className="flex min-h-11 items-center gap-2 text-sm text-neutral-600 dark:text-neutral-300">
              <input
                type="checkbox"
                checked={exactSplit}
                onChange={(e) => setExactSplit(e.target.checked)}
                className="h-5 w-5 accent-teal-600"
              />
              podziel dokładnie
            </label>

            {exactSplit && (
              <div className="space-y-2 rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
                {participantIds.map((mid) => (
                  <div key={mid} className="flex items-center justify-between gap-3">
                    <span className="text-sm text-neutral-700 dark:text-neutral-300">
                      {allMembers.find((m) => m.id === mid)?.name}
                    </span>
                    <input
                      inputMode="decimal"
                      value={exactAmounts[mid] ?? ""}
                      onChange={(e) =>
                        setExactAmounts((prev) => ({ ...prev, [mid]: e.target.value }))
                      }
                      placeholder="0,00"
                      className="min-h-11 w-28 rounded-lg border border-neutral-300 bg-white px-3 py-1 text-right dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-50"
                      style={{ fontVariantNumeric: "tabular-nums" }}
                    />
                  </div>
                ))}
                <p
                  className={`text-right text-sm font-medium ${
                    exactRemaining === 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-rose-600 dark:text-rose-400"
                  }`}
                >
                  {exactRemaining === 0
                    ? "Kwoty się zgadzają"
                    : exactRemaining > 0
                      ? `Pozostało: ${(exactRemaining / 100).toFixed(2)} zł`
                      : `Za dużo o: ${(-exactRemaining / 100).toFixed(2)} zł`}
                </p>
              </div>
            )}
          </>
        ) : (
          <>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Od kogo
              </label>
              <select
                value={fromId}
                onChange={(e) => setFromId(e.target.value)}
                className="min-h-11 w-full rounded-xl border border-neutral-300 bg-white px-4 py-2 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
              >
                {allMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-neutral-700 dark:text-neutral-300">
                Do kogo
              </label>
              <select
                value={toId}
                onChange={(e) => setToId(e.target.value)}
                className="min-h-11 w-full rounded-xl border border-neutral-300 bg-white px-4 py-2 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
              >
                {allMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
            {fromId === toId && (
              <p className="text-sm text-rose-600 dark:text-rose-400">
                Strony rozliczenia muszą być różne.
              </p>
            )}
          </>
        )}

        {error && (
          <p className="rounded-xl bg-rose-100 px-4 py-2 text-sm text-rose-900 dark:bg-rose-900/40 dark:text-rose-200">
            {error}
          </p>
        )}
      </div>

      <div
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
        className="fixed inset-x-0 bottom-0 border-t border-neutral-200 bg-neutral-50/95 px-4 pt-3 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95"
      >
        <div className="mx-auto max-w-md">
          <button
            disabled={
              submitting || (entryType === "expense" ? !canSubmitExpense : !canSubmitSettlement)
            }
            onClick={handleSubmit}
            className="min-h-11 w-full rounded-xl bg-teal-600 py-3 font-semibold text-white disabled:opacity-40 dark:bg-teal-500"
          >
            {submitting ? "Zapisywanie…" : "Zapisz"}
          </button>
        </div>
      </div>
    </div>
  );
}
