import { Icon } from "./Icon";

/**
 * The one visual for "this is selected". Accent-coloured on purpose: green
 * and red mean money owed or received throughout the app, so using them for
 * selection made two unrelated things look related.
 *
 * Purely presentational — the caller owns the semantics, either a real
 * checkbox kept for screen readers or a button with aria-pressed.
 */
export function Check({ checked, className = "" }: { checked: boolean; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors ${
        checked ? "border-transparent bg-accent text-on-accent" : "border-line bg-surface"
      } ${className}`}
    >
      {checked && <Icon name="check" className="h-3.5 w-3.5" strokeWidth={3} />}
    </span>
  );
}
