import type { Member } from "../../shared/types";
import type { PairwiseDebts } from "../lib/balances";
import { formatGrosze } from "../lib/money";
import { Avatar } from "./Avatar";
import { Icon } from "./Icon";

export function PairwiseMatrix({ members, debts }: { members: Member[]; debts: PairwiseDebts }) {
  const rows: { fromId: string; toId: string; amount: number }[] = [];
  for (const a of members) {
    for (const b of members) {
      if (a.id === b.id) continue;
      const amount = debts[a.id]?.[b.id] ?? 0;
      if (amount > 0) rows.push({ fromId: a.id, toId: b.id, amount });
    }
  }
  rows.sort((x, y) => y.amount - x.amount);

  if (rows.length === 0) {
    return (
      <div className="card flex flex-col items-center gap-2 rounded-3xl px-6 py-10 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-2 text-muted">
          <Icon name="users" className="h-6 w-6" />
        </span>
        <p className="font-medium text-ink">Brak długów</p>
        <p className="text-sm text-muted">Między nikim nie ma zaległości.</p>
      </div>
    );
  }

  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? id;

  return (
    <>
      <ul className="stagger-rows card divide-y divide-line overflow-hidden rounded-3xl">
        {rows.map((r) => (
          <li key={`${r.fromId}-${r.toId}`} className="flex items-center gap-3 px-4 py-3">
            <Avatar name={nameOf(r.fromId)} seed={r.fromId} size="sm" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] text-ink">
                <span className="font-medium">{nameOf(r.fromId)}</span>{" "}
                <span className="text-muted">winien(na)</span>{" "}
                <span className="font-medium">{nameOf(r.toId)}</span>
              </p>
            </div>
            <span className="num shrink-0 text-[15px] font-semibold text-ink">
              {formatGrosze(r.amount)}
            </span>
          </li>
        ))}
      </ul>
      <p className="px-1 text-xs leading-relaxed text-muted">
        Pełny obraz długów tak, jak powstały &mdash; bez upraszczania do minimalnej liczby
        przelewów.
      </p>
    </>
  );
}
