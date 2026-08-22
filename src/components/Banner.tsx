import type { IconName } from "./Icon";
import { Icon } from "./Icon";

const tones = {
  warn: "bg-warn-soft text-warn",
  neg: "bg-neg-soft text-neg",
  pos: "bg-pos-soft text-pos",
} as const;

export function Banner({
  tone,
  icon,
  children,
}: {
  tone: keyof typeof tones;
  icon: IconName;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex items-start gap-2.5 rounded-2xl px-3.5 py-2.5 text-sm ${tones[tone]}`}>
      <Icon name={icon} className="mt-0.5 h-4 w-4 shrink-0" />
      <span className="leading-snug">{children}</span>
    </div>
  );
}
