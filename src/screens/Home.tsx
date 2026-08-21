import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "../components/Header";
import { Fab } from "../components/Fab";
import { Banner } from "../components/Banner";
import { Icon } from "../components/Icon";
import { PullToRefresh } from "../components/PullToRefresh";
import { BalanceCard } from "../components/BalanceCard";
import { SegmentedControl } from "../components/SegmentedControl";
import { TransferList } from "../components/TransferList";
import { PairwiseMatrix } from "../components/PairwiseMatrix";
import { useIdentity } from "../context/IdentityContext";
import { useLedger } from "../context/LedgerContext";
import { useToast } from "../context/ToastContext";
import { computeNetBalances, computePairwiseDebts, suggestTransfers } from "../lib/balances";
import type { SuggestedTransfer } from "../lib/balances";
import { buildSummaryText, shareText } from "../lib/share";

/** Polish plural form for a count (1 / 2-4 / 5+). */
function plural(n: number, one: string, few: string, many: string) {
  if (n === 1) return one;
  const rem10 = n % 10;
  const rem100 = n % 100;
  if (rem10 >= 2 && rem10 <= 4 && !(rem100 >= 12 && rem100 <= 14)) return few;
  return many;
}

export function Home() {
  const { ledger, refetch, refreshing, isOffline, syncWarning } = useLedger();
  const { whoAmI } = useIdentity();
  const { showToast } = useToast();
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
  const myTransfers = transfers.filter((t) => t.fromId === whoAmI || t.toId === whoAmI);
  const peopleWord = plural(myTransfers.length, "osoby", "osób", "osób");

  const subtitle =
    myBalance === 0
      ? activeEntries.length === 0
        ? "Dodaj pierwszy wydatek, aby zacząć."
        : "Nie masz żadnych zaległości."
      : myBalance > 0
        ? `Od ${myTransfers.length} ${peopleWord}`
        : `Do ${myTransfers.length} ${peopleWord}`;

  const onSelectTransfer = (t: SuggestedTransfer) => {
    navigate("/dodaj", { state: { settlement: t } });
  };

  const handleShare = async () => {
    if (!ledger) return;
    const text = buildSummaryText(ledger.members, balances, transfers);
    const result = await shareText("Rozliczenia", text);
    if (result === "copied") showToast("Podsumowanie skopiowane do schowka");
    else if (result === "failed") showToast("Nie udało się udostępnić podsumowania");
  };

  if (!ledger) {
    return (
      <div className="flex min-h-dvh flex-col bg-bg">
        <Header title="Rozliczenia" />
        <div className="mx-auto w-full max-w-md space-y-4 px-4 pt-4">
          <div className="h-40 animate-pulse rounded-3xl bg-surface-2" />
          <div className="h-12 animate-pulse rounded-2xl bg-surface-2" />
          <div className="h-32 animate-pulse rounded-3xl bg-surface-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <Header
        title="Rozliczenia"
        right={
          <div className="flex items-center">
            <button
              aria-label="Udostępnij podsumowanie"
              onClick={handleShare}
              className="press flex h-11 w-11 items-center justify-center rounded-full text-muted active:bg-surface-2"
            >
              <Icon name="share" />
            </button>
            <button
              aria-label="Ustawienia"
              onClick={() => navigate("/ustawienia")}
              className="press flex h-11 w-11 items-center justify-center rounded-full text-muted active:bg-surface-2"
            >
              <Icon name="settings" />
            </button>
          </div>
        }
      />
      <PullToRefresh onRefresh={refetch}>
        <div className="mx-auto w-full max-w-md space-y-4 px-4 pb-32 pt-4">
          {isOffline && (
            <Banner tone="warn" icon="cloud-off">
              Jesteś offline — wyświetlane są ostatnio zapisane dane.
            </Banner>
          )}
          {syncWarning && (
            <Banner tone="neg" icon="alert">
              Nie udało się zsynchronizować niektórych wpisów.
            </Banner>
          )}
          {refreshing && !isOffline && (
            <p className="text-center text-xs font-medium text-muted">Odświeżanie…</p>
          )}

          <BalanceCard amountGrosze={myBalance} subtitle={subtitle} />

          <SegmentedControl
            value={view}
            onChange={setView}
            options={[
              { value: "transfers", label: "Przelewy" },
              { value: "matrix", label: "Kto komu" },
            ]}
          />

          {view === "transfers" ? (
            <TransferList
              members={ledger.members}
              transfers={transfers}
              whoAmI={whoAmI}
              onSelect={onSelectTransfer}
            />
          ) : (
            <PairwiseMatrix members={ledger.members} debts={debts} />
          )}

          <div className="card divide-y divide-line overflow-hidden rounded-2xl">
            <button
              onClick={() => navigate("/historia")}
              className="press flex w-full items-center gap-3 px-4 py-3 text-left active:bg-surface-2"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-muted">
                <Icon name="receipt" className="h-[18px] w-[18px]" />
              </span>
              <span className="flex-1">
                <span className="block text-[15px] font-medium text-ink">Historia wpisów</span>
                <span className="block text-[13px] text-muted">
                  {activeEntries.length} {plural(activeEntries.length, "wpis", "wpisy", "wpisów")}
                </span>
              </span>
              <Icon name="chevron" className="h-4 w-4 text-muted/60" />
            </button>
            <button
              onClick={() => navigate("/podsumowanie")}
              className="press flex w-full items-center gap-3 px-4 py-3 text-left active:bg-surface-2"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-muted">
                <Icon name="chart" className="h-[18px] w-[18px]" />
              </span>
              <span className="flex-1">
                <span className="block text-[15px] font-medium text-ink">Podsumowanie</span>
                <span className="block text-[13px] text-muted">Kto ile wydał i skonsumował</span>
              </span>
              <Icon name="chevron" className="h-4 w-4 text-muted/60" />
            </button>
          </div>
        </div>
      </PullToRefresh>
      <Fab />
    </div>
  );
}
