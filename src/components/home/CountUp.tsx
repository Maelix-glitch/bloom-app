/**
 * Today's count-up — the prototype's rising number, held to Bloom's rules.
 *
 * · Ease-out over ~1.1s, and the animation ENDS on the exact real value:
 *   `countUpFrame` returns `to` untouched at progress 1, and the hook sets
 *   the target itself as its final state. Formatting (locale grouping) is
 *   applied only at render, never to the animated value.
 * · A value that changes mid-flight (a tick awards points) re-animates from
 *   the value currently on screen to the new real value.
 * · First mount in the tab session counts up from zero; a warm tab return
 *   remounts with the exact value already shown — no replay, matching the
 *   page's entrance discipline (PR #94/#95). The module-level `played` set
 *   is that latch.
 * · `prefers-reduced-motion`: no animation, the exact value at once.
 */

import { useEffect, useRef, useState } from "react";

/** Ids that have already played their count-up in this tab session. */
const played = new Set<string>();

/** Ease-out-quart frame. Exact at both ends: p<=0 → from, p>=1 → to. */
export function countUpFrame(from: number, to: number, progress: number): number {
  if (progress >= 1) return to;
  if (progress <= 0) return from;
  const eased = 1 - Math.pow(1 - progress, 4);
  return from + (to - from) * eased;
}

export function useCountUp(target: number, id: string, durationMs = 1100): number {
  const [display, setDisplay] = useState(() => (played.has(id) ? target : 0));
  const current = useRef(display);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      played.add(id);
      current.current = target;
      setDisplay(target);
      return;
    }
    const from = played.has(id) ? current.current : 0;
    played.add(id);
    if (from === target) {
      current.current = target;
      setDisplay(target);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / durationMs);
      const v = countUpFrame(from, target, p);
      current.current = v;
      setDisplay(v);
      if (p < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        /* The final state is the target itself — never a rounded frame. */
        current.current = target;
        setDisplay(target);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, id, durationMs]);

  return display;
}

export function CountUp({ value, id }: { value: number; id: string }) {
  const shown = useCountUp(value, id);
  return <>{Math.round(shown).toLocaleString()}</>;
}
