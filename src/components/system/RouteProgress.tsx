/**
 * B8 · Route progress bar — the "website feels instant" detail.
 *
 * TanStack Router code-splits every route, so navigating to a page you haven't
 * visited yet downloads its chunk first. Without feedback that beat reads as
 * broken; a slim gold bar crawling across the top reads as fast. Only appears
 * when a transition actually takes time (>150ms), so instant hops stay clean.
 */
import { useRouterState } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

export function RouteProgress() {
  const isLoading = useRouterState({ select: (s) => s.isLoading });
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);
  const showTimer = useRef<number | null>(null);

  useEffect(() => {
    if (isLoading) {
      // Slow crawl to 82% — but only if the transition isn't instant.
      showTimer.current = window.setTimeout(() => {
        setVisible(true);
        setWidth(0);
        requestAnimationFrame(() =>
          requestAnimationFrame(() => setWidth(82)),
        );
      }, 150);
      return () => {
        if (showTimer.current !== null) window.clearTimeout(showTimer.current);
      };
    }
    // Complete the bar, then fade it away.
    setWidth(100);
    const done = window.setTimeout(() => {
      setVisible(false);
      setWidth(0);
    }, 320);
    return () => window.clearTimeout(done);
  }, [isLoading]);

  if (!visible && !isLoading) return null;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        height: 2,
        width: `${width}%`,
        zIndex: 9998,
        pointerEvents: "none",
        opacity: visible ? 1 : 0,
        background: "linear-gradient(90deg, #7FA88F, #E8B75E)",
        boxShadow: "0 0 12px rgba(232,183,94,.55)",
        transition:
          width >= 100
            ? "width .25s ease-out, opacity .3s ease"
            : "width 1.4s ease-out, opacity .3s ease",
      }}
    />
  );
}
