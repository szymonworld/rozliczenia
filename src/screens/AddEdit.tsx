import { useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { ulid } from "ulid";
import { Header } from "../components/Header";
import { Chip } from "../components/Chip";
import { Avatar } from "../components/Avatar";
import { Banner } from "../components/Banner";
import { Icon } from "../components/Icon";
import { SegmentedControl } from "../components/SegmentedControl";
import { useIdentity } from "../context/IdentityContext";
import { useLedger } from "../context/LedgerContext";
import { useToast } from "../context/ToastContext";
import { copyText } from "../lib/share";
import { createEntry, updateEntry } from "../lib/api";
import { formatGrosze, groszeToInputValue, parsePlnToGrosze, splitEqual } from "../lib/money";
import type { Entry, Share } from "../../shared/types";
import type { SuggestedTransfer } from "../lib/balances";

type EntryType = "expense" | "settlement";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

const fieldClass =
  "min-h-12 w-full rounded-2xl border border-line bg-surface px-4 py-2.5 text-[15px] text-ink outline-none transition-colors focus:border-accent focus:ring-4 focus:ring-accent/15";

const labelClass = "mb-1.5 block text-[13px] font-medium text-muted";

export function AddEdit() {
  const { ledger, applyLedger } = useLedger();
  const { whoAmI } = useIdentity();
  const { showToast } = useToast();
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
    (m) =>
      !m.hidden ||
      initialExpense?.shares.some((s) => s.memberId === m.id) ||
      m.id === initialExpense?.payerId,
  );
  const [participantIds, setParticipantIds] = useState<string[]>(
    initialExpense
      ? initialExpense.shares.map((s) => s.memberId)
      : selectableMembers.filter((m) => !m.hidden).map((m) => m.id),
  );
  const [exactSplit, setExactSplit] = useState(false);
  // Only meaningful when adding a fresh expense you paid: people who already
  // gave you their share get a settlement recorded alongside it, so the
  // expense stays in history but their part never shows up as owed.
  const [alreadyPaidIds, setAlreadyPaidIds] = useState<string[]>([]);
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

  const allSelected = participantIds.length === selectableMembers.length;
  const toggleAll = () =>
    setParticipantIds(allSelected ? [] : selectableMembers.map((m) => m.id));

  const exactSum = participantIds.reduce((sum, mid) => {
    const g = parsePlnToGrosze(exactAmounts[mid] ?? "");
    return sum + (g ?? 0);
  }, 0);
  const exactRemaining = (totalGrosze ?? 0) - exactSum;

  const perPerson =
    totalGrosze !== null && participantIds.length > 0 && !exactSplit
      ? Math.floor(totalGrosze / participantIds.length)
      : null;

  const showAlreadyPaid =
    entryType === "expense" && !editingEntry && whoAmI !== "" && payerId === whoAmI;
  const owingParticipants = participantIds.filter((mid) => mid !== payerId);
  const allOwingSelected =
    owingParticipants.length > 0 &&
    owingParticipants.every((mid) => alreadyPaidIds.includes(mid));
  const toggleAllPaid = () =>
    setAlreadyPaidIds(allOwingSelected ? [] : owingParticipants);
  const togglePaid = (memberId: string) =>
    setAlreadyPaidIds((prev) =>
      prev.includes(memberId) ? prev.filter((id2) => id2 !== memberId) : [...prev, memberId],
    );

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
      if (totalGrosze === null) throw new Error("Nieprawidłowa kwota");

      if (entryType === "expense") {
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
          applyLedger(await updateEntry(editingEntry.id, changes, whoAmI));
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
          let latest = await createEntry(entry);

          const toSettle = owingParticipants.filter((mid) => alreadyPaidIds.includes(mid));
          if (toSettle.length > 0) {
            const shareOf = Object.fromEntries(shares.map((s) => [s.memberId, s.amountGrosze]));
            const failedNames: string[] = [];
            for (const memberId of toSettle) {
              const amount = shareOf[memberId];
              if (!amount) continue;
              try {
                latest = await createEntry({
                  id: ulid(),
                  type: "settlement",
                  fromId: memberId,
                  toId: payerId,
                  amountGrosze: amount,
                  date,
                  createdAt: new Date().toISOString(),
                  createdBy: whoAmI,
                  // Recorded by the recipient, so it counts as confirmed on
                  // arrival — there is no one else left to confirm it.
                  confirmedAt: new Date().toISOString(),
                  confirmedBy: whoAmI,
                });
              } catch {
                failedNames.push(allMembers.find((m) => m.id === memberId)?.name ?? memberId);
              }
            }
            if (failedNames.length > 0) {
              showToast(`Wydatek zapisany, ale nie oznaczono: ${failedNames.join(", ")}`);
            } else {
              showToast(
                toSettle.length === 1
                  ? "Oznaczono jako otrzymane"
                  : `Oznaczono jako otrzymane od ${toSettle.length} osób`,
              );
            }
          }

          applyLedger(latest);
        }
      } else {
        if (editingEntry) {
          const changes: Partial<Entry> = {
            type: "settlement",
            fromId,
            toId,
            amountGrosze: totalGrosze,
            date,
          };
          applyLedger(await updateEntry(editingEntry.id, changes, whoAmI));
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
          applyLedger(await createEntry(entry));
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
      <div className="app-shell items-center justify-center bg-bg text-sm text-muted">
        Ładowanie…
      </div>
    );
  }

  const canSubmit = entryType === "expense" ? canSubmitExpense : canSubmitSettlement;

  return (
    <div className="app-shell bg-bg">
      <Header title={editingEntry ? "Edytuj wpis" : "Nowy wpis"} back right={<span />} />

      <div className="app-scroll">
        <div
          style={{ paddingBottom: "calc(9rem + env(safe-area-inset-bottom))" }}
          className="stagger mx-auto w-full max-w-md space-y-5 px-4 pt-4"
        >
          {!editingEntry && (
            <SegmentedControl
              value={entryType}
              onChange={setEntryType}
              options={[
                { value: "expense", label: "Wydatek" },
                { value: "settlement", label: "Rozliczenie" },
              ]}
            />
          )}

          {/* Amount — the hero field. */}
          <div className="card rounded-3xl px-5 py-6">
            <label htmlFor="amount" className="block text-center text-[13px] font-medium text-muted">
              Kwota
            </label>
            <div className="mt-2 flex items-baseline justify-center gap-1.5">
              <input
                id="amount"
                inputMode="decimal"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                placeholder="0,00"
                className="num w-full max-w-[8ch] border-none bg-transparent text-center text-[2.5rem] font-bold leading-none tracking-tight text-ink outline-none placeholder:text-muted/40"
              />
              <span className="text-xl font-semibold text-muted">zł</span>
            </div>
            {perPerson !== null && perPerson > 0 && entryType === "expense" && (
              <p className="mt-3 text-center text-[13px] text-muted">
                po {formatGrosze(perPerson)} na osobę
              </p>
            )}
          </div>

          {entryType === "expense" ? (
            <>
              <div>
                <label htmlFor="description" className={labelClass}>
                  Opis
                </label>
                <input
                  id="description"
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="np. zakupy, piwo, bilety"
                  className={fieldClass}
                />
              </div>

              <div>
                <label htmlFor="date" className={labelClass}>
                  Data
                </label>
                <input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={fieldClass}
                />
              </div>

              <div>
                <span className={labelClass}>Kto zapłacił</span>
                <div className="flex flex-wrap gap-2">
                  {selectableMembers.map((m) => (
                    <Chip
                      key={m.id}
                      label={m.name}
                      seed={m.id}
                      selected={payerId === m.id}
                      onClick={() => setPayerId(m.id)}
                    />
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[13px] font-medium text-muted">
                    Podziel na ({participantIds.length})
                  </span>
                  <button
                    type="button"
                    onClick={toggleAll}
                    className="press rounded-full px-2 py-1 text-[13px] font-medium text-accent"
                  >
                    {allSelected ? "Odznacz wszystkich" : "Zaznacz wszystkich"}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {selectableMembers.map((m) => (
                    <Chip
                      key={m.id}
                      label={m.name}
                      seed={m.id}
                      selected={participantIds.includes(m.id)}
                      onClick={() => toggleParticipant(m.id)}
                    />
                  ))}
                </div>
                {participantIds.length === 0 && (
                  <p className="mt-2 text-[13px] text-neg">Wybierz co najmniej jedną osobę.</p>
                )}
              </div>

              <label className="press card flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl px-4 py-3">
                <input
                  type="checkbox"
                  checked={exactSplit}
                  onChange={(e) => setExactSplit(e.target.checked)}
                  className="h-5 w-5 rounded"
                />
                <span className="flex-1 text-[15px] text-ink">Podziel dokładnie</span>
                <span className="text-[13px] text-muted">
                  {exactSplit ? "kwoty ręcznie" : "po równo"}
                </span>
              </label>

              {exactSplit && (
                <div className="card space-y-1 rounded-3xl p-3">
                  {participantIds.map((mid) => {
                    const member = allMembers.find((m) => m.id === mid);
                    return (
                      <div key={mid} className="flex items-center gap-3 px-1 py-1">
                        <Avatar name={member?.name ?? "?"} seed={mid} size="sm" />
                        <span className="flex-1 text-[15px] text-ink">{member?.name}</span>
                        <input
                          inputMode="decimal"
                          value={exactAmounts[mid] ?? ""}
                          onChange={(e) =>
                            setExactAmounts((prev) => ({ ...prev, [mid]: e.target.value }))
                          }
                          placeholder="0,00"
                          aria-label={`Kwota dla ${member?.name}`}
                          className="num min-h-11 w-28 rounded-xl border border-line bg-surface-2 px-3 py-1 text-right text-[15px] text-ink outline-none focus:border-accent"
                        />
                      </div>
                    );
                  })}
                  <p
                    className="mt-1 rounded-xl px-3 py-2 text-right text-[13px] font-medium"
                    style={{
                      background:
                        exactRemaining === 0 ? "var(--pos-soft)" : "var(--neg-soft)",
                      color: exactRemaining === 0 ? "var(--pos)" : "var(--neg)",
                    }}
                  >
                    {exactRemaining === 0
                      ? "Kwoty się zgadzają"
                      : exactRemaining > 0
                        ? `Pozostało ${formatGrosze(exactRemaining)}`
                        : `Za dużo o ${formatGrosze(-exactRemaining)}`}
                  </p>
                </div>
              )}

              {showAlreadyPaid && owingParticipants.length > 0 && (
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[13px] font-medium text-muted">Kto już oddał?</span>
                    <button
                      type="button"
                      onClick={toggleAllPaid}
                      className="press rounded-full px-2 py-1 text-[13px] font-medium text-accent"
                    >
                      {allOwingSelected ? "Odznacz wszystkich" : "Zaznacz wszystkich"}
                    </button>
                  </div>
                  <ul className="card divide-y divide-line overflow-hidden rounded-2xl">
                    {owingParticipants.map((mid) => {
                      const member = allMembers.find((m) => m.id === mid);
                      const shareAmount = exactSplit
                        ? (parsePlnToGrosze(exactAmounts[mid] ?? "0") ?? 0)
                        : perPerson;
                      const paid = alreadyPaidIds.includes(mid);
                      return (
                        <li key={mid}>
                          <button
                            type="button"
                            onClick={() => togglePaid(mid)}
                            className="press flex w-full items-center gap-3 px-4 py-3 text-left active:bg-surface-2"
                          >
                            <Avatar name={member?.name ?? "?"} seed={mid} size="sm" />
                            <span className="flex-1 text-[15px] text-ink">{member?.name}</span>
                            {shareAmount !== null && (
                              <span className="num text-[13px] text-muted">
                                {formatGrosze(shareAmount)}
                              </span>
                            )}
                            <span
                              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                                paid ? "bg-pos text-on-accent" : "border border-line"
                              }`}
                            >
                              {paid && <Icon name="check" className="h-3.5 w-3.5" strokeWidth={3} />}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  <p className="mt-2 px-1 text-[13px] leading-relaxed text-muted">
                    Wydatek zostaje w historii — zaznaczone osoby po prostu od razu wychodzą na
                    zero, bez osobnego wpisywania rozliczenia.
                  </p>
                </div>
              )}
            </>
          ) : (
            <>
              <div>
                <label htmlFor="date-settlement" className={labelClass}>
                  Data
                </label>
                <input
                  id="date-settlement"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={fieldClass}
                />
              </div>

              <div>
                <span className={labelClass}>Kto przelewa</span>
                <div className="flex flex-wrap gap-2">
                  {allMembers.map((m) => (
                    <Chip
                      key={m.id}
                      label={m.name}
                      seed={m.id}
                      selected={fromId === m.id}
                      onClick={() => setFromId(m.id)}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-center text-muted">
                <Icon name="arrow" className="h-5 w-5 rotate-90" />
              </div>

              <div>
                <span className={labelClass}>Kto otrzymuje</span>
                <div className="flex flex-wrap gap-2">
                  {allMembers.map((m) => (
                    <Chip
                      key={m.id}
                      label={m.name}
                      seed={m.id}
                      selected={toId === m.id}
                      onClick={() => setToId(m.id)}
                    />
                  ))}
                </div>
              </div>

              {fromId === toId && (
                <p className="text-[13px] text-neg">Strony rozliczenia muszą być różne.</p>
              )}

              {(() => {
                const recipient = allMembers.find((m) => m.id === toId);
                const rows = [
                  { label: "BLIK", value: recipient?.payment?.blik },
                  { label: "Konto", value: recipient?.payment?.iban },
                ].filter((r) => r.value);
                if (!recipient || rows.length === 0) return null;

                return (
                  <div className="card rounded-3xl p-4">
                    <p className="mb-2 text-[13px] font-medium text-muted">
                      Dane do przelewu &mdash; {recipient.name}
                    </p>
                    <ul className="space-y-2">
                      {rows.map((r) => (
                        <li key={r.label} className="flex items-center gap-3">
                          <span className="w-12 shrink-0 text-[13px] text-muted">{r.label}</span>
                          <span className="num min-w-0 flex-1 truncate text-[15px] text-ink">
                            {r.value}
                          </span>
                          <button
                            type="button"
                            aria-label={`Kopiuj ${r.label}`}
                            onClick={async () => {
                              showToast(
                                (await copyText(r.value as string))
                                  ? `${r.label} skopiowany`
                                  : "Nie udało się skopiować",
                              );
                            }}
                            className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-accent active:bg-surface-2"
                          >
                            <Icon name="copy" className="h-[18px] w-[18px]" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })()}
            </>
          )}

          {error && (
            <Banner tone="neg" icon="alert">
              {error}
            </Banner>
          )}
        </div>
      </div>

      <div
        style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
        className="fixed inset-x-0 bottom-0 z-20 border-t border-line/80 bg-bg/85 px-4 pt-3 backdrop-blur-xl"
      >
        <div className="mx-auto max-w-md">
          <button
            disabled={submitting || !canSubmit}
            onClick={handleSubmit}
            style={
              canSubmit && !submitting
                ? {
                    background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
                    boxShadow: "var(--shadow-lift)",
                  }
                : undefined
            }
            className="press min-h-13 w-full rounded-2xl bg-surface-2 py-3.5 font-semibold text-on-accent disabled:text-muted"
          >
            {submitting ? "Zapisywanie…" : editingEntry ? "Zapisz zmiany" : "Dodaj"}
          </button>
        </div>
      </div>
    </div>
  );
}
