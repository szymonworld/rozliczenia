import { useState } from "react";
import { Header } from "../components/Header";
import { useIdentity } from "../context/IdentityContext";
import { useLedger } from "../context/LedgerContext";
import { addMember, setMemberHidden } from "../lib/api";

export function Settings() {
  const { ledger, applyLedger } = useLedger();
  const { whoAmI, setWhoAmI } = useIdentity();
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddMember = async () => {
    const name = newName.trim();
    if (!name) return;
    setBusy(true);
    setError(null);
    try {
      const updated = await addMember(name);
      applyLedger(updated);
      setNewName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się dodać osoby");
    } finally {
      setBusy(false);
    }
  };

  const handleToggleHidden = async (memberId: string, hidden: boolean) => {
    setBusy(true);
    setError(null);
    try {
      const updated = await setMemberHidden(memberId, hidden);
      applyLedger(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się zaktualizować osoby");
    } finally {
      setBusy(false);
    }
  };

  if (!ledger) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-neutral-500 dark:text-neutral-400">
        Ładowanie…
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-neutral-100 dark:bg-neutral-950">
      <Header title="Ustawienia" back />
      <div
        style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom))" }}
        className="mx-auto w-full max-w-md space-y-6 px-4 pt-4"
      >
        {error && (
          <p className="rounded-xl bg-rose-100 px-4 py-2 text-sm text-rose-900 dark:bg-rose-900/40 dark:text-rose-200">
            {error}
          </p>
        )}

        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Kim jesteś
          </h2>
          <div className="space-y-2 rounded-2xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
            {ledger.members.map((m) => (
              <label
                key={m.id}
                className="flex min-h-11 cursor-pointer items-center gap-3 px-1"
              >
                <input
                  type="radio"
                  name="who-am-i-settings"
                  checked={whoAmI === m.id}
                  onChange={() => setWhoAmI(m.id)}
                  className="h-5 w-5 accent-teal-600"
                />
                <span className="text-neutral-800 dark:text-neutral-100">
                  {m.name}
                  {m.hidden && (
                    <span className="ml-2 text-xs text-neutral-400">(ukryty)</span>
                  )}
                </span>
              </label>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Uczestnicy
          </h2>
          <ul className="divide-y divide-neutral-200 overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:divide-neutral-800 dark:border-neutral-800 dark:bg-neutral-900">
            {ledger.members.map((m) => (
              <li key={m.id} className="flex min-h-11 items-center justify-between gap-3 px-4 py-2">
                <span className="text-neutral-800 dark:text-neutral-100">{m.name}</span>
                <button
                  disabled={busy}
                  onClick={() => handleToggleHidden(m.id, !m.hidden)}
                  className="min-h-11 rounded-lg px-3 text-sm font-medium text-teal-700 active:bg-teal-50 disabled:opacity-40 dark:text-teal-400 dark:active:bg-teal-950"
                >
                  {m.hidden ? "pokaż" : "ukryj"}
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">
            Ukryte osoby nie pojawiają się przy dodawaniu nowych wydatków, ale pozostają widoczne
            w historii i rozliczeniach.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
            Dodaj osobę
          </h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Imię"
              className="min-h-11 flex-1 rounded-xl border border-neutral-300 bg-white px-4 py-2 text-neutral-900 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-50"
            />
            <button
              disabled={busy || !newName.trim()}
              onClick={handleAddMember}
              className="min-h-11 rounded-xl bg-teal-600 px-4 font-medium text-white disabled:opacity-40 dark:bg-teal-500"
            >
              Dodaj
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
