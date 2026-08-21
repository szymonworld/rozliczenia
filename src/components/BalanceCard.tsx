import { formatGrosze } from "../lib/money";

export function BalanceCard({ amountGrosze }: { amountGrosze: number }) {
  const isZero = amountGrosze === 0;
  const isPositive = amountGrosze > 0;

  const label = isZero ? "Rozliczono" : isPositive ? "Dostajesz" : "Oddajesz";
  const colorClass = isZero
    ? "text-neutral-500 dark:text-neutral-400"
    : isPositive
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-rose-600 dark:text-rose-400";

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-center shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
      <p className={`text-sm font-medium uppercase tracking-wide ${colorClass}`}>{label}</p>
      <p
        className={`mt-2 text-5xl font-bold ${colorClass}`}
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {formatGrosze(Math.abs(amountGrosze))}
      </p>
    </div>
  );
}
