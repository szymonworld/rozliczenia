import { useState } from "react";
import { Icon } from "../components/Icon";
import { Banner } from "../components/Banner";
import { useLedger } from "../context/LedgerContext";
import { unlockGroup } from "../lib/api";

/**
 * Shown when the event behind this link is PIN-protected and this device has
 * not proved it knows the code. Nothing about the event is on screen — not
 * even its name — until the PIN checks out.
 */
export function PinLock() {
  const { refetch } = useLedger();
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!pin.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      await unlockGroup(pin.trim());
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nie udało się odblokować");
      setPin("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{ paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom))" }}
      className="app-scroll flex min-h-full flex-col justify-center bg-bg px-6 py-10"
    >
      <div className="anim-rise mx-auto w-full max-w-sm text-center">
        <span
          className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-on-accent"
          style={{
            background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
            boxShadow: "var(--shadow-lift)",
          }}
        >
          <Icon name="lock" className="h-7 w-7" />
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Wydarzenie zablokowane</h1>
        <p className="mt-2 text-[15px] leading-relaxed text-muted">
          To wydarzenie jest chronione kodem PIN. Podaj kod, który dostałeś od organizatora.
        </p>

        {error && (
          <div className="mt-4 text-left">
            <Banner tone="neg" icon="alert">
              {error}
            </Banner>
          </div>
        )}

        <input
          type="password"
          inputMode="numeric"
          autoComplete="one-time-code"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, ""))}
          onKeyDown={(e) => e.key === "Enter" && void submit()}
          maxLength={12}
          placeholder="••••"
          aria-label="Kod PIN"
          className="num mt-6 min-h-14 w-full rounded-2xl border border-line bg-surface px-4 py-2.5 text-center text-2xl tracking-[0.4em] text-ink outline-none transition-colors placeholder:text-muted focus:border-accent focus:ring-4 focus:ring-accent/15"
        />

        <button
          disabled={!pin.trim() || busy}
          onClick={() => void submit()}
          style={
            pin.trim() && !busy
              ? {
                  background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
                  boxShadow: "var(--shadow-lift)",
                }
              : undefined
          }
          className="press mt-3 min-h-13 w-full rounded-2xl bg-surface-2 py-3.5 font-semibold text-on-accent disabled:text-muted"
        >
          {busy ? "Sprawdzanie…" : "Odblokuj"}
        </button>
      </div>
    </div>
  );
}
