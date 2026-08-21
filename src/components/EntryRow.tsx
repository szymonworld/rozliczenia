import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Entry, Member } from "../../shared/types";
import { formatGrosze } from "../lib/money";

function nameOf(members: Member[], id: string) {
  return members.find((m) => m.id === id)?.name ?? "Ktoś";
}

function describe(entry: Entry, members: Member[]): string {
  if (entry.type === "expense") {
    const payer = nameOf(members, entry.payerId);
    const shareNames = entry.shares.map((s) => nameOf(members, s.memberId)).join(", ");
    return `${payer} zapłacił(a) ${formatGrosze(entry.amountGrosze)} za ${entry.description} — podzielone: ${shareNames}`;
  }
  return `💸 ${nameOf(members, entry.fromId)} → ${nameOf(members, entry.toId)} ${formatGrosze(entry.amountGrosze)}`;
}

export function EntryRow({
  entry,
  members,
  onDelete,
  onRestore,
}: {
  entry: Entry;
  members: Member[];
  onDelete: (id: string) => void;
  onRestore: (id: string) => void;
}) {
  const navigate = useNavigate();
  const [showPrevious, setShowPrevious] = useState(false);
  const isDeleted = Boolean(entry.deletedAt);

  return (
    <li
      className={`px-4 py-3 ${isDeleted ? "opacity-50" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <button
          onClick={() => !isDeleted && navigate(`/edytuj/${entry.id}`)}
          className="min-h-11 flex-1 text-left text-sm text-neutral-800 dark:text-neutral-100"
        >
          {describe(entry, members)}
          <div className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
            {new Date(entry.date).toLocaleDateString("pl-PL")}
            {entry.editedAt && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPrevious((v) => !v);
                }}
                className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
              >
                edytowane
              </button>
            )}
          </div>
          {showPrevious && entry.previousValue && (
            <pre className="mt-1 overflow-x-auto rounded-lg bg-neutral-100 p-2 text-[11px] text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
              {JSON.stringify(entry.previousValue, null, 2)}
            </pre>
          )}
        </button>
        <div className="flex shrink-0 gap-1">
          {isDeleted ? (
            <button
              onClick={() => onRestore(entry.id)}
              className="min-h-11 rounded-lg px-3 text-sm font-medium text-teal-700 active:bg-teal-50 dark:text-teal-400 dark:active:bg-teal-950"
            >
              przywróć
            </button>
          ) : (
            <button
              onClick={() => onDelete(entry.id)}
              className="min-h-11 rounded-lg px-3 text-sm font-medium text-rose-600 active:bg-rose-50 dark:text-rose-400 dark:active:bg-rose-950"
            >
              usuń
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
