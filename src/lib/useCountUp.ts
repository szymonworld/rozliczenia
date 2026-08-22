import { useEffect, useRef, useState } from "react";

/**
 * Eases a number towards its target so an amount arriving on screen — or
 * changing under you — reads as movement rather than a jump cut. Returns the
 * target unchanged when the device asks for reduced motion.
 */
export function useCountUp(target: number, durationMs = 550): number {
  const [value, setValue] = useState(0);
  const from = useRef(0);
  const frame = useRef(0);

  useEffect(() => {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const start = from.current;

    if (reduced || start === target) {
      from.current = target;
      setValue(target);
      return;
    }

    const startedAt = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - startedAt) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(Math.round(start + (target - start) * eased));
      if (t < 1) {
        frame.current = requestAnimationFrame(tick);
      } else {
        from.current = target;
      }
    };

    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [target, durationMs]);

  return value;
}
