import { useMemo, useState } from "react";
import { Header } from "../components/Header";
import { Avatar } from "../components/Avatar";
import { Icon } from "../components/Icon";
import { SegmentedControl } from "../components/SegmentedControl";
import { useIdentity } from "../context/IdentityContext";
import { useLedger } from "../context/LedgerContext";
import { computeStats, filterByPeriod, type Period } from "../lib/stats";
import { formatGrosze } from "../lib/money";

export function Stats() {
  const { ledger } = useLedger();
  const { whoAmI } = useIdentity();
  const [period, setPeriod] = useState<Period>("all");

  const stats = useMemo(() => {
    if (!ledger) return null;
    return computeStats(ledger.members, filterByPeriod(ledger.entries, period));
  }, [ledger, period]);

  if (!ledger || !stats) {
    return (
      <div className="app-shell items-center justify-center bg-bg text-sm text-muted">
        Ładowanie…
      </div>
    );
  }

  const nameOf = (id: string) => ledger.members.find((m) => m.id === id)?.name ?? id;
  const maxShare = Math.max(1, ...stats.perMember.map((m) => m.shareGrosze));
  const mine = stats.perMember.find((m) => m.memberId === whoAmI);

  return (
    <div className="app-shell bg-bg">
      <Header title="Podsumowanie" back right={<span />} />
      <div className="app-scroll">
        <div
          style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom))" }}
          className="stagger mx-auto w-full max-w-md space-y-5 px-4 pt-4"
        >
          <SegmentedControl
            value={period}
            onChange={setPeriod}
            options={[
              { value: "all", label: "Wszystko" },
              { value: "month", label: "Ten miesiąc" },
            ]}
          />

          <section className="card rounded-3xl px-5 py-5">
            <p className="text-[13px] font-medium text-muted">Łącznie wydane</p>
            <p className="num mt-1 text-[2rem] font-bold leading-none tracking-tight text-ink">
              {formatGrosze(stats.totalGrosze)}
            </p>
            <div className="mt-4 flex gap-6 border-t border-line pt-3 text-[13px]">
              <span className="text-muted">
                <span className="num block text-[15px] font-semibold text-ink">
                  {stats.expenseCount}
                </span>
                wydatków
              </span>
              <span className="text-muted">
                <span className="num block text-[15px] font-semibold text-ink">
                  {stats.settlementCount}
                </span>
                rozliczeń
              </span>
              {mine && (
                <span className="text-muted">
                  <span className="num block text-[15px] font-semibold text-ink">
                    {formatGrosze(mine.shareGrosze)}
                  </span>
                  Twoja część
                </span>
              )}
            </div>
          </section>

          <section>
            <h2 className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-[0.06em] text-muted">
              Kto ile skonsumował
            </h2>
            <ul className="card space-y-3 rounded-3xl p-4">
              {stats.perMember.map((m) => {
                const pct = Math.round((m.shareGrosze / maxShare) * 100);
                const isMe = m.memberId === whoAmI;
                return (
                  <li key={m.memberId}>
                    <div className="mb-1.5 flex items-center gap-2.5">
                      <Avatar name={nameOf(m.memberId)} seed={m.memberId} size="xs" />
                      <span className="flex-1 truncate text-[14px] text-ink">
                        {nameOf(m.memberId)}
                        {isMe && <span className="ml-1.5 text-[12px] text-accent">(Ty)</span>}
                      </span>
                      <span className="num text-[14px] font-semibold text-ink">
                        {formatGrosze(m.shareGrosze)}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                      <div
                        className="h-full rounded-full transition-[width] duration-500"
                        style={{
                          width: `${pct}%`,
                          background: "linear-gradient(90deg, var(--accent), var(--accent-2))",
                        }}
                      />
                    </div>
                    <p className="mt-1 text-[12px] text-muted">
                      zapłacił(a) {formatGrosze(m.paidGrosze)}
                    </p>
                  </li>
                );
              })}
            </ul>
          </section>

          {stats.biggest && (
            <section>
              <h2 className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-[0.06em] text-muted">
                Największy wydatek
              </h2>
              <div className="card flex items-center gap-3 rounded-3xl px-4 py-3.5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                  <Icon name="sparkle" className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium text-ink">
                    {stats.biggest.description}
                  </span>
                  <span className="block text-[13px] text-muted">
                    {new Date(`${stats.biggest.date}T00:00:00`).toLocaleDateString("pl-PL", {
                      day: "numeric",
                      month: "long",
                    })}
                  </span>
                </span>
                <span className="num shrink-0 text-[15px] font-semibold text-ink">
                  {formatGrosze(stats.biggest.amountGrosze)}
                </span>
              </div>
            </section>
          )}

          {stats.expenseCount === 0 && (
            <p className="py-8 text-center text-sm text-muted">
              Brak wydatków w tym okresie.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
