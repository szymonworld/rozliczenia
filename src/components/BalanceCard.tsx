import { formatGrosze } from "../lib/money";
import { Icon } from "./Icon";

export function BalanceCard({
  amountGrosze,
  subtitle,
}: {
  amountGrosze: number;
  subtitle?: string;
}) {
  const isZero = amountGrosze === 0;
  const isPositive = amountGrosze > 0;

  const label = isZero ? "Wszystko rozliczone" : isPositive ? "Dostajesz" : "Oddajesz";
  const tone = isZero ? "var(--muted)" : isPositive ? "var(--pos)" : "var(--neg)";

  return (
    <section
      className="card relative overflow-hidden rounded-3xl px-6 pb-7 pt-6"
      aria-label="Twoje saldo"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-24 h-56 w-56 rounded-full blur-2xl"
        style={{ background: `color-mix(in oklab, ${tone} 22%, transparent)` }}
      />

      <div className="relative flex items-center gap-2" style={{ color: tone }}>
        {!isZero && (
          <span
            className="flex h-6 w-6 items-center justify-center rounded-full"
            style={{ background: `color-mix(in oklab, ${tone} 16%, transparent)` }}
          >
            <Icon
              name="arrow"
              className={`h-3.5 w-3.5 ${isPositive ? "-rotate-90" : "rotate-90"}`}
              strokeWidth={2.25}
            />
          </span>
        )}
        {isZero && <Icon name="sparkle" className="h-4 w-4" />}
        <span className="text-[13px] font-semibold uppercase tracking-[0.08em]">{label}</span>
      </div>

      <p
        className="num relative mt-2 text-[2.75rem] font-bold leading-none tracking-tight"
        style={{ color: isZero ? "var(--ink)" : tone }}
      >
        {formatGrosze(Math.abs(amountGrosze))}
      </p>

      {subtitle && <p className="relative mt-2.5 text-sm text-muted">{subtitle}</p>}
    </section>
  );
}
