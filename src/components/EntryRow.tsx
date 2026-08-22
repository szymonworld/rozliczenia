import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Entry, Member } from "../../shared/types";
import { formatGrosze } from "../lib/money";
import { settlementStatus } from "../lib/ledgerView";
import { Avatar } from "./Avatar";
import { Icon } from "./Icon";

const statusStyles = {
  confirmed: { label: "potwierdzone", className: "bg-pos-soft text-pos" },
  rejected: { label: "nie dotarło", className: "bg-neg-soft text-neg" },
  pending: { label: "czeka na potwierdzenie", className: "bg-warn-soft text-warn" },
} as const;

function nameOf(members: Member[], id: string) {
  return members.find((m) => m.id === id)?.name ?? "Ktoś";
}

function previousSummary(entry: Entry): string | null {
  const prev = entry.previousValue as Partial<Entry> | undefined;
  if (!prev) return null;
  const bits: string[] = [];
  if (typeof prev.amountGrosze === "number") bits.push(formatGrosze(prev.amountGrosze));
  if (prev.type === "expense" && prev.description) bits.push(`„${prev.description}”`);
  return bits.length ? `Poprzednio: ${bits.join(" · ")}` : null;
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
  const isExpense = entry.type === "expense";

  const title = isExpense
    ? entry.description
    : `${nameOf(members, entry.fromId)} → ${nameOf(members, entry.toId)}`;

  // "wszyscy" keeps the common case short; an actual subset is worth naming.
  const everyone = isExpense && entry.shares.length === members.filter((m) => !m.hidden).length;
  const subtitle = isExpense
    ? `${nameOf(members, entry.payerId)} · ${
        everyone ? "wszyscy" : entry.shares.map((s) => nameOf(members, s.memberId)).join(", ")
      }`
    : "Rozliczenie";

  const prev = previousSummary(entry);

  return (
    <li className={isDeleted ? "opacity-55" : ""}>
      <div className="flex items-center gap-3 pl-4 pr-1.5 py-2.5">
        <button
          onClick={() => !isDeleted && navigate(`/edytuj/${entry.id}`)}
          disabled={isDeleted}
          className="flex min-w-0 flex-1 items-center gap-3 py-1 text-left"
        >
          {isExpense ? (
            <Avatar name={nameOf(members, entry.payerId)} seed={entry.payerId} size="md" />
          ) : (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
              <Icon name="transfer" className="h-5 w-5" />
            </span>
          )}

          <span className="min-w-0 flex-1">
            <span className="flex items-baseline gap-2">
              <span
                className={`min-w-0 flex-1 truncate text-[15px] font-medium text-ink ${
                  isDeleted ? "line-through" : ""
                }`}
              >
                {title}
              </span>
              <span className="num shrink-0 text-[15px] font-semibold text-ink">
                {formatGrosze(entry.amountGrosze)}
              </span>
            </span>
            <span className="mt-0.5 block truncate text-[13px] text-muted">{subtitle}</span>
            <span className="mt-1 flex flex-wrap gap-1.5">
              {!isExpense && (
                <span
                  className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    statusStyles[settlementStatus(entry)].className
                  }`}
                >
                  {statusStyles[settlementStatus(entry)].label}
                </span>
              )}
              {entry.editedAt && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowPrevious((v) => !v);
                  }}
                  className="inline-block rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-muted"
                >
                  edytowane
                </span>
              )}
            </span>
          </span>
        </button>

        {isDeleted ? (
          <button
            aria-label="Przywróć wpis"
            onClick={() => onRestore(entry.id)}
            className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-accent active:bg-surface-2"
          >
            <Icon name="undo" className="h-[18px] w-[18px]" />
          </button>
        ) : (
          <>
            <button
              aria-label="Duplikuj wpis"
              onClick={() => navigate("/dodaj", { state: { duplicate: entry } })}
              className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted/70 active:bg-surface-2"
            >
              <Icon name="copy" className="h-[18px] w-[18px]" />
            </button>
            <button
              aria-label="Usuń wpis"
              onClick={() => onDelete(entry.id)}
              className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted/70 active:bg-neg-soft active:text-neg"
            >
              <Icon name="trash" className="h-[18px] w-[18px]" />
            </button>
          </>
        )}
      </div>

      {showPrevious && prev && (
        <p className="mx-4 mb-3 rounded-xl bg-surface-2 px-3 py-2 text-[13px] text-muted">{prev}</p>
      )}
    </li>
  );
}
