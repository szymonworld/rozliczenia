import { useState } from "react";
import { useIdentity } from "../context/IdentityContext";
import { useLedger } from "../context/LedgerContext";

export function NamePicker() {
  const { ledger, loading } = useLedger();
  const { setWhoAmI } = useIdentity();
  const [selected, setSelected] = useState<string | null>(null);

  if (loading || !ledger) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-neutral-500 dark:text-neutral-400">
        Ładowanie…
      </div>
    );
  }

  const visibleMembers = ledger.members.filter((m) => !m.hidden);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">Rozliczenia</h1>
        <p className="mt-1 text-neutral-500 dark:text-neutral-400">Kim jesteś?</p>
      </div>
      <fieldset className="w-full max-w-xs space-y-3">
        <legend className="sr-only">Wybierz swoje imię</legend>
        {visibleMembers.map((m) => (
          <label
            key={m.id}
            className={`flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 ${
              selected === m.id
                ? "border-teal-600 bg-teal-50 dark:border-teal-500 dark:bg-teal-950/40"
                : "border-neutral-300 bg-white dark:border-neutral-700 dark:bg-neutral-900"
            }`}
          >
            <input
              type="radio"
              name="who-am-i"
              value={m.id}
              checked={selected === m.id}
              onChange={() => setSelected(m.id)}
              className="h-5 w-5 accent-teal-600"
            />
            <span className="text-base text-neutral-800 dark:text-neutral-100">{m.name}</span>
          </label>
        ))}
      </fieldset>
      <button
        disabled={!selected}
        onClick={() => selected && setWhoAmI(selected)}
        className="min-h-11 w-full max-w-xs rounded-xl bg-teal-600 py-3 font-medium text-white disabled:opacity-40 dark:bg-teal-500"
      >
        Dalej
      </button>
    </div>
  );
}
