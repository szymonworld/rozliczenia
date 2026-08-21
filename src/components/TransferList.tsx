import type { Member } from "../../shared/types";
import type { SuggestedTransfer } from "../lib/balances";
import { formatGrosze } from "../lib/money";

function nameOf(members: Member[], id: string) {
  return members.find((m) => m.id === id)?.name ?? id;
}

export function TransferList({
  members,
  transfers,
  onSelect,
}: {
  members: Member[];
  transfers: SuggestedTransfer[];
  onSelect: (transfer: SuggestedTransfer) => void;
}) {
  if (transfers.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
        Wszystko rozliczone. 🎉
      </p>
    );
  }

  return (
    <ul className="divide-y divide-neutral-200 overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-900">
      {transfers.map((t, i) => (
        <li key={i}>
          <button
            onClick={() => onSelect(t)}
            className="flex min-h-11 w-full items-center justify-between gap-3 px-4 py-3 text-left active:bg-neutral-100 dark:active:bg-neutral-800"
          >
            <span className="text-neutral-800 dark:text-neutral-100">
              {nameOf(members, t.fromId)} <span className="text-neutral-400">→</span>{" "}
              {nameOf(members, t.toId)}
            </span>
            <span
              className="font-semibold text-neutral-900 dark:text-neutral-50"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {formatGrosze(t.amountGrosze)}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
