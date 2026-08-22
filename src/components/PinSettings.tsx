import { useState } from "react";
import { Icon } from "./Icon";

const inputClass =
  "min-h-12 w-full rounded-2xl border border-line bg-surface px-4 py-2.5 text-[15px] text-ink outline-none transition-colors placeholder:text-muted focus:border-accent focus:ring-4 focus:ring-accent/15";

const onlyDigits = (value: string) => value.replace(/[^0-9]/g, "");

/**
 * Set, change, or remove the event's optional PIN. Changing or removing one
 * always asks for the current code — being on an unlocked device is not the
 * same as knowing the PIN.
 */
export function PinSettings({
  enabled,
  busy,
  minLength,
  maxLength,
  onSet,
  onClear,
}: {
  enabled: boolean;
  busy: boolean;
  minLength: number;
  maxLength: number;
  onSet: (pin: string, currentPin?: string) => void;
  onClear: (currentPin: string) => void;
}) {
  const [mode, setMode] = useState<"idle" | "set" | "clear">("idle");
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [repeat, setRepeat] = useState("");

  const reset = () => {
    setMode("idle");
    setCurrent("");
    setNext("");
    setRepeat("");
  };

  const lengthOk = next.length >= minLength && next.length <= maxLength;
  const matches = next === repeat;
  const canSet = lengthOk && matches && (!enabled || current.length > 0) && !busy;

  if (mode === "idle") {
    return (
      <>
        <div className="card divide-y divide-line overflow-hidden rounded-2xl">
          <button
            onClick={() => setMode("set")}
            disabled={busy}
            className="press flex w-full items-center gap-3 px-4 py-3 text-left active:bg-surface-2 disabled:opacity-40"
          >
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
              style={
                enabled
                  ? { color: "var(--pos)", background: "var(--pos-soft)" }
                  : { color: "var(--muted)", background: "var(--surface-2)" }
              }
            >
              <Icon name="lock" className="h-[18px] w-[18px]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-medium text-ink">
                {enabled ? "Zmień PIN" : "Ustaw PIN"}
              </span>
              <span className="block text-[13px] text-muted">
                {enabled ? "Wydarzenie jest chronione kodem" : "Dodatkowa ochrona poza linkiem"}
              </span>
            </span>
            <Icon name="chevron" className="h-4 w-4 shrink-0 text-muted/60" />
          </button>

          {enabled && (
            <button
              onClick={() => setMode("clear")}
              disabled={busy}
              className="press flex w-full items-center gap-3 px-4 py-3 text-left active:bg-surface-2 disabled:opacity-40"
            >
              <span className="flex-1 text-[15px] font-medium" style={{ color: "var(--neg)" }}>
                Usuń PIN
              </span>
              <Icon name="chevron" className="h-4 w-4 shrink-0 text-muted/60" />
            </button>
          )}
        </div>
        <p className="mt-2 px-1 text-[13px] leading-relaxed text-muted">
          PIN jest opcjonalny. Z nim sam link nie wystarczy — każdy musi jeszcze wpisać kod.
          Zmiana PIN-u wylogowuje wszystkie urządzenia.
        </p>
      </>
    );
  }

  if (mode === "clear") {
    return (
      <div className="anim-rise card space-y-3 rounded-2xl px-4 py-4">
        <p className="text-[15px] font-medium text-ink">Usunąć PIN?</p>
        <p className="text-[13px] leading-relaxed text-muted">
          Wydarzenie znów będzie dostępne dla każdego, kto ma link.
        </p>
        <input
          type="password"
          inputMode="numeric"
          value={current}
          onChange={(e) => setCurrent(onlyDigits(e.target.value))}
          maxLength={maxLength}
          placeholder="Obecny PIN"
          aria-label="Obecny PIN"
          className={inputClass}
        />
        <div className="flex gap-2">
          <button
            disabled={busy || !current}
            onClick={() => {
              onClear(current);
              reset();
            }}
            className="press min-h-11 flex-1 rounded-xl font-semibold text-on-accent disabled:opacity-40"
            style={{ background: "var(--neg)" }}
          >
            Usuń PIN
          </button>
          <button
            onClick={reset}
            className="press min-h-11 rounded-xl px-4 text-[14px] font-medium text-muted"
          >
            Anuluj
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="anim-rise card space-y-3 rounded-2xl px-4 py-4">
      {enabled && (
        <input
          type="password"
          inputMode="numeric"
          value={current}
          onChange={(e) => setCurrent(onlyDigits(e.target.value))}
          maxLength={maxLength}
          placeholder="Obecny PIN"
          aria-label="Obecny PIN"
          className={inputClass}
        />
      )}
      <input
        type="password"
        inputMode="numeric"
        value={next}
        onChange={(e) => setNext(onlyDigits(e.target.value))}
        maxLength={maxLength}
        placeholder={`Nowy PIN (${minLength}–${maxLength} cyfr)`}
        aria-label="Nowy PIN"
        className={inputClass}
      />
      <input
        type="password"
        inputMode="numeric"
        value={repeat}
        onChange={(e) => setRepeat(onlyDigits(e.target.value))}
        maxLength={maxLength}
        placeholder="Powtórz nowy PIN"
        aria-label="Powtórz nowy PIN"
        className={inputClass}
      />

      {next.length > 0 && !lengthOk && (
        <p className="px-1 text-[13px]" style={{ color: "var(--neg)" }}>
          PIN musi mieć od {minLength} do {maxLength} cyfr.
        </p>
      )}
      {repeat.length > 0 && !matches && (
        <p className="px-1 text-[13px]" style={{ color: "var(--neg)" }}>
          Kody nie są takie same.
        </p>
      )}

      <div className="flex gap-2">
        <button
          disabled={!canSet}
          onClick={() => {
            onSet(next, enabled ? current : undefined);
            reset();
          }}
          className="press min-h-11 flex-1 rounded-xl bg-accent font-medium text-on-accent disabled:opacity-40"
        >
          Zapisz PIN
        </button>
        <button
          onClick={reset}
          className="press min-h-11 rounded-xl px-4 text-[14px] font-medium text-muted"
        >
          Anuluj
        </button>
      </div>
    </div>
  );
}
