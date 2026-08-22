import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "../components/Header";
import { Avatar } from "../components/Avatar";
import { Banner } from "../components/Banner";
import { Icon } from "../components/Icon";
import { useLedger } from "../context/LedgerContext";
import { useToast } from "../context/ToastContext";
import { createGroup, setGroupSlug } from "../lib/api";
import { copyText, shareText } from "../lib/share";
import { STALE_DAYS } from "../../shared/types";

const inputClass =
  "min-h-12 w-full rounded-2xl border border-line bg-surface px-4 py-2.5 text-[15px] text-ink outline-none transition-colors placeholder:text-muted focus:border-accent focus:ring-4 focus:ring-accent/15";

const sectionTitle = "mb-2 px-1 text-[13px] font-semibold uppercase tracking-[0.06em] text-muted";

const gradient = {
  background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
  boxShadow: "var(--shadow-lift)",
};

/**
 * Creates a separate event with its own people and its own secret link. The
 * link is the whole point, so the screen does not move on until it has been
 * shown and can be copied.
 */
export function NewEvent() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { refetch } = useLedger();

  const [name, setName] = useState("");
  const [people, setPeople] = useState<string[]>(["", ""]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ slug: string; name: string } | null>(null);

  const filled = people.map((p) => p.trim()).filter(Boolean);
  const canSubmit = Boolean(name.trim()) && filled.length >= 2 && !busy;

  const setPerson = (index: number, value: string) =>
    setPeople((prev) => prev.map((p, i) => (i === index ? value : p)));

  const removePerson = (index: number) =>
    setPeople((prev) => (prev.length <= 2 ? prev : prev.filter((_, i) => i !== index)));

  const handleCreate = async () => {
    setBusy(true);
    setError(null);
    try {
      const { slug } = await createGroup(name.trim(), filled);
      setCreated({ slug, name: name.trim() });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się utworzyć wydarzenia");
    } finally {
      setBusy(false);
    }
  };

  if (created) {
    const link = `${window.location.origin}/g/${created.slug}`;

    // Switching this device over is a separate, deliberate step — the link has
    // to reach everyone else first.
    const openIt = () => {
      setGroupSlug(created.slug);
      void refetch();
      navigate("/", { replace: true });
    };

    return (
      <div className="app-shell bg-bg">
        <Header title="Gotowe" right={<span />} />
        <div className="app-scroll">
          <div
            style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom))" }}
            className="stagger mx-auto w-full max-w-md space-y-5 px-4 pt-4"
          >
            <section className="card relative isolate overflow-hidden rounded-3xl px-6 pb-7 pt-6 text-center">
              <div
                aria-hidden="true"
                className="anim-glow pointer-events-none absolute inset-0"
                style={{
                  background:
                    "radial-gradient(115% 90% at 100% 0%, color-mix(in oklab, var(--pos) 26%, transparent), transparent 62%)",
                }}
              />
              <span
                className="anim-pop relative mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-on-accent"
                style={gradient}
              >
                <Icon name="check" className="h-7 w-7" strokeWidth={2.5} />
              </span>
              <h2 className="relative text-xl font-bold tracking-tight text-ink">{created.name}</h2>
              <p className="relative mt-2 text-[15px] leading-relaxed text-muted">
                Wydarzenie utworzone. Wyślij ten link uczestnikom &mdash; kto go ma, ten ma dostęp.
              </p>
            </section>

            <div className="card flex items-center gap-2 rounded-2xl px-4 py-3">
              <span className="num min-w-0 flex-1 truncate text-[14px] text-muted">{link}</span>
              <button
                aria-label="Kopiuj link"
                onClick={async () =>
                  showToast((await copyText(link)) ? "Link skopiowany" : "Nie udało się skopiować")
                }
                className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted active:bg-surface-2"
              >
                <Icon name="copy" className="h-[18px] w-[18px]" />
              </button>
            </div>

            <button
              onClick={async () => {
                const result = await shareText(created.name, link);
                if (result === "copied") showToast("Link skopiowany do schowka");
                else if (result === "failed") showToast("Nie udało się udostępnić linku");
              }}
              style={gradient}
              className="press min-h-13 w-full rounded-2xl py-3.5 font-semibold text-on-accent"
            >
              Udostępnij link
            </button>

            <button
              onClick={openIt}
              className="press card min-h-13 w-full rounded-2xl py-3.5 font-semibold text-ink"
            >
              Otwórz to wydarzenie
            </button>

            <p className="px-1 text-[13px] leading-relaxed text-muted">
              Zachowaj link &mdash; bez niego nikt nie wejdzie do wydarzenia. Nic nie znika samo:
              wydarzenia bez zmian od {STALE_DAYS} dni są tylko oznaczane jako nieużywane.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell bg-bg">
      <Header title="Nowe wydarzenie" back right={<span />} />
      <div className="app-scroll">
        <div
          style={{ paddingBottom: "calc(2rem + env(safe-area-inset-bottom))" }}
          className="stagger mx-auto w-full max-w-md space-y-5 px-4 pt-4"
        >
          {error && (
            <Banner tone="neg" icon="alert">
              {error}
            </Banner>
          )}

          <section>
            <label htmlFor="event-name" className={`block ${sectionTitle}`}>
              Nazwa wydarzenia
            </label>
            <input
              id="event-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              placeholder="np. Kawalerski Sławka"
              className={inputClass}
            />
          </section>

          <section>
            <h2 className={sectionTitle}>Kto bierze udział</h2>
            <ul className="stagger-rows card divide-y divide-line overflow-hidden rounded-3xl">
              {people.map((person, i) => (
                <li key={i} className="flex items-center gap-3 px-3 py-2">
                  <Avatar name={person || "?"} seed={`new-${i}`} size="md" />
                  <input
                    value={person}
                    onChange={(e) => setPerson(i, e.target.value)}
                    maxLength={60}
                    placeholder={`Osoba ${i + 1}`}
                    aria-label={`Osoba ${i + 1}`}
                    className="min-h-11 min-w-0 flex-1 border-none bg-transparent text-[15px] text-ink outline-none placeholder:text-muted"
                  />
                  <button
                    disabled={people.length <= 2}
                    onClick={() => removePerson(i)}
                    aria-label={`Usuń osobę ${i + 1}`}
                    className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted active:bg-surface-2 disabled:opacity-30"
                  >
                    <Icon name="trash" className="h-[18px] w-[18px]" />
                  </button>
                </li>
              ))}
            </ul>

            <button
              onClick={() => setPeople((prev) => [...prev, ""])}
              className="press mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-line text-[15px] font-medium text-muted"
            >
              <Icon name="plus" className="h-[18px] w-[18px]" strokeWidth={2.25} />
              Dodaj osobę
            </button>
          </section>

          <button
            disabled={!canSubmit}
            onClick={handleCreate}
            style={canSubmit ? gradient : undefined}
            className="press min-h-13 w-full rounded-2xl bg-surface-2 py-3.5 font-semibold text-on-accent disabled:text-muted"
          >
            {busy ? "Tworzenie…" : "Utwórz wydarzenie"}
          </button>

          <p className="px-1 text-[13px] leading-relaxed text-muted">
            Wydarzenie dostanie własny, tajny link i własne rozliczenia &mdash; obecna grupa
            zostaje nietknięta. Nieużywane wydarzenia są oznaczane po {STALE_DAYS} dniach, ale nie
            znikają same.
          </p>
        </div>
      </div>
    </div>
  );
}
