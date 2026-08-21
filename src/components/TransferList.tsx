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

  return (
    <ul className="card divide-y divide-line overflow-hidden rounded-3xl">
      {transfers.map((t, i) => {
        const from = memberOf(members, t.fromId);
        const to = memberOf(members, t.toId);
        const iPay = whoAmI === t.fromId;
        const iReceive = whoAmI === t.toId;

        return (
          <li key={`${t.fromId}-${t.toId}-${i}`} className="flex items-center gap-1 pr-1.5">
            <button
              onClick={() => onSelect(t)}
              className="press flex min-w-0 flex-1 items-center gap-3 py-3 pl-4 text-left"
            >
              {/* On your own rows one avatar is enough — the label says which
                  side you are, and the freed width keeps names from truncating. */}
              {iPay || iReceive ? (
                <Avatar
                  name={(iPay ? to : from)?.name ?? "?"}
                  seed={iPay ? t.toId : t.fromId}
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
                  {from?.name} <span className="text-muted">&rarr;</span> {to?.name}
                </p>
                {(iPay || iReceive) && (
                  <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-accent">
                    {iPay ? "Ty przelewasz" : "Ty otrzymujesz"}
                  </p>
                )}
              </div>

              <span className="num shrink-0 text-[15px] font-semibold text-ink">
                {formatGrosze(t.amountGrosze)}
              </span>
            </button>

            {iReceive ? (
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
  );
}
