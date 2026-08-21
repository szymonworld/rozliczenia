import type { Member, SettlementEntry } from "../../shared/types";
import { formatGrosze } from "../lib/money";
import { Avatar } from "./Avatar";
import { Icon } from "./Icon";

export function ConfirmationCard({
  settlements,
  members,
  busy,
  onConfirm,
  onReject,
}: {
  settlements: SettlementEntry[];
  members: Member[];
  busy: boolean;
  onConfirm: (id: string) => void;
  onReject: (id: string) => void;
}) {
  if (settlements.length === 0) return null;
  const nameOf = (id: string) => members.find((m) => m.id === id)?.name ?? id;

  return (
    <section
      className={`card overflow-hidden rounded-3xl ${busy ? "opacity-60" : ""}`}
      aria-label="Przelewy do potwierdzenia"
    >
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-warn-soft text-warn">
          <Icon name="alert" className="h-4 w-4" />
        </span>
        <h2 className="text-[15px] font-semibold text-ink">
          Do potwierdzenia ({settlements.length})
        </h2>
      </div>

      <ul className="divide-y divide-line">
        {settlements.map((s) => (
          <li key={s.id} className="px-4 py-3">
            <div className="flex items-center gap-3">
              <Avatar name={nameOf(s.fromId)} seed={s.fromId} size="md" />
              <div className="min-w-0 flex-1">
                <p className="text-[15px] text-ink">
                  <span className="font-medium">{nameOf(s.fromId)}</span> twierdzi, że przelał(a)
                </p>
                <p className="num text-[13px] text-muted">
                  {new Date(`${s.date}T00:00:00`).toLocaleDateString("pl-PL", {
                    day: "numeric",
                    month: "long",
                  })}
                </p>
              </div>
              <span className="num shrink-0 text-[15px] font-semibold text-ink">
                {formatGrosze(s.amountGrosze)}
              </span>
            </div>

            <div className="mt-2.5 flex gap-2">
              <button
                disabled={busy}
                onClick={() => onConfirm(s.id)}
                className="press min-h-11 flex-1 rounded-xl bg-pos-soft text-[14px] font-semibold text-pos disabled:opacity-40"
              >
                Otrzymałem(am)
              </button>
              <button
                disabled={busy}
                onClick={() => onReject(s.id)}
                className="press min-h-11 rounded-xl border border-line px-4 text-[14px] font-medium text-muted disabled:opacity-40"
              >
                Nie dotarło
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
