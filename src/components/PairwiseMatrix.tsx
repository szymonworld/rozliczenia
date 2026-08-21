import type { Member } from "../../shared/types";
import type { PairwiseDebts } from "../lib/balances";
import { formatGrosze } from "../lib/money";

export function PairwiseMatrix({ members, debts }: { members: Member[]; debts: PairwiseDebts }) {
  const rows: { fromId: string; toId: string; amount: number }[] = [];
  for (const a of members) {
    for (const b of members) {
      if (a.id === b.id) continue;
      const amount = debts[a.id]?.[b.id] ?? 0;
      if (amount > 0) rows.push({ fromId: a.id, toId: b.id, amount });
    }
  }

  if (rows.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-neutral-500 dark:text-neutral-400">
        Brak zaległych długów między osobami.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-neutral-200 overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-900">
      {rows.map((r) => (
        <li
          key={`${r.fromId}-${r.toId}`}
          className="flex min-h-11 items-center justify-between gap-3 px-4 py-3"
        >
          <span className="text-neutral-800 dark:text-neutral-100">
            {members.find((m) => m.id === r.fromId)?.name} winien(na){" "}
            {members.find((m) => m.id === r.toId)?.name}
          </span>
          <span
            className="font-semibold text-neutral-900 dark:text-neutral-50"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {formatGrosze(r.amount)}
          </span>
        </li>
      ))}
    </ul>
  );
}
