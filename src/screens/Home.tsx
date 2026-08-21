import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "../components/Header";
import { Fab } from "../components/Fab";
import { PullToRefresh } from "../components/PullToRefresh";
import { BalanceCard } from "../components/BalanceCard";
import { TransferList } from "../components/TransferList";
import { PairwiseMatrix } from "../components/PairwiseMatrix";
import { useIdentity } from "../context/IdentityContext";
import { useLedger } from "../context/LedgerContext";
import { computeNetBalances, computePairwiseDebts, suggestTransfers } from "../lib/balances";
import type { SuggestedTransfer } from "../lib/balances";

export function Home() {
  const { ledger, refetch, refreshing, isOffline, syncWarning } = useLedger();
  const { whoAmI } = useIdentity();
  const navigate = useNavigate();
  const [view, setView] = useState<"transfers" | "matrix">("transfers");

  const activeEntries = useMemo(() => ledger?.entries.filter((e) => !e.deletedAt) ?? [], [ledger]);

  const balances = useMemo(
    () => (ledger ? computeNetBalances(ledger.members, activeEntries) : {}),
    [ledger, activeEntries],
  );
  const transfers = useMemo(() => suggestTransfers(balances), [balances]);
  const debts = useMemo(
    () => (ledger ? computePairwiseDebts(ledger.members, activeEntries) : {}),
    [ledger, activeEntries],
  );

  const myBalance = whoAmI ? (balances[whoAmI] ?? 0) : 0;

  const onSelectTransfer = (t: SuggestedTransfer) => {
    navigate("/dodaj", { state: { settlement: t } });
  };

  if (!ledger) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-neutral-500 dark:text-neutral-400">
        Ładowanie…
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-neutral-100 dark:bg-neutral-950">
      <Header title="Rozliczenia" />
      <PullToRefresh onRefresh={refetch}>
        <div className="mx-auto w-full max-w-md space-y-4 px-4 pb-32 pt-4">
          {isOffline && (
            <p className="rounded-xl bg-amber-100 px-4 py-2 text-sm text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">
              Jesteś offline — wyświetlane są ostatnio zapisane dane.
            </p>
          )}
          {syncWarning && (
            <p className="rounded-xl bg-rose-100 px-4 py-2 text-sm text-rose-900 dark:bg-rose-900/40 dark:text-rose-200">
              nie udało się zsynchronizować niektórych wpisów
            </p>
          )}
          {refreshing && (
            <p className="text-center text-xs text-neutral-400 dark:text-neutral-500">
              Odświeżanie…
            </p>
          )}

          <BalanceCard amountGrosze={myBalance} />

          <button
            onClick={() => navigate("/historia")}
            className="min-h-11 w-full rounded-xl border border-neutral-300 bg-white py-2 text-sm font-medium text-neutral-700 active:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:active:bg-neutral-800"
          >
            Historia wpisów →
          </button>

          <div className="flex rounded-xl border border-neutral-300 bg-white p-1 dark:border-neutral-700 dark:bg-neutral-900">
            <button
              onClick={() => setView("transfers")}
              className={`min-h-11 flex-1 rounded-lg text-sm font-medium ${
                view === "transfers"
                  ? "bg-teal-600 text-white dark:bg-teal-500"
                  : "text-neutral-600 dark:text-neutral-300"
              }`}
            >
              Sugerowane przelewy
            </button>
            <button
              onClick={() => setView("matrix")}
              className={`min-h-11 flex-1 rounded-lg text-sm font-medium ${
                view === "matrix"
                  ? "bg-teal-600 text-white dark:bg-teal-500"
                  : "text-neutral-600 dark:text-neutral-300"
              }`}
            >
              Macierz długów
            </button>
          </div>

          {view === "transfers" ? (
            <TransferList members={ledger.members} transfers={transfers} onSelect={onSelectTransfer} />
          ) : (
            <PairwiseMatrix members={ledger.members} debts={debts} />
          )}
        </div>
      </PullToRefresh>
      <Fab />
    </div>
  );
}
