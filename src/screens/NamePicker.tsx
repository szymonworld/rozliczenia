import { useState } from "react";
import { Avatar } from "../components/Avatar";
import { Icon } from "../components/Icon";
import { useIdentity } from "../context/IdentityContext";
import { useLedger } from "../context/LedgerContext";

export function NamePicker() {
  const { ledger, loading } = useLedger();
  const { setWhoAmI } = useIdentity();
  const [selected, setSelected] = useState<string | null>(null);

  if (loading || !ledger) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg text-sm text-muted">
        Ładowanie…
      </div>
    );
  }

  const visibleMembers = ledger.members.filter((m) => !m.hidden);

  return (
    <div
      style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
      className="flex min-h-dvh flex-col justify-center bg-bg px-6 py-10"
    >
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-8 text-center">
          <span
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-on-accent"
            style={{
              background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
              boxShadow: "var(--shadow-lift)",
            }}
          >
            <Icon name="transfer" className="h-7 w-7" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Rozliczenia</h1>
          <p className="mt-1 text-[15px] text-muted">Kim jesteś?</p>
        </div>

        <fieldset className="grid grid-cols-2 gap-3">
          <legend className="sr-only">Wybierz swoje imię</legend>
          {visibleMembers.map((m) => {
            const active = selected === m.id;
            return (
              <button
                key={m.id}
                type="button"
                aria-pressed={active}
                onClick={() => setSelected(m.id)}
                className={`press relative flex flex-col items-center gap-2.5 rounded-3xl border px-3 py-5 ${
                  active ? "border-accent bg-accent-soft" : "border-line bg-surface"
                }`}
              >
                <Avatar name={m.name} seed={m.id} size="lg" />
                <span className="text-[15px] font-medium text-ink">{m.name}</span>
                {active && (
                  <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-on-accent">
                    <Icon name="check" className="h-3 w-3" strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}
        </fieldset>

        <button
          disabled={!selected}
          onClick={() => selected && setWhoAmI(selected)}
          style={
            selected
              ? {
                  background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
                  boxShadow: "var(--shadow-lift)",
                }
              : undefined
          }
          className="press mt-8 min-h-13 w-full rounded-2xl bg-surface-2 py-3.5 font-semibold text-on-accent disabled:text-muted"
        >
          Dalej
        </button>
      </div>
    </div>
  );
}
