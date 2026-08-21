import { useState } from "react";
import { Header } from "../components/Header";
import { Avatar } from "../components/Avatar";
import { Banner } from "../components/Banner";
import { Icon } from "../components/Icon";
import { useIdentity } from "../context/IdentityContext";
import { useLedger } from "../context/LedgerContext";
import { useToast } from "../context/ToastContext";
import { useTheme, type ThemePreference } from "../context/ThemeContext";
import { SegmentedControl } from "../components/SegmentedControl";
import { useInstallPrompt } from "../lib/useInstallPrompt";
import {
  addMember,
  renameMember,
  setMemberHidden,
  setMemberPayment,
  setSettings,
} from "../lib/api";
import { buildCsv, downloadFile } from "../lib/share";
import type { Ledger, Member } from "../../shared/types";

const sectionTitle = "mb-2 px-1 text-[13px] font-semibold uppercase tracking-[0.06em] text-muted";
const inputClass =
  "min-h-12 w-full rounded-2xl border border-line bg-surface px-4 py-2.5 text-[15px] text-ink outline-none transition-colors placeholder:text-muted focus:border-accent focus:ring-4 focus:ring-accent/15";

function MemberEditor({
  member,
  busy,
  onSave,
  onToggleHidden,
  onClose,
}: {
  member: Member;
  busy: boolean;
  onSave: (name: string, blik: string, iban: string) => void;
  onToggleHidden: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(member.name);
  const [blik, setBlik] = useState(member.payment?.blik ?? "");
  const [iban, setIban] = useState(member.payment?.iban ?? "");

  return (
    <div className="space-y-3 border-t border-line bg-surface-2/50 px-4 py-4">
      <div>
        <label className="mb-1.5 block text-[13px] font-medium text-muted">Imię</label>
        <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
      </div>
      <div>
        <label className="mb-1.5 block text-[13px] font-medium text-muted">
          BLIK (numer telefonu)
        </label>
        <input
          value={blik}
          onChange={(e) => setBlik(e.target.value)}
          inputMode="tel"
          placeholder="np. 600 100 200"
          className={inputClass}
        />
      </div>
      <div>
        <label className="mb-1.5 block text-[13px] font-medium text-muted">Numer konta</label>
        <input
          value={iban}
          onChange={(e) => setIban(e.target.value)}
          placeholder="PL00 0000 0000 0000 0000 0000 0000"
          className={inputClass}
        />
      </div>
      <div className="flex gap-2 pt-1">
        <button
          disabled={busy || !name.trim()}
          onClick={() => onSave(name, blik, iban)}
          className="press min-h-11 flex-1 rounded-xl bg-accent font-medium text-on-accent disabled:opacity-40"
        >
          Zapisz
        </button>
        <button
          disabled={busy}
          onClick={onToggleHidden}
          className="press min-h-11 rounded-xl border border-line px-4 text-[14px] font-medium text-muted"
        >
          {member.hidden ? "Pokaż" : "Ukryj"}
        </button>
        <button
          onClick={onClose}
          className="press min-h-11 rounded-xl px-4 text-[14px] font-medium text-muted"
        >
          Anuluj
        </button>
      </div>
    </div>
  );
}

export function Settings() {
  const { ledger, applyLedger } = useLedger();
  const { whoAmI, setWhoAmI } = useIdentity();
  const { showToast } = useToast();
  const { theme, setTheme } = useTheme();
  const { canInstall, installed, promptInstall } = useInstallPrompt();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<Ledger>, fallback: string) => {
    setBusy(true);
    setError(null);
    try {
      applyLedger(await fn());
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : fallback);
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleAddMember = async () => {
    const name = newName.trim();
    if (!name) return;
    if (await run(() => addMember(name), "Nie udało się dodać osoby")) {
      setNewName("");
      showToast(`Dodano: ${name}`);
    }
  };

  const handleSaveMember = async (member: Member, name: string, blik: string, iban: string) => {
    let ok = true;
    if (name.trim() && name.trim() !== member.name) {
      ok = await run(
        () => renameMember(member.id, name.trim()),
        "Nie udało się zmienić imienia",
      );
    }
    if (ok) {
      ok = await run(
        () => setMemberPayment(member.id, { blik, iban }),
        "Nie udało się zapisać danych do przelewu",
      );
    }
    if (ok) {
      setEditingId(null);
      showToast("Zapisano");
    }
  };

  const handleExportCsv = () => {
    if (!ledger) return;
    const stamp = new Date().toISOString().slice(0, 10);
    downloadFile(`rozliczenia-${stamp}.csv`, buildCsv(ledger.members, ledger.entries), "text/csv");
    showToast("Wyeksportowano plik CSV");
  };

  if (!ledger) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-bg text-sm text-muted">
        Ładowanie…
      </div>
    );
  }

  const requireConfirmation = ledger.settings?.requireConfirmation ?? false;

  return (
    <div className="flex min-h-dvh flex-col bg-bg">
      <Header title="Ustawienia" back right={<span />} />
      <div
        style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom))" }}
        className="mx-auto w-full max-w-md space-y-6 px-4 pt-4"
      >
        {error && (
          <Banner tone="neg" icon="alert">
            {error}
          </Banner>
        )}

        <section>
          <h2 className={sectionTitle}>Wygląd</h2>
          <SegmentedControl
            value={theme}
            onChange={(v: ThemePreference) => setTheme(v)}
            options={[
              { value: "system", label: "Systemowy" },
              { value: "light", label: "Jasny" },
              { value: "dark", label: "Ciemny" },
            ]}
          />
        </section>

        <section>
          <h2 className={sectionTitle}>Potwierdzanie przelewów</h2>
          <button
            onClick={() =>
              run(
                () => setSettings({ requireConfirmation: !requireConfirmation }),
                "Nie udało się zmienić ustawienia",
              )
            }
            disabled={busy}
            aria-pressed={requireConfirmation}
            className="press card flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left"
          >
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-medium text-ink">
                Wymagaj potwierdzenia
              </span>
              <span className="block text-[13px] leading-relaxed text-muted">
                {requireConfirmation
                  ? "Przelew zmniejsza dług dopiero, gdy odbiorca potwierdzi."
                  : "Przelew liczy się od razu; potwierdzenie jest tylko informacją."}
              </span>
            </span>
            <span
              className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
                requireConfirmation ? "bg-accent" : "bg-surface-2"
              }`}
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-[left] ${
                  requireConfirmation ? "left-6" : "left-1"
                }`}
              />
            </span>
          </button>
        </section>

        <section>
          <h2 className={sectionTitle}>Kim jesteś</h2>
          <ul className="card divide-y divide-line overflow-hidden rounded-3xl">
            {ledger.members.map((m) => (
              <li key={m.id}>
                <button
                  onClick={() => setWhoAmI(m.id)}
                  className="press flex w-full items-center gap-3 px-4 py-3 text-left active:bg-surface-2"
                >
                  <Avatar name={m.name} seed={m.id} size="md" />
                  <span className="flex-1 text-[15px] font-medium text-ink">
                    {m.name}
                    {m.hidden && <span className="ml-2 text-[13px] text-muted">(ukryty)</span>}
                  </span>
                  {whoAmI === m.id && (
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-on-accent">
                      <Icon name="check" className="h-3.5 w-3.5" strokeWidth={3} />
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className={sectionTitle}>Uczestnicy i dane do przelewu</h2>
          <ul
            className={`card divide-y divide-line overflow-hidden rounded-3xl ${busy ? "opacity-60" : ""}`}
          >
            {ledger.members.map((m) => {
              const details = [m.payment?.blik, m.payment?.iban].filter(Boolean).join(" · ");
              return (
                <li key={m.id}>
                  <button
                    onClick={() => setEditingId(editingId === m.id ? null : m.id)}
                    className="press flex w-full items-center gap-3 px-4 py-3 text-left active:bg-surface-2"
                  >
                    <Avatar
                      name={m.name}
                      seed={m.id}
                      size="md"
                      className={m.hidden ? "opacity-50" : ""}
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className={`block text-[15px] font-medium ${m.hidden ? "text-muted" : "text-ink"}`}
                      >
                        {m.name}
                      </span>
                      <span className="block truncate text-[13px] text-muted">
                        {details || "Brak danych do przelewu"}
                      </span>
                    </span>
                    <Icon name="pencil" className="h-4 w-4 shrink-0 text-muted/70" />
                  </button>
                  {editingId === m.id && (
                    <MemberEditor
                      member={m}
                      busy={busy}
                      onSave={(name, blik, iban) => handleSaveMember(m, name, blik, iban)}
                      onToggleHidden={() =>
                        run(
                          () => setMemberHidden(m.id, !m.hidden),
                          "Nie udało się zaktualizować osoby",
                        )
                      }
                      onClose={() => setEditingId(null)}
                    />
                  )}
                </li>
              );
            })}
          </ul>
          <p className="mt-2 px-1 text-[13px] leading-relaxed text-muted">
            Dane do przelewu pokazują się przy rozliczaniu, żeby nie szukać numeru po czatach.
            Ukryte osoby nie pojawiają się przy nowych wydatkach, ale zostają w historii.
          </p>
        </section>

        <section>
          <h2 className={sectionTitle}>Dodaj osobę</h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddMember()}
              placeholder="Imię"
              className={inputClass}
            />
            <button
              disabled={busy || !newName.trim()}
              onClick={handleAddMember}
              aria-label="Dodaj osobę"
              style={
                newName.trim() && !busy
                  ? { background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }
                  : undefined
              }
              className="press flex min-h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-surface-2 text-on-accent disabled:text-muted"
            >
              <Icon name="plus" className="h-5 w-5" strokeWidth={2.25} />
            </button>
          </div>
        </section>

        <section>
          <h2 className={sectionTitle}>Aplikacja</h2>
          <div className="card divide-y divide-line overflow-hidden rounded-2xl">
            {installed ? (
              <p className="flex items-center gap-3 px-4 py-3 text-[15px] text-muted">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-pos-soft text-pos">
                  <Icon name="check" className="h-[18px] w-[18px]" strokeWidth={2.5} />
                </span>
                Aplikacja jest zainstalowana
              </p>
            ) : canInstall ? (
              <button
                onClick={async () => {
                  if (await promptInstall()) showToast("Zainstalowano aplikację");
                }}
                className="press flex w-full items-center gap-3 px-4 py-3 text-left active:bg-surface-2"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-accent">
                  <Icon name="plus" className="h-[18px] w-[18px]" strokeWidth={2.25} />
                </span>
                <span className="flex-1">
                  <span className="block text-[15px] font-medium text-ink">
                    Zainstaluj na telefonie
                  </span>
                  <span className="block text-[13px] text-muted">
                    Ikona na ekranie głównym, bez paska przeglądarki
                  </span>
                </span>
                <Icon name="chevron" className="h-4 w-4 text-muted/60" />
              </button>
            ) : (
              <p className="px-4 py-3 text-[13px] leading-relaxed text-muted">
                Aby zainstalować: w Safari wybierz <strong className="text-ink">Udostępnij →
                Do ekranu początkowego</strong>, w Chrome menu <strong className="text-ink">⋮ →
                Zainstaluj aplikację</strong>.
              </p>
            )}
          </div>
        </section>

        <section>
          <h2 className={sectionTitle}>Dane</h2>
          <button
            onClick={handleExportCsv}
            className="press card flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left active:bg-surface-2"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-2 text-muted">
              <Icon name="share" className="h-[18px] w-[18px]" />
            </span>
            <span className="flex-1">
              <span className="block text-[15px] font-medium text-ink">Eksportuj do CSV</span>
              <span className="block text-[13px] text-muted">
                Wszystkie wpisy do arkusza kalkulacyjnego
              </span>
            </span>
            <Icon name="chevron" className="h-4 w-4 text-muted/60" />
          </button>
        </section>
      </div>
    </div>
  );
}
