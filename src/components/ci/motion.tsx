/**
 * Motion primitives. Every animation here is decorative, so every one of them
 * is skipped under `prefers-reduced-motion` — the layout and the copy carry the
 * meaning without it.
 */

import { useEffect, useRef, useState, type ReactNode } from "react";

/** True once the element has entered the viewport (once, then it stays). */
export function useInView<T extends HTMLElement>(
  rootMargin = "-8% 0px -8% 0px",
): {
  ref: React.RefObject<T | null>;
  inView: boolean;
} {
  const ref = useRef<T>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setInView(true);
            io.disconnect();
          }
        }
      },
      { rootMargin, threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);

  return { ref, inView };
}

const prefersReduced = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Fades and lifts its children in when they scroll into view.
 * `delay` staggers siblings.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const { ref, inView } = useInView<HTMLDivElement>();
  return (
    <div
      ref={ref}
      className={`ci-reveal ${className ?? ""}`}
      data-visible={inView}
      style={{ ["--reveal-delay" as string]: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

/**
 * Counts up to a number when it first appears. Renders the final value
 * immediately for screen readers and for anyone who asked for less motion.
 */
export function CountUp({
  value,
  decimals = 0,
  duration = 900,
  className,
}: {
  value: number;
  decimals?: number;
  duration?: number;
  className?: string;
}) {
  const { ref, inView } = useInView<HTMLSpanElement>("0px");
  const [display, setDisplay] = useState(() => value);

  useEffect(() => {
    if (!inView) return;
    if (prefersReduced()) {
      setDisplay(value);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const from = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setDisplay(from + (value - from) * eased);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [inView, value, duration]);

  const shown = Number.isFinite(display) ? display : value;
  return (
    <span ref={ref} className={`ci-tick ${className ?? ""}`}>
      {shown.toFixed(decimals)}
    </span>
  );
}

/** Wraps children in a grow-in animation, triggered when they scroll in. */
export function GrowIn({
  children,
  axis = "x",
  delay = 0,
  className,
  style,
}: {
  children: ReactNode;
  axis?: "x" | "y";
  delay?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const { ref, inView } = useInView<HTMLDivElement>("0px");
  return (
    <div ref={ref} className={className} style={style} data-visible={inView}>
      {inView ? (
        <div
          className={axis === "x" ? "ci-grow" : "ci-grow-y"}
          style={{ ["--grow-delay" as string]: `${delay}ms`, width: "100%", height: "100%" }}
        >
          {children}
        </div>
      ) : (
        <div style={{ width: "100%", height: "100%", opacity: 0 }}>{children}</div>
      )}
    </div>
  );
}
