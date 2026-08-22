import { useState } from "react";
import { Avatar } from "../components/Avatar";
import { Icon } from "../components/Icon";
import { setGroupSlug } from "../lib/api";
import { forgetGroup, listKnownGroups } from "../lib/groups";

const gradient = {
  background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
  boxShadow: "var(--shadow-lift)",
};

/**
 * Shown when this device has no group selected. Usually that means a first
 * visit — but it also happens on a return visit after storage was cleared, so
 * any group opened before is offered here rather than making you hunt for the
 * link again.
 */
export function NeedLink() {
  const [value, setValue] = useState("");
  const [known, setKnown] = useState(listKnownGroups);
  const [pasting, setPasting] = useState(() => listKnownGroups().length === 0);

  const openSlug = (slug: string) => {
    setGroupSlug(slug);
    // Full reload rather than a route change: identity is per group and is
    // read once at start-up, so the whole tree has to re-initialise.
    window.location.replace("/");
  };

  const open = () => {
    // Accept a full link or just the slug — people paste whatever they have.
    const trimmed = value.trim();
    const slug = trimmed.includes("/g/")
      ? trimmed.split("/g/").pop()!.replace(/[/?#].*$/, "")
      : trimmed;
    if (!slug) return;
    openSlug(slug);
  };

  const forget = (slug: string) => {
    forgetGroup(slug);
    const rest = listKnownGroups();
    setKnown(rest);
    if (rest.length === 0) setPasting(true);
  };

  return (
    <div
      style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
      className="app-scroll flex min-h-full flex-col justify-center bg-bg px-6 py-10"
    >
      <div className="anim-rise mx-auto w-full max-w-sm">
        <div className="text-center">
          <span
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-on-accent"
            style={gradient}
          >
            <Icon name="transfer" className="h-7 w-7" />
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-ink">Rozliczenia</h1>
          <p className="mt-2 text-[15px] leading-relaxed text-muted">
            {known.length > 0
              ? "Wybierz grupę albo wklej nowy link."
              : "Ta aplikacja jest prywatna. Otwórz link do grupy, który dostałeś od znajomych, albo wklej go poniżej."}
          </p>
        </div>

        {known.length > 0 && (
          <ul className="stagger-rows card mt-6 divide-y divide-line overflow-hidden rounded-3xl text-left">
            {known.map((g) => (
              <li key={g.slug} className="flex items-center">
                <button
                  onClick={() => openSlug(g.slug)}
                  className="press flex min-w-0 flex-1 items-center gap-3 px-4 py-3 text-left active:bg-surface-2"
                >
                  <Avatar name={g.name} seed={g.slug} size="md" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium text-ink">
                      {g.name}
                    </span>
                    <span className="num block truncate text-[12px] text-muted">/g/{g.slug}</span>
                  </span>
                  <Icon name="chevron" className="h-4 w-4 shrink-0 text-muted/60" />
                </button>
                <button
                  aria-label={`Zapomnij grupę ${g.name}`}
                  onClick={() => forget(g.slug)}
                  className="press mr-1.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted/70 active:bg-surface-2"
                >
                  <Icon name="trash" className="h-[18px] w-[18px]" />
                </button>
              </li>
            ))}
          </ul>
        )}

        {pasting ? (
          <>
            <input
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && open()}
              placeholder="Wklej link do grupy"
              aria-label="Link do grupy"
              className="mt-6 min-h-12 w-full rounded-2xl border border-line bg-surface px-4 py-2.5 text-center text-[15px] text-ink outline-none transition-colors placeholder:text-muted focus:border-accent focus:ring-4 focus:ring-accent/15"
            />
            <button
              disabled={!value.trim()}
              onClick={open}
              style={value.trim() ? gradient : undefined}
              className="press mt-3 min-h-13 w-full rounded-2xl bg-surface-2 py-3.5 font-semibold text-on-accent disabled:text-muted"
            >
              Otwórz grupę
            </button>
          </>
        ) : (
          <button
            onClick={() => setPasting(true)}
            className="press mt-3 min-h-12 w-full rounded-2xl border border-dashed border-line text-[15px] font-medium text-muted"
          >
            Wklej inny link
          </button>
        )}

        {known.length > 0 && (
          <p className="mt-4 px-1 text-center text-[13px] leading-relaxed text-muted">
            Lista jest zapisana tylko na tym urządzeniu. Zachowaj linki gdzie indziej &mdash; bez
            nich nie wejdziesz do grupy.
          </p>
        )}
      </div>
    </div>
  );
}
