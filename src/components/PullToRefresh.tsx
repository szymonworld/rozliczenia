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
  const startX = useRef(0);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const onTouchStart = (e: TouchEvent) => {
    startX.current = e.touches[0].clientX;
    if (containerRef.current && containerRef.current.scrollTop <= 0) {
      startY.current = e.touches[0].clientY;
    } else {
      startY.current = null;
    }
  };

  const onTouchMove = (e: TouchEvent) => {
    if (startY.current === null || refreshing) return;
    // A finger that has drifted sideways is not a pull — drop the gesture
    // rather than fighting the scroller for it.
    const dx = Math.abs(e.touches[0].clientX - startX.current);
    const delta = e.touches[0].clientY - startY.current;
    if (dx > Math.abs(delta)) {
      startY.current = null;
      setPull(0);
      return;
    }
    if (delta > 0 && (containerRef.current?.scrollTop ?? 0) <= 0) {
      setPull(Math.min(delta * 0.5, 96));
    } else {
      setPull(0);
    }
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
      className="app-scroll"
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
