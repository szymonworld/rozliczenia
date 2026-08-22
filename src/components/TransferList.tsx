import type { Member } from "../../shared/types";
import type { SuggestedTransfer } from "../lib/balances";
import { formatGrosze } from "../lib/money";
import { Avatar } from "./Avatar";
import { Icon } from "./Icon";

function memberOf(members: Member[], id: string) {
  return members.find((m) => m.id === id);
}

function sum(transfers: SuggestedTransfer[]) {
  return transfers.reduce((total, t) => total + t.amountGrosze, 0);
}

type Group = {
  key: "pay" | "receive" | "others";
  title: string;
  transfers: SuggestedTransfer[];
  tone: string;
};

export function TransferList({
  members,
  transfers,
  whoAmI,
  onSelect,
  onRemind,
}: {
  members: Member[];
  transfers: SuggestedTransfer[];
  whoAmI?: string | null;
  onSelect: (transfer: SuggestedTransfer) => void;
  onRemind: (transfer: SuggestedTransfer) => void;
}) {
  if (transfers.length === 0) {
    return (
      <div className="card flex flex-col items-center gap-2 rounded-3xl px-6 py-10 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-pos-soft text-pos">
          <Icon name="check" className="h-6 w-6" strokeWidth={2.25} />
        </span>
        <p className="font-medium text-ink">Wszystko rozliczone</p>
        <p className="text-sm text-muted">Nikt nikomu nic nie jest winien.</p>
      </div>
    );
  }

  // Your own transfers come first and are split by direction, so paying off a
  // debt is never mixed in with money you are still waiting for.
  const allGroups: Group[] = [
    {
      key: "pay",
      title: "Ty przelewasz",
      transfers: transfers.filter((t) => t.fromId === whoAmI),
      tone: "var(--neg)",
    },
    {
      key: "receive",
      title: "Ty otrzymujesz",
      transfers: transfers.filter((t) => t.toId === whoAmI),
      tone: "var(--pos)",
    },
    {
      key: "others",
      title: "Między pozostałymi",
      transfers: transfers.filter((t) => t.fromId !== whoAmI && t.toId !== whoAmI),
      tone: "var(--muted)",
    },
  ];
  const groups = allGroups.filter((g) => g.transfers.length > 0);

  // Without an identity every row lands in "others" — a heading over the whole
  // list would only be noise.
  const showHeadings = !(groups.length === 1 && groups[0].key === "others");

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <section key={group.key}>
          {showHeadings && (
            <div className="mb-2 flex items-baseline gap-2 px-1">
              <h2 className="text-[13px] font-semibold uppercase tracking-[0.06em] text-muted">
                {group.title}
              </h2>
              <span
                className="num ml-auto text-[13px] font-semibold"
                style={{ color: group.tone }}
              >
                {formatGrosze(sum(group.transfers))}
              </span>
            </div>
          )}

          <ul className="stagger-rows card divide-y divide-line overflow-hidden rounded-3xl">
            {group.transfers.map((t, i) => {
              const from = memberOf(members, t.fromId);
              const to = memberOf(members, t.toId);
              const mine = group.key !== "others";
              // On your own rows the heading already says which side you are,
              // so only the other person needs naming.
              const other = group.key === "pay" ? to : from;

              return (
                <li key={`${t.fromId}-${t.toId}-${i}`} className="flex items-center gap-1 pr-1.5">
                  <button
                    onClick={() => onSelect(t)}
                    className="press flex min-w-0 flex-1 items-center gap-3 py-3 pl-4 text-left"
                  >
                    {mine ? (
                      <Avatar
                        name={other?.name ?? "?"}
                        seed={group.key === "pay" ? t.toId : t.fromId}
                        size="md"
                      />
                    ) : (
                      <div className="flex shrink-0 items-center">
                        <Avatar name={from?.name ?? "?"} seed={t.fromId} size="sm" />
                        <Icon name="arrow" className="mx-0.5 h-3.5 w-3.5 text-muted" />
                        <Avatar name={to?.name ?? "?"} seed={t.toId} size="sm" />
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-medium text-ink">
                        {mine ? (
                          other?.name
                        ) : (
                          <>
                            {from?.name} <span className="text-muted">&rarr;</span> {to?.name}
                          </>
                        )}
                      </p>
                      {mine && (
                        <p className="mt-0.5 truncate text-[13px] text-muted">
                          {group.key === "pay" ? "Przelej, aby wyrównać" : "Czekasz na przelew"}
                        </p>
                      )}
                    </div>

                    <span
                      className="num shrink-0 text-[15px] font-semibold"
                      style={{ color: mine ? group.tone : "var(--ink)" }}
                    >
                      {formatGrosze(t.amountGrosze)}
                    </span>
                  </button>

                  {group.key === "receive" ? (
                    <button
                      aria-label={`Przypomnij ${from?.name}`}
                      onClick={() => onRemind(t)}
                      className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted active:bg-surface-2"
                    >
                      <Icon name="share" className="h-[18px] w-[18px]" />
                    </button>
                  ) : (
                    <span className="flex h-11 w-6 shrink-0 items-center justify-center text-muted/50">
                      <Icon name="chevron" className="h-4 w-4" />
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
