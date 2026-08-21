import { useRef, useState, type ReactNode, type TouchEvent } from "react";
import { Icon } from "./Icon";

const THRESHOLD = 70;

export function PullToRefresh({
  onRefresh,
  children,
}: {
  onRefresh: () => Promise<void> | void;
  children: ReactNode;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef<number | null>(null);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const onTouchStart = (e: TouchEvent) => {
    if (containerRef.current && containerRef.current.scrollTop <= 0) {
      startY.current = e.touches[0].clientY;
    } else {
      startY.current = null;
    }
  };

  const onTouchMove = (e: TouchEvent) => {
    if (startY.current === null || refreshing) return;
    const delta = e.touches[0].clientY - startY.current;
    if (delta > 0) setPull(Math.min(delta * 0.5, 96));
  };

  const onTouchEnd = async () => {
    if (pull > THRESHOLD) {
      setRefreshing(true);
      setPull(THRESHOLD);
      await onRefresh();
      setRefreshing(false);
    }
    setPull(0);
    startY.current = null;
  };

  const ready = pull > THRESHOLD;

  return (
    <div
      ref={containerRef}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      className="min-h-full flex-1 overflow-y-auto"
    >
      <div
        style={{ height: pull }}
        className="flex items-end justify-center overflow-hidden transition-[height] duration-200"
      >
        {pull > 0 && (
          <span className="flex items-center gap-1.5 pb-2 text-xs font-medium text-muted">
            <Icon
              name="refresh"
              className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ready ? "rotate-180" : ""} transition-transform`}
            />
            {refreshing ? "Odświeżanie…" : ready ? "Puść, aby odświeżyć" : "Pociągnij, aby odświeżyć"}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
