/**
 * FeelIn — the feel layer's entrance wrapper (Brief v6 §3).
 *
 * Wraps a page section shell: the shell starts 12px low and transparent
 * (`.feel-in` in styles/motion.css) and rises once, on the slow feel
 * curve, when the house `useInView` first reports it seen. One-shot by
 * construction — the hook latches — and still on tab returns and under
 * reduced motion, where the CSS settles it instantly, fully shown.
 *
 * `delay` sets the stagger step inline (--feel-delay); a parent with
 * the `.feel-stagger` class can instead assign steps to its direct
 * FeelIn children in CSS (60ms steps, capped at six). Later slices
 * consume this component — or `useFeelIn` directly, when a component
 * renders its own root element and only needs the ref + visibility.
 */

import type { CSSProperties, ReactNode } from "react";

import { useInView } from "@/components/ci/motion";

/** The hook half of the pattern: ref + latched visibility for a shell
 *  that renders its own root. Spread as ref + data-visible. */
export function useFeelIn<T extends HTMLElement>() {
  return useInView<T>();
}

export function FeelIn({
  children,
  as = "div",
  delay,
  className,
  id,
}: {
  children: ReactNode;
  /** The shell element to render — "section" when the wrapped shell is
   *  itself a page section, so the document outline never changes. */
  as?: "div" | "section";
  /** Stagger step in ms (sets --feel-delay). Omit inside .feel-stagger. */
  delay?: number;
  className?: string;
  id?: string;
}) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const style =
    delay !== undefined ? ({ ["--feel-delay" as string]: `${delay}ms` } as CSSProperties) : undefined;
  const cls = `feel-in ${className ?? ""}`;
  if (as === "section") {
    return (
      <section ref={ref as never} className={cls} data-visible={inView} style={style} id={id}>
        {children}
      </section>
    );
  }
  return (
    <div ref={ref} className={cls} data-visible={inView} style={style} id={id}>
      {children}
    </div>
  );
}
