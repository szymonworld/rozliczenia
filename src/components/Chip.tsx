import { Avatar } from "./Avatar";
import { Icon } from "./Icon";

export function Chip({
  label,
  seed,
  selected,
  onClick,
}: {
  label: string;
  seed?: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`press flex min-h-11 items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3.5 text-sm font-medium ${
        selected
          ? "border-transparent bg-accent text-on-accent shadow-sm"
          : "border-line bg-surface text-muted"
      }`}
    >
      {selected ? (
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
          <Icon name="check" className="h-4 w-4" strokeWidth={2.5} />
        </span>
      ) : (
        <Avatar name={label} seed={seed} size="sm" />
      )}
      {label}
    </button>
  );
}
