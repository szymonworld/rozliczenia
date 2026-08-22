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
import { PinSettings } from "../components/PinSettings";
import { useInstallPrompt } from "../lib/useInstallPrompt";
import {
  addMember,
  archiveGroup,
  clearGroupSlug,
  clearPin,
  removeMember,
  setPin,
  renameMember,
  setMemberHidden,
  setMemberPayment,
  setSettings,
  getGroupSlug,
} from "../lib/api";
import { DEFAULT_GROUP_NAME, groupName, memberUsageCount } from "../lib/ledgerView";
import { PIN_MAX_LENGTH, PIN_MIN_LENGTH, STALE_DAYS, VERY_STALE_DAYS } from "../../shared/types";
import { buildCsv, downloadFile, shareText } from "../lib/share";
import type { Ledger, Member } from "../../shared/types";

const sectionTitle = "mb-2 px-1 text-[13px] font-semibold uppercase tracking-[0.06em] text-muted";

const dateFormat = new Intl.DateTimeFormat("pl-PL", { dateStyle: "long" });

/** Whole days since an ISO timestamp, or null when there is no timestamp. */
function daysSince(iso?: string): number | null {
  if (!iso) return null;
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return null;
  return Math.floor((Date.now() - then) / 86_400_000);
}
const inputClass =
  "min-h-12 w-full rounded-2xl border border-line bg-surface px-4 py-2.5 text-[15px] text-ink outline-none transition-colors placeholder:text-muted focus:border-accent focus:ring-4 focus:ring-accent/15";

/** Renames the whole group. Keyed on the saved name so it resets after a save. */
function GroupNameForm({
  initial,
  busy,
  onSave,
}: {
  initial: string;
  busy: boolean;
  onSave: (name: string) => void;
}) {
  const [value, setValue] = useState(initial);
  const trimmed = value.trim();
  const dirty = trimmed !== initial;

  return (
    <>
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && dirty && onSave(trimmed)}
          maxLength={60}
          placeholder={DEFAULT_GROUP_NAME}
          aria-label="Nazwa grupy"
          className={inputClass}
        />
        <button
          disabled={busy || !dirty}
          onClick={() => onSave(trimmed)}
          aria-label="Zapisz nazwę grupy"
          style={
            dirty && !busy
              ? { background: "linear-gradient(135deg, var(--accent), var(--accent-2))" }
              : undefined
          }
          className="press flex min-h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-surface-2 text-on-accent disabled:text-muted"
        >
          <Icon name="check" className="h-5 w-5" strokeWidth={2.5} />
        </button>
      </div>
      <p className="mt-2 px-1 text-[13px] leading-relaxed text-muted">
        Pokazuje się na górze ekranu głównego i w udostępnianym podsumowaniu. Puste pole wraca
        do &bdquo;{DEFAULT_GROUP_NAME}&rdquo;.
      </p>
    </>
  );
}

function MemberEditor({
  member,
  busy,
  usageCount,
  canRemove,
  onSave,
  onToggleHidden,
  onRemove,
  onClose,
}: {
  member: Member;
  busy: boolean;
  usageCount: number;
  canRemove: boolean;
  onSave: (name: string, blik: string, iban: string) => void;
  onToggleHidden: () => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(member.name);
  const [blik, setBlik] = useState(member.payment?.blik ?? "");
  const [iban, setIban] = useState(member.payment?.iban ?? "");
  const [confirmingRemove, setConfirmingRemove] = useState(false);

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
          onClick={onClose}
          className="press min-h-11 rounded-xl px-4 text-[14px] font-medium text-muted"
        >
          Anuluj
        </button>
      </div>

      {confirmingRemove ? (
        // Removal is irreversible, so it always costs a second tap.
        <div className="anim-rise flex items-center gap-2 rounded-xl bg-neg-soft px-3 py-2">
          <span className="flex-1 text-[13px] font-medium" style={{ color: "var(--neg)" }}>
            Usunąć {member.name}?
          </span>
          <button
            disabled={busy}
            onClick={onRemove}
            className="press min-h-9 rounded-lg px-3 text-[14px] font-semibold text-on-accent"
            style={{ background: "var(--neg)" }}
          >
            Usuń
          </button>
          <button
            onClick={() => setConfirmingRemove(false)}
            className="press min-h-9 rounded-lg px-3 text-[14px] font-medium text-muted"
          >
            Anuluj
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            disabled={busy}
            onClick={onToggleHidden}
            className="press min-h-11 flex-1 rounded-xl border border-line text-[14px] font-medium text-muted"
          >
            {member.hidden ? "Pokaż" : "Ukryj"}
          </button>
          <button
            disabled={busy || !canRemove}
            onClick={() => setConfirmingRemove(true)}
            className="press min-h-11 flex-1 rounded-xl border text-[14px] font-medium disabled:opacity-40"
            style={{ borderColor: "var(--neg)", color: "var(--neg)" }}
          >
            Usuń
          </button>
        </div>
      )}

      {!canRemove && (
        <p className="px-1 text-[13px] leading-relaxed text-muted">
          {usageCount > 0
            ? `${member.name} występuje w ${usageCount} wpisach, więc usunięcie rozsypałoby historię — ukryj tę osobę zamiast usuwać.`
            : "W grupie musi zostać co najmniej jedna osoba."}
        </p>
      )}
    </div>
  );
}

export function Settings() {
  const { ledger, applyLedger } = useLedger();
  const { whoAmI, setWhoAmI, clearWhoAmI } = useIdentity();
  const { showToast } = useToast();
  const { theme, setTheme } = useTheme();
  const { canInstall, installed, promptInstall } = useInstallPrompt();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmingArchive, setConfirmingArchive] = useState(false);
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

  const handleRenameGroup = async (name: string) => {
    if (await run(() => setSettings({ groupName: name }), "Nie udało się zmienić nazwy")) {
      showToast(name ? `Nazwa grupy: ${name}` : "Przywrócono domyślną nazwę");
    }
  };

  const handleSetPin = async (pin: string, currentPin?: string) => {
    if (await run(() => setPin(pin, currentPin), "Nie udało się ustawić PIN-u")) {
      showToast("PIN zapisany");
    }
  };

  const handleClearPin = async (currentPin: string) => {
    if (await run(() => clearPin(currentPin), "Nie udało się usunąć PIN-u")) {
      showToast("PIN usunięty");
    }
  };

  const handleArchiveGroup = async () => {
    if (await run(() => archiveGroup(whoAmI ?? undefined), "Nie udało się usunąć wydarzenia")) {
      // The link is dead now, so this device must forget it too — otherwise the
      // app would sit on a slug that answers 404.
      clearGroupSlug();
      clearWhoAmI();
      window.location.replace("/");
    }
  };

  const handleRemoveMember = async (member: Member) => {
    if (await run(() => removeMember(member.id), "Nie udało się usunąć osoby")) {
      // This device was that person — send it back to the name picker rather
      // than leaving it pointed at an id that no longer exists.
      if (whoAmI === member.id) clearWhoAmI();
      setEditingId(null);
      showToast(`Usunięto: ${member.name}`);
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
      <div className="app-shell items-center justify-center bg-bg text-sm text-muted">
        Ładowanie…
      </div>
    );
  }

  const requireConfirmation = ledger.settings?.requireConfirmation ?? false;

  return (
    <div className="app-shell bg-bg">
      <Header title="Ustawienia" back right={<span />} />
      <div className="app-scroll">
        <div
          style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom))" }}
          className="stagger mx-auto w-full max-w-md space-y-6 px-4 pt-4"
        >
          {error && (
            <Banner tone="neg" icon="alert">
              {error}
            </Banner>
          )}

          <section>
            <h2 className={sectionTitle}>Nazwa grupy</h2>
            <GroupNameForm
              key={ledger.settings?.groupName ?? ""}
              initial={groupName(ledger) === DEFAULT_GROUP_NAME ? "" : groupName(ledger)}
              busy={busy}
              onSave={handleRenameGroup}
            />
          </section>

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
                        usageCount={memberUsageCount(ledger, m.id)}
                        canRemove={
                          memberUsageCount(ledger, m.id) === 0 && ledger.members.length > 1
                        }
                        onSave={(name, blik, iban) => handleSaveMember(m, name, blik, iban)}
                        onToggleHidden={() =>
                          run(
                            () => setMemberHidden(m.id, !m.hidden),
                            "Nie udało się zaktualizować osoby",
                          )
                        }
                        onRemove={() => handleRemoveMember(m)}
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
            <h2 className={sectionTitle}>Kod PIN</h2>
            <PinSettings
              enabled={Boolean(ledger.pinEnabled)}
              busy={busy}
              minLength={PIN_MIN_LENGTH}
              maxLength={PIN_MAX_LENGTH}
              onSet={handleSetPin}
              onClear={handleClearPin}
            />
          </section>

          <section>
            <h2 className={sectionTitle}>Link do grupy</h2>
            <button
              onClick={async () => {
                const link = `${window.location.origin}/g/${getGroupSlug() ?? ""}`;
                const result = await shareText("Rozliczenia — link do grupy", link);
                if (result === "copied") showToast("Link skopiowany do schowka");
                else if (result === "failed") showToast("Nie udało się udostępnić linku");
              }}
              className="press card flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left active:bg-surface-2"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
                <Icon name="share" className="h-[18px] w-[18px]" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-medium text-ink">Udostępnij link</span>
                <span className="block truncate text-[13px] text-muted">
                  /g/{getGroupSlug()}
                </span>
              </span>
              <Icon name="chevron" className="h-4 w-4 shrink-0 text-muted/60" />
            </button>
            <p className="mt-2 px-1 text-[13px] leading-relaxed text-muted">
              Każdy, kto ma ten link, ma dostęp do rozliczeń. Wysyłaj go tylko swoim.
            </p>
          </section>

          {(ledger.createdAt || ledger.updatedAt) && (
            <section>
              <h2 className={sectionTitle}>To wydarzenie</h2>
              <div className="card divide-y divide-line overflow-hidden rounded-2xl">
                {ledger.createdAt && (
                  <p className="flex items-baseline gap-3 px-4 py-3 text-[15px]">
                    <span className="flex-1 text-ink">Utworzone</span>
                    <span className="num text-[14px] text-muted">
                      {dateFormat.format(new Date(ledger.createdAt))}
                    </span>
                  </p>
                )}
                {ledger.updatedAt && (
                  <p className="flex items-baseline gap-3 px-4 py-3 text-[15px]">
                    <span className="flex-1 text-ink">Ostatnia zmiana</span>
                    <span className="num text-[14px] text-muted">
                      {dateFormat.format(new Date(ledger.updatedAt))}
                    </span>
                  </p>
                )}
              </div>
              <p className="mt-2 px-1 text-[13px] leading-relaxed text-muted">
                {(() => {
                  const idle = daysSince(ledger.updatedAt ?? ledger.createdAt);
                  if (idle === null) return "Nic nie jest usuwane automatycznie.";
                  if (idle >= VERY_STALE_DAYS)
                    return `Bez zmian od ${idle} dni — oznaczone jako nieużywane (${VERY_STALE_DAYS}+). Nic nie znika samo.`;
                  if (idle >= STALE_DAYS)
                    return `Bez zmian od ${idle} dni — oznaczone jako nieużywane (${STALE_DAYS}+). Nic nie znika samo.`;
                  return `Wydarzenie jest aktywne. Po ${STALE_DAYS} dniach bez zmian zostanie oznaczone jako nieużywane — ale nie zniknie samo.`;
                })()}
              </p>
            </section>
          )}

          {ledger.createdAt && (
            <section>
              <h2 className={sectionTitle}>Usuń wydarzenie</h2>
              {confirmingArchive ? (
                <div className="anim-rise card space-y-3 rounded-2xl px-4 py-4">
                  <p className="text-[15px] font-medium text-ink">
                    Usunąć &bdquo;{groupName(ledger)}&rdquo;?
                  </p>
                  <p className="text-[13px] leading-relaxed text-muted">
                    Link przestanie działać dla wszystkich uczestników. Dane zostają w bazie i
                    administrator może je przywrócić.
                  </p>
                  <div className="flex gap-2">
                    <button
                      disabled={busy}
                      onClick={handleArchiveGroup}
                      className="press min-h-11 flex-1 rounded-xl font-semibold text-on-accent disabled:opacity-40"
                      style={{ background: "var(--neg)" }}
                    >
                      Usuń wydarzenie
                    </button>
                    <button
                      onClick={() => setConfirmingArchive(false)}
                      className="press min-h-11 rounded-xl px-4 text-[14px] font-medium text-muted"
                    >
                      Anuluj
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  disabled={busy}
                  onClick={() => setConfirmingArchive(true)}
                  className="press card flex min-h-13 w-full items-center gap-3 rounded-2xl px-4 text-left disabled:opacity-40"
                >
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
                    style={{ color: "var(--neg)", background: "var(--neg-soft)" }}
                  >
                    <Icon name="trash" className="h-[18px] w-[18px]" />
                  </span>
                  <span className="flex-1">
                    <span className="block text-[15px] font-medium" style={{ color: "var(--neg)" }}>
                      Usuń to wydarzenie
                    </span>
                    <span className="block text-[13px] text-muted">
                      Link przestanie działać, dane zostaną w bazie
                    </span>
                  </span>
                  <Icon name="chevron" className="h-4 w-4 shrink-0 text-muted/60" />
                </button>
              )}
            </section>
          )}

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
    </div>
  );
}
