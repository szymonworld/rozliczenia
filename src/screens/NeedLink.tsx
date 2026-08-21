import { useState } from "react";
import { Icon } from "../components/Icon";
import { setGroupSlug } from "../lib/api";

/** Shown when this device has no valid group link yet. */
export function NeedLink() {
  const [value, setValue] = useState("");

  const open = () => {
    // Accept a full link or just the slug — people paste whatever they have.
    const trimmed = value.trim();
    const slug = trimmed.includes("/g/")
      ? trimmed.split("/g/").pop()!.replace(/[/?#].*$/, "")
      : trimmed;
    if (!slug) return;
    setGroupSlug(slug);
    window.location.replace("/");
  };

  return (
    <div
      style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
      className="flex min-h-dvh flex-col justify-center bg-bg px-6 py-10"
    >
      <div className="mx-auto w-full max-w-sm text-center">
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
        <p className="mt-2 text-[15px] leading-relaxed text-muted">
          Ta aplikacja jest prywatna. Otwórz link do grupy, który dostałeś od znajomych, albo
          wklej go poniżej.
        </p>

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
          style={
            value.trim()
              ? {
                  background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
                  boxShadow: "var(--shadow-lift)",
                }
              : undefined
          }
          className="press mt-3 min-h-13 w-full rounded-2xl bg-surface-2 py-3.5 font-semibold text-on-accent disabled:text-muted"
        >
          Otwórz grupę
        </button>
      </div>
    </div>
  );
}
