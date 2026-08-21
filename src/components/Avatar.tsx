/** Stable hue per member so each person keeps the same colour everywhere. */
function hueFrom(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 360;
  // Nudge away from the muddy yellow-green band.
  return (h + 15) % 360;
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

const sizes = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-lg",
} as const;

export function Avatar({
  name,
  seed,
  size = "md",
  className = "",
}: {
  name: string;
  seed?: string;
  size?: keyof typeof sizes;
  className?: string;
}) {
  const hue = hueFrom(seed ?? name);
  return (
    <span
      style={{ ["--h" as string]: hue }}
      className={`avatar inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${sizes[size]} ${className}`}
      aria-hidden="true"
    >
      {initialsOf(name)}
    </span>
  );
}
