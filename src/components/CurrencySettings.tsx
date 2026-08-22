import { useState } from "react";
import { Icon } from "./Icon";
import { parseRate } from "../lib/money";
import type { CurrencySettings as CurrencyConfig } from "../../shared/types";

const inputClass =
  "min-h-12 w-full rounded-2xl border border-line bg-surface px-4 py-2.5 text-[15px] text-ink outline-none transition-colors placeholder:text-muted focus:border-accent focus:ring-4 focus:ring-accent/15";

/** Currencies a Polish group is realistically going to need. */
const SUGGESTIONS = ["EUR", "USD", "GBP", "CZK", "CHF", "SEK", "NOK", "HUF"];

/**
 * A single exchange rate for the whole group. Rates are captured onto each
 * expense as it is written, so changing this only affects what gets entered
 * next — never what has already been recorded.
 */
export function CurrencySettings({
  current,
  busy,
  onSave,
  onClear,
}: {
  current?: CurrencyConfig;
  busy: boolean;
  onSave: (code: string, rate: number) => void;
  onClear: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [code, setCode] = useState(current?.code ?? "EUR");
  const [rate, setRate] = useState(current ? String(current.rate).replace(".", ",") : "");

  const parsedRate = parseRate(rate);
  const cleanCode = code.trim().toUpperCase();
  const canSave = cleanCode.length >= 3 && parsedRate !== null && !busy;

  if (!editing) {
    return (
      <>
        <div className="card divide-y divide-line overflow-hidden rounded-2xl">
          <button
            onClick={() => setEditing(true)}
            disabled={busy}
            className="press flex w-full items-center gap-3 px-4 py-3 text-left active:bg-surface-2 disabled:opacity-40"
          >
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[15px] font-semibold"
              style={
                current
                  ? { color: "var(--accent)", background: "var(--accent-soft)" }
                  : { color: "var(--muted)", background: "var(--surface-2)" }
              }
            >
              {current ? current.code.slice(0, 1) : "zł"}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-medium text-ink">
                {current ? `${current.code} — druga waluta` : "Dodaj drugą walutę"}
              </span>
              <span className="block truncate text-[13px] text-muted">
                {current
                  ? `1 ${current.code} = ${String(current.rate).replace(".", ",")} zł`
                  : "Wpisuj wydatki np. w euro"}
              </span>
            </span>
            <Icon name="chevron" className="h-4 w-4 shrink-0 text-muted/60" />
          </button>

          {current && (
            <button
              onClick={onClear}
              disabled={busy}
              className="press flex w-full items-center gap-3 px-4 py-3 text-left active:bg-surface-2 disabled:opacity-40"
            >
              <span className="flex-1 text-[15px] font-medium" style={{ color: "var(--neg)" }}>
                Usuń drugą walutę
              </span>
              <Icon name="chevron" className="h-4 w-4 shrink-0 text-muted/60" />
            </button>
          )}
        </div>
        <p className="mt-2 px-1 text-[13px] leading-relaxed text-muted">
          Rozliczenia zawsze wychodzą w złotówkach. Kurs zapisuje się przy każdym wydatku, więc
          zmiana kursu nie przelicza wstecz tego, co już wpisane.
        </p>
      </>
    );
  }

  return (
    <div className="anim-rise card space-y-3 rounded-2xl px-4 py-4">
      <div>
        <label className="mb-1.5 block text-[13px] font-medium text-muted">Waluta</label>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 3))}
          maxLength={3}
          placeholder="EUR"
          aria-label="Kod waluty"
          className={`${inputClass} uppercase`}
        />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setCode(s)}
              className={`press rounded-full px-3 py-1.5 text-[13px] font-medium ${
                cleanCode === s ? "bg-accent text-on-accent" : "bg-surface-2 text-muted"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-[13px] font-medium text-muted">
          Ile złotych za 1 {cleanCode || "?"}
        </label>
        <input
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          inputMode="decimal"
          placeholder="np. 4,30"
          aria-label="Kurs"
          className={`num ${inputClass}`}
        />
        {rate.length > 0 && parsedRate === null && (
          <p className="mt-1.5 px-1 text-[13px]" style={{ color: "var(--neg)" }}>
            Kurs musi być liczbą większą od zera.
          </p>
        )}
        {parsedRate !== null && cleanCode && (
          <p className="num mt-1.5 px-1 text-[13px] text-muted">
            10 {cleanCode} = {(10 * parsedRate).toFixed(2).replace(".", ",")} zł
          </p>
        )}
      </div>

      <div className="flex gap-2">
        <button
          disabled={!canSave}
          onClick={() => {
            onSave(cleanCode, parsedRate as number);
            setEditing(false);
          }}
          className="press min-h-11 flex-1 rounded-xl bg-accent font-medium text-on-accent disabled:opacity-40"
        >
          Zapisz
        </button>
        <button
          onClick={() => setEditing(false)}
          className="press min-h-11 rounded-xl px-4 text-[14px] font-medium text-muted"
        >
          Anuluj
        </button>
      </div>
    </div>
  );
}
