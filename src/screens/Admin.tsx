import { useCallback, useEffect, useState } from "react";
import { Header } from "../components/Header";
import { Banner } from "../components/Banner";
import { Icon } from "../components/Icon";
import { useToast } from "../context/ToastContext";
import { copyText } from "../lib/share";
import { STALE_DAYS, VERY_STALE_DAYS } from "../../shared/types";
import type { AdminGroupSummary, AdminListResponse } from "../../shared/types";

const inputClass =
  "min-h-12 w-full rounded-2xl border border-line bg-surface px-4 py-2.5 text-[15px] text-ink outline-none transition-colors placeholder:text-muted focus:border-accent focus:ring-4 focus:ring-accent/15";

const sectionTitle = "mb-2 px-1 text-[13px] font-semibold uppercase tracking-[0.06em] text-muted";

const gradient = {
  background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
  boxShadow: "var(--shadow-lift)",
};

const dateFormat = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium" });

function stamp(iso?: string): string {
  return iso ? dateFormat.format(new Date(iso)) : "—";
}

/** Idle events are flagged, never touched — the colour is the whole point. */
function StalenessBadge({ group }: { group: AdminGroupSummary }) {
  if (group.staleness === "fresh") return null;
  const veryStale = group.staleness === "very-stale";
  return (
    <span
      className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
      style={
        veryStale
          ? { color: "var(--neg)", background: "var(--neg-soft)" }
          : { color: "var(--warn)", background: "var(--warn-soft)" }
      }
    >
      {veryStale ? `${VERY_STALE_DAYS}+ dni` : `${STALE_DAYS}+ dni`}
    </span>
  );
}

function EventRow({
  group,
  busy,
  onAction,
  onCopyLink,
}: {
  group: AdminGroupSummary;
  busy: boolean;
  onAction: (action: "archive" | "restore" | "purge" | "clear-pin", slug: string) => void;
  onCopyLink: (slug: string) => void;
}) {
  const [confirmingPurge, setConfirmingPurge] = useState(false);
  const archived = Boolean(group.archivedAt);

  return (
    <li className="space-y-3 px-4 py-3.5">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-[15px] font-medium text-ink">
            <span className="truncate">{group.name}</span>
            {archived ? (
              <span
                className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
                style={{ color: "var(--neg)", background: "var(--neg-soft)" }}
              >
                Usunięte
              </span>
            ) : (
              <StalenessBadge group={group} />
            )}
            {group.isPrimary && (
              <span
                className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
                style={{ color: "var(--accent)", background: "var(--accent-soft)" }}
              >
                Główna
              </span>
            )}
            {group.pinEnabled && (
              <span className="shrink-0 text-muted" title="Chronione PIN-em">
                <Icon name="lock" className="h-3.5 w-3.5" />
              </span>
            )}
          </p>
          <p className="num mt-0.5 truncate text-[12px] text-muted">/g/{group.slug}</p>
        </div>
        <button
          aria-label={`Kopiuj link do ${group.name}`}
          onClick={() => onCopyLink(group.slug)}
          className="press flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted active:bg-surface-2"
        >
          <Icon name="copy" className="h-4 w-4" />
        </button>
      </div>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[13px]">
        <div className="flex gap-2">
          <dt className="text-muted">Osób</dt>
          <dd className="num text-ink">{group.memberCount}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-muted">Wpisów</dt>
          <dd className="num text-ink">{group.entryCount}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-muted">Utworzone</dt>
          <dd className="num text-ink">{stamp(group.createdAt)}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-muted">Bezczynne</dt>
          <dd className="num text-ink">
            {group.idleDays === null ? "—" : `${group.idleDays} dni`}
          </dd>
        </div>
      </dl>

      {confirmingPurge ? (
        <div className="anim-rise flex items-center gap-2 rounded-xl bg-neg-soft px-3 py-2">
          <span className="flex-1 text-[13px] font-medium" style={{ color: "var(--neg)" }}>
            Skasować bezpowrotnie?
          </span>
          <button
            disabled={busy}
            onClick={() => onAction("purge", group.slug)}
            className="press min-h-9 rounded-lg px-3 text-[14px] font-semibold text-on-accent"
            style={{ background: "var(--neg)" }}
          >
            Kasuj
          </button>
          <button
            onClick={() => setConfirmingPurge(false)}
            className="press min-h-9 rounded-lg px-3 text-[14px] font-medium text-muted"
          >
            Anuluj
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          {!group.isPrimary && (
            <button
              disabled={busy}
              onClick={() => onAction(archived ? "restore" : "archive", group.slug)}
              className="press min-h-10 flex-1 rounded-xl border border-line text-[14px] font-medium text-ink disabled:opacity-40"
            >
              {archived ? "Przywróć" : "Usuń"}
            </button>
          )}
          {group.pinEnabled && (
            <button
              disabled={busy}
              onClick={() => onAction("clear-pin", group.slug)}
              className="press min-h-10 flex-1 rounded-xl border border-line text-[14px] font-medium text-ink disabled:opacity-40"
            >
              Zdejmij PIN
            </button>
          )}
          {archived && !group.isPrimary && (
            <button
              disabled={busy}
              onClick={() => setConfirmingPurge(true)}
              className="press min-h-10 flex-1 rounded-xl border text-[14px] font-medium disabled:opacity-40"
              style={{ borderColor: "var(--neg)", color: "var(--neg)" }}
            >
              Skasuj
            </button>
          )}
          {group.isPrimary && !group.pinEnabled && (
            <p className="flex-1 py-2 text-[13px] text-muted">
              Główna grupa &mdash; nie można jej usunąć.
            </p>
          )}
        </div>
      )}
    </li>
  );
}

/**
 * Operator's view of every stored event. Reachable at /admin and gated by
 * ADMIN_TOKEN rather than by group membership, so it works from any device
 * without joining anything.
 *
 * The token is posted once to /api/admin-login and exchanged for an HttpOnly
 * session cookie; it is never held in storage this page can read.
 */
export function Admin() {
  const { showToast } = useToast();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [draft, setDraft] = useState("");
  const [data, setData] = useState<AdminListResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const signOut = useCallback(async () => {
    await fetch("/api/admin-login", { method: "DELETE" }).catch(() => null);
    setSignedIn(false);
    setData(null);
  }, []);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin");
      if (res.status === 401) {
        setSignedIn(false);
        setData(null);
        return;
      }
      if (!res.ok) throw new Error("Nie udało się pobrać listy wydarzeń");
      setData((await res.json()) as AdminListResponse);
      setSignedIn(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się pobrać listy wydarzeń");
    } finally {
      setBusy(false);
    }
  }, []);

  const signIn = useCallback(async () => {
    const token = draft.trim();
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => null);
        throw new Error(detail?.error ?? "Nieprawidłowy token");
      }
      setDraft("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nieprawidłowy token");
    } finally {
      setBusy(false);
    }
  }, [draft, load]);

  // One probe on mount: an existing cookie means no login screen at all.
  useEffect(() => {
    void load();
  }, [load]);

  const act = async (action: "archive" | "restore" | "purge" | "clear-pin", slug: string) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, slug }),
      });
      if (!res.ok) {
        const detail = await res.json().catch(() => null);
        throw new Error(detail?.error ?? "Operacja nie powiodła się");
      }
      showToast(
        action === "restore"
          ? "Wydarzenie przywrócone"
          : action === "purge"
            ? "Wydarzenie skasowane"
            : action === "clear-pin"
              ? "PIN zdjęty"
              : "Wydarzenie usunięte",
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Operacja nie powiodła się");
    } finally {
      setBusy(false);
    }
  };

  const copyLink = async (slug: string) => {
    const link = `${window.location.origin}/g/${slug}`;
    showToast((await copyText(link)) ? "Link skopiowany" : "Nie udało się skopiować");
  };

  if (signedIn !== true) {
    return (
      <div className="app-shell bg-bg">
        <Header title="Administracja" right={<span />} />
        <div className="app-scroll">
          <div className="anim-rise mx-auto w-full max-w-md space-y-4 px-4 pt-6">
            {error && (
              <Banner tone="neg" icon="alert">
                {error}
              </Banner>
            )}
            <p className="px-1 text-[15px] leading-relaxed text-muted">
              Podaj token administratora, aby zobaczyć wszystkie wydarzenia.
            </p>
            <input
              type="password"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void signIn()}
              placeholder="Token"
              aria-label="Token administratora"
              className={inputClass}
            />
            <button
              disabled={!draft.trim() || busy}
              onClick={() => void signIn()}
              style={draft.trim() && !busy ? gradient : undefined}
              className="press min-h-13 w-full rounded-2xl bg-surface-2 py-3.5 font-semibold text-on-accent disabled:text-muted"
            >
              {busy ? "Sprawdzanie…" : "Zaloguj"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const active = (data?.groups.filter((g) => !g.archivedAt) ?? [])
    .slice()
    .sort((a, b) => (b.idleDays ?? 0) - (a.idleDays ?? 0));
  const staleCount = active.filter((g) => g.staleness !== "fresh" && !g.isPrimary).length;
  const archived = data?.groups.filter((g) => g.archivedAt) ?? [];

  return (
    <div className="app-shell bg-bg">
      <Header
        title="Administracja"
        right={
          <button
            onClick={() => void signOut()}
            className="press mr-1 flex h-11 items-center rounded-full px-3 text-[13px] font-medium text-muted"
          >
            Wyloguj
          </button>
        }
      />
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

          {data && (
            <div className="card rounded-2xl px-4 py-3 text-[13px] leading-relaxed text-muted">
              Nic nie jest usuwane automatycznie. Wydarzenia bez zmian od {data.staleDays} dni są
              oznaczane na żółto, a od {data.veryStaleDays} dni na czerwono — usuwasz je ręcznie.
            </div>
          )}

          <section>
            <h2 className={sectionTitle}>
              Aktywne ({active.length})
              {staleCount > 0 && (
                <span className="ml-2 font-medium normal-case tracking-normal">
                  · {staleCount} bez zmian
                </span>
              )}
            </h2>
            {active.length === 0 ? (
              <p className="card rounded-2xl px-4 py-6 text-center text-sm text-muted">
                {busy ? "Ładowanie…" : "Brak aktywnych wydarzeń."}
              </p>
            ) : (
              <ul className="stagger-rows card divide-y divide-line overflow-hidden rounded-3xl">
                {active.map((g) => (
                  <EventRow
                    key={g.slug}
                    group={g}
                    busy={busy}
                    onAction={act}
                    onCopyLink={copyLink}
                  />
                ))}
              </ul>
            )}
          </section>

          {archived.length > 0 && (
            <section>
              <h2 className={sectionTitle}>Usunięte ({archived.length})</h2>
              <ul className="stagger-rows card divide-y divide-line overflow-hidden rounded-3xl">
                {archived.map((g) => (
                  <EventRow
                    key={g.slug}
                    group={g}
                    busy={busy}
                    onAction={act}
                    onCopyLink={copyLink}
                  />
                ))}
              </ul>
              <p className="mt-2 px-1 text-[13px] leading-relaxed text-muted">
                Usunięte wydarzenia zostają w bazie i można je przywrócić. &bdquo;Skasuj&rdquo;
                kasuje je bezpowrotnie.
              </p>
            </section>
          )}

          <button
            onClick={() => void load()}
            disabled={busy}
            className="press card min-h-12 w-full rounded-2xl font-medium text-ink disabled:opacity-40"
          >
            {busy ? "Odświeżanie…" : "Odśwież"}
          </button>
        </div>
      </div>
    </div>
  );
}
