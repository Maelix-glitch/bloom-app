/**
 * Width of an element, tracked with ResizeObserver so SVG charts can be drawn
 * in real pixels (crisp strokes at every breakpoint). Falls back to a resize
 * listener where ResizeObserver is unavailable.
 */

import { useEffect, useState, type RefObject } from "react";

export function useMeasuredWidth(ref: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setWidth((prev) => (prev === el.clientWidth ? prev : el.clientWidth));
    measure();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);

  return width;
}
