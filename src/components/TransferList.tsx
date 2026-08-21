import type { Member } from "../../shared/types";
import type { SuggestedTransfer } from "../lib/balances";
import { formatGrosze } from "../lib/money";
import { Avatar } from "./Avatar";
import { Icon } from "./Icon";

function memberOf(members: Member[], id: string) {
  return members.find((m) => m.id === id);
}

export function TransferList({
  members,
  transfers,
  whoAmI,
  onSelect,
}: {
  members: Member[];
  transfers: SuggestedTransfer[];
  whoAmI?: string | null;
  onSelect: (transfer: SuggestedTransfer) => void;
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

  return (
    <ul className="card divide-y divide-line overflow-hidden rounded-3xl">
      {transfers.map((t, i) => {
        const from = memberOf(members, t.fromId);
        const to = memberOf(members, t.toId);
        const mine = whoAmI === t.fromId || whoAmI === t.toId;

        return (
          <li key={`${t.fromId}-${t.toId}-${i}`}>
            <button
              onClick={() => onSelect(t)}
              className="press flex w-full items-center gap-3 px-4 py-3 text-left active:bg-surface-2"
            >
              <div className="flex shrink-0 items-center">
                <Avatar name={from?.name ?? "?"} seed={t.fromId} size="sm" />
                <Icon name="arrow" className="mx-0.5 h-3.5 w-3.5 text-muted" />
                <Avatar name={to?.name ?? "?"} seed={t.toId} size="sm" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-medium text-ink">
                  {from?.name} <span className="text-muted">&rarr;</span> {to?.name}
                </p>
                {mine && (
                  <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-accent">
                    {whoAmI === t.fromId ? "Ty przelewasz" : "Ty otrzymujesz"}
                  </p>
                )}
              </div>

              <span className="num shrink-0 text-[15px] font-semibold text-ink">
                {formatGrosze(t.amountGrosze)}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
