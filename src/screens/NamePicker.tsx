import { useState } from "react";
import { Avatar } from "../components/Avatar";
import { Icon } from "../components/Icon";
import { useIdentity } from "../context/IdentityContext";
import { useLedger } from "../context/LedgerContext";
import { addMember, setMemberPayment } from "../lib/api";
import { groupName } from "../lib/ledgerView";
import type { Member } from "../../shared/types";

const inputClass =
  "min-h-12 w-full rounded-2xl border border-line bg-surface px-4 py-2.5 text-[15px] text-ink outline-none transition-colors placeholder:text-muted focus:border-accent focus:ring-4 focus:ring-accent/15";

const gradient = {
  background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
  boxShadow: "var(--shadow-lift)",
};

/** Step 2 of onboarding: how the others should send you money. Skippable. */
function PaymentStep({ member, onDone }: { member: Member; onDone: () => void }) {
  const { applyLedger } = useLedger();
  const [blik, setBlik] = useState(member.payment?.blik ?? "");
  const [iban, setIban] = useState(member.payment?.iban ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      applyLedger(await setMemberPayment(member.id, { blik, iban }));
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się zapisać danych");
    } finally {
      setBusy(false);
    }
  };

  const hasSomething = Boolean(blik.trim() || iban.trim());

  return (
    <div className="mx-auto w-full max-w-sm">
      <div className="mb-7 text-center">
        <Avatar name={member.name} seed={member.id} size="lg" className="mx-auto mb-4" />
        <h1 className="text-2xl font-bold tracking-tight text-ink">Cześć, {member.name}!</h1>
        <p className="mt-1.5 text-[15px] leading-relaxed text-muted">
          Dodaj swoje dane do przelewu, żeby reszta mogła Ci szybko oddać pieniądze.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="blik" className="mb-1.5 block text-[13px] font-medium text-muted">
            BLIK (numer telefonu)
          </label>
          <input
            id="blik"
            value={blik}
            onChange={(e) => setBlik(e.target.value)}
            inputMode="tel"
            placeholder="np. 600 100 200"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="iban" className="mb-1.5 block text-[13px] font-medium text-muted">
            Numer konta
          </label>
          <input
            id="iban"
            value={iban}
            onChange={(e) => setIban(e.target.value)}
            placeholder="PL00 0000 0000 0000 0000 0000 0000"
            className={inputClass}
          />
          <p className="mt-1.5 px-1 text-[13px] leading-relaxed text-muted">
            Z numeru konta powstaje kod QR &mdash; reszta skanuje go w aplikacji banku i przelew
            uzupełnia się sam.
          </p>
        </div>

        {error && (
          <p className="rounded-2xl bg-neg-soft px-4 py-2.5 text-[13px] text-neg">{error}</p>
        )}
      </div>

      <button
        disabled={busy || !hasSomething}
        onClick={save}
        style={hasSomething && !busy ? gradient : undefined}
        className="press mt-7 min-h-13 w-full rounded-2xl bg-surface-2 py-3.5 font-semibold text-on-accent disabled:text-muted"
      >
        {busy ? "Zapisywanie…" : "Zapisz i zaczynamy"}
      </button>
      <button
        onClick={onDone}
        disabled={busy}
        className="press mt-2 min-h-11 w-full rounded-2xl py-2 text-[15px] font-medium text-muted"
      >
        Pomiń — dodam później
      </button>
    </div>
  );
}

export function NamePicker() {
  const { ledger, loading, applyLedger } = useLedger();
  const { setWhoAmI } = useIdentity();
  const [selected, setSelected] = useState<string | null>(null);
  const [step, setStep] = useState<"name" | "payment">("name");
  // Someone handed the link to a person nobody had added yet. Without this
  // they are stuck: every name on the grid belongs to someone else.
  const [addingSelf, setAddingSelf] = useState(false);
  const [newName, setNewName] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  const joinAsNewMember = async () => {
    const name = newName.trim();
    if (!name || joining) return;
    setJoining(true);
    setJoinError(null);
    try {
      const next = await addMember(name);
      applyLedger(next);
      // The server assigns the id, so find the member it just appended rather
      // than guessing how the name was slugified.
      const added = next.members[next.members.length - 1];
      setSelected(added.id);
      setAddingSelf(false);
      setNewName("");
      setStep("payment");
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : "Nie udało się dodać osoby");
    } finally {
      setJoining(false);
    }
  };

  if (loading || !ledger) {
    return (
      <div className="app-shell items-center justify-center bg-bg text-sm text-muted">
        Ładowanie…
      </div>
    );
  }

  const visibleMembers = ledger.members.filter((m) => !m.hidden);
  const selectedMember = ledger.members.find((m) => m.id === selected);

  return (
    <div
      style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
      className="app-scroll flex min-h-full flex-col justify-center bg-bg px-6 py-10"
    >
      {step === "payment" && selectedMember ? (
        // Identity is only committed once onboarding finishes, so a reload
        // during step 2 simply starts over rather than half-configuring.
        <PaymentStep member={selectedMember} onDone={() => setWhoAmI(selectedMember.id)} />
      ) : (
        <div className="anim-rise mx-auto w-full max-w-sm">
          <div className="mb-8 text-center">
            <span
              className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-on-accent"
              style={gradient}
            >
              <Icon name="transfer" className="h-7 w-7" />
            </span>
            <h1 className="text-2xl font-bold tracking-tight text-ink">{groupName(ledger)}</h1>
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

          {addingSelf ? (
            <div className="anim-rise mt-6 space-y-3">
              <input
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void joinAsNewMember()}
                maxLength={60}
                placeholder="Twoje imię"
                aria-label="Twoje imię"
                className={inputClass}
              />
              {joinError && (
                <p className="px-1 text-[13px]" style={{ color: "var(--neg)" }}>
                  {joinError}
                </p>
              )}
              <button
                disabled={!newName.trim() || joining}
                onClick={() => void joinAsNewMember()}
                style={newName.trim() && !joining ? gradient : undefined}
                className="press min-h-13 w-full rounded-2xl bg-surface-2 py-3.5 font-semibold text-on-accent disabled:text-muted"
              >
                {joining ? "Dodawanie…" : "Dołącz"}
              </button>
              <button
                onClick={() => {
                  setAddingSelf(false);
                  setJoinError(null);
                }}
                className="press min-h-11 w-full rounded-xl text-[14px] font-medium text-muted"
              >
                Anuluj
              </button>
            </div>
          ) : (
            <>
              <button
                disabled={!selected}
                onClick={() => selected && setStep("payment")}
                style={selected ? gradient : undefined}
                className="press mt-8 min-h-13 w-full rounded-2xl bg-surface-2 py-3.5 font-semibold text-on-accent disabled:text-muted"
              >
                Dalej
              </button>
              <button
                onClick={() => setAddingSelf(true)}
                className="press mt-2 min-h-11 w-full rounded-xl text-[14px] font-medium text-accent"
              >
                Nie ma mnie na liście
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
