import { formatGrosze } from "../lib/money";
import { Avatar } from "./Avatar";
import { useCountUp } from "../lib/useCountUp";
import { Icon } from "./Icon";

export function BalanceCard({
  amountGrosze,
  subtitle,
  memberName,
  memberId,
}: {
  amountGrosze: number;
  subtitle?: string;
  /** Whose balance this is — several people often share one device. */
  memberName?: string;
  memberId?: string;
}) {
  const isZero = amountGrosze === 0;
  const isPositive = amountGrosze > 0;

  const label = isZero ? "Wszystko rozliczone" : isPositive ? "Dostajesz" : "Oddajesz";
  const tone = isZero ? "var(--muted)" : isPositive ? "var(--pos)" : "var(--neg)";

  const total = Math.abs(amountGrosze);
  const counting = useCountUp(total);

  return (
    <section
      className="card relative isolate overflow-hidden rounded-3xl px-6 pb-7 pt-6"
      aria-label="Twoje saldo"
    >
      {/* A radial wash rather than a blurred blob. Safari on iOS does not clip
          a filtered child to its parent's border radius, so the old blur bled
          past the rounded corner; a plain gradient pinned to inset-0 has
          nothing to bleed out of. */}
      <div
        aria-hidden="true"
        className="anim-glow pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(115% 90% at 100% 0%, color-mix(in oklab, ${tone} 26%, transparent), transparent 62%)`,
        }}
      />
      {/* Hairline catch-light picking up the tone along the top edge. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background: `linear-gradient(90deg, transparent, color-mix(in oklab, ${tone} 50%, transparent), transparent)`,
        }}
      />

      <div className="relative flex items-center gap-2">
        <span
          className="flex items-center gap-1.5 rounded-full py-1 pl-1 pr-2.5"
          style={{ color: tone, background: `color-mix(in oklab, ${tone} 14%, transparent)` }}
        >
          <span
            className="flex h-5 w-5 items-center justify-center rounded-full"
            style={{ background: `color-mix(in oklab, ${tone} 22%, transparent)` }}
          >
            {isZero ? (
              <Icon name="sparkle" className="h-3 w-3" />
            ) : (
              <Icon
                name="arrow"
                className={`h-3 w-3 ${isPositive ? "-rotate-90" : "rotate-90"}`}
                strokeWidth={2.5}
              />
            )}
          </span>
          <span className="text-[12px] font-semibold uppercase tracking-[0.08em]">{label}</span>
        </span>

        {memberName && (
          <span className="ml-auto flex min-w-0 items-center gap-1.5 text-[13px] font-medium text-muted">
            <Avatar name={memberName} seed={memberId ?? memberName} size="xs" />
            <span className="truncate">{memberName}</span>
          </span>
        )}
      </div>

      <p
        className="num relative mt-3 text-[2.75rem] font-bold leading-none tracking-tight"
        style={{ color: isZero ? "var(--ink)" : tone }}
      >
        {/* The visible figure counts up; assistive tech gets the final one
            instead of a stream of intermediate values. */}
        <span aria-hidden="true">{formatGrosze(counting)}</span>
        <span className="sr-only">{formatGrosze(total)}</span>
      </p>

      {subtitle && <p className="relative mt-2.5 text-sm text-muted">{subtitle}</p>}
    </section>
  );
}
