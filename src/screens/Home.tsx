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
import { ConfirmationCard } from "../components/ConfirmationCard";
import { PaySheet } from "../components/PaySheet";
import { useIdentity } from "../context/IdentityContext";
import { useLedger } from "../context/LedgerContext";
import { useToast } from "../context/ToastContext";
import { computeNetBalances, computePairwiseDebts, suggestTransfers } from "../lib/balances";
import type { SuggestedTransfer } from "../lib/balances";
import { countableEntries, groupName, pendingConfirmations, visibleEntries } from "../lib/ledgerView";
import { confirmSettlement, rejectSettlement } from "../lib/api";
import { buildSummaryText, shareText } from "../lib/share";
import { formatGrosze } from "../lib/money";
import { plural } from "../lib/plural";
import { buildReminderText } from "../lib/reminders";
import type { Ledger } from "../../shared/types";

export function Home() {
  const { ledger, refetch, refreshing, isOffline, syncWarning, applyLedger } = useLedger();
  const { whoAmI } = useIdentity();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [view, setView] = useState<"transfers" | "matrix">("transfers");
  const [paying, setPaying] = useState<SuggestedTransfer | null>(null);
  const [busy, setBusy] = useState(false);

  const counted = useMemo(() => countableEntries(ledger), [ledger]);
  const shown = useMemo(() => visibleEntries(ledger), [ledger]);
  const pending = useMemo(() => pendingConfirmations(ledger, whoAmI), [ledger, whoAmI]);

  const balances = useMemo(
    () => (ledger ? computeNetBalances(ledger.members, counted) : {}),
    [ledger, counted],
  );
  const transfers = useMemo(() => suggestTransfers(balances), [balances]);
  const debts = useMemo(
    () => (ledger ? computePairwiseDebts(ledger.members, counted) : {}),
    [ledger, counted],
  );

  const myBalance = whoAmI ? (balances[whoAmI] ?? 0) : 0;
  const myTransfers = transfers.filter((t) => t.fromId === whoAmI || t.toId === whoAmI);
  const peopleWord = plural(myTransfers.length, "osoby", "osób", "osób");

  const subtitle =
    myBalance === 0
      ? shown.length === 0
        ? "Dodaj pierwszy wydatek, aby zacząć."
        : "Nie masz żadnych zaległości."
      : myBalance > 0
        ? `Od ${myTransfers.length} ${peopleWord}`
        : `Do ${myTransfers.length} ${peopleWord}`;

  const run = async (fn: () => Promise<Ledger>, fallback: string) => {
    setBusy(true);
    try {
      applyLedger(await fn());
      return true;
    } catch (err) {
      showToast(err instanceof Error ? err.message : fallback);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleShare = async () => {
    if (!ledger) return;
    const result = await shareText(
      title,
      buildSummaryText(ledger.members, balances, transfers),
    );
    if (result === "copied") showToast("Podsumowanie skopiowane do schowka");
    else if (result === "failed") showToast("Nie udało się udostępnić podsumowania");
  };

  const handleRemind = async (t: SuggestedTransfer) => {
    if (!ledger) return;
    const debtor = ledger.members.find((m) => m.id === t.fromId);
    const me = ledger.members.find((m) => m.id === t.toId);
    const text = buildReminderText(
      debtor?.name ?? "Cześć",
      formatGrosze(t.amountGrosze),
      me?.name ?? "",
    );
    const result = await shareText("Przypomnienie", text);
    if (result === "copied") showToast("Przypomnienie skopiowane do schowka");
    else if (result === "failed") showToast("Nie udało się udostępnić przypomnienia");
  };

  const title = groupName(ledger);

  const payRecipient =
    paying && ledger ? ledger.members.find((m) => m.id === paying.toId) : undefined;

  if (!ledger) {
    return (
      <div className="app-shell bg-bg">
        <Header title={groupName(ledger)} />
        <div className="app-scroll">
          <div className="stagger mx-auto w-full max-w-md space-y-4 px-4 pt-4">
            <div className="h-40 animate-pulse rounded-3xl bg-surface-2" />
            <div className="h-12 animate-pulse rounded-2xl bg-surface-2" />
            <div className="h-32 animate-pulse rounded-3xl bg-surface-2" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell bg-bg">
      <Header
        title={title}
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
        <div style={{ paddingBottom: "calc(8rem + env(safe-area-inset-bottom))" }}
          className="stagger mx-auto w-full max-w-md space-y-4 px-4 pt-4">
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

          <ConfirmationCard
            settlements={pending}
            members={ledger.members}
            busy={busy}
            onConfirm={async (id) => {
              if (whoAmI && (await run(() => confirmSettlement(id, whoAmI), "Nie udało się potwierdzić")))
                showToast("Potwierdzono otrzymanie");
            }}
            onReject={async (id) => {
              if (whoAmI && (await run(() => rejectSettlement(id, whoAmI), "Nie udało się odrzucić")))
                showToast("Oznaczono jako nieotrzymane");
            }}
          />

          <BalanceCard
            amountGrosze={myBalance}
            subtitle={subtitle}
            memberName={ledger.members.find((m) => m.id === whoAmI)?.name}
            memberId={whoAmI ?? undefined}
          />

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
              onSelect={(t) =>
                t.fromId === whoAmI
                  ? setPaying(t)
                  : navigate("/dodaj", { state: { settlement: t } })
              }
              onRemind={handleRemind}
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
                  {shown.length} {plural(shown.length, "wpis", "wpisy", "wpisów")}
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

          {/* Deliberately its own card: this isn't about the current group's
              expenses, it spins up an unrelated one with its own people. */}
          <button
            onClick={() => navigate("/nowe")}
            className="press card flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left active:bg-surface-2"
          >
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-on-accent"
              style={{ background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }}
            >
              <Icon name="plus" className="h-[18px] w-[18px]" strokeWidth={2.25} />
            </span>
            <span className="flex-1">
              <span className="block text-[15px] font-medium text-ink">Nowe wydarzenie</span>
              <span className="block text-[13px] text-muted">Inni ludzie, osobny link</span>
            </span>
            <Icon name="chevron" className="h-4 w-4 shrink-0 text-muted/60" />
          </button>
        </div>
      </PullToRefresh>
      <Fab />

      {paying && payRecipient && (
        <PaySheet
          recipient={payRecipient}
          amountGrosze={paying.amountGrosze}
          title="Rozliczenie wydatków"
          onClose={() => setPaying(null)}
          onMarkSent={() => {
            const t = paying;
            setPaying(null);
            navigate("/dodaj", { state: { settlement: t } });
          }}
        />
      )}
    </div>
  );
}
