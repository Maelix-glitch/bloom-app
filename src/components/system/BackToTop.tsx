/**
 * BackToTop — the floating dock's upper fab (brief v4 Part 4; rulebook
 * §21). An 18px up-arrow on the shared fab chrome: no logo, no white
 * fill, the same 48px circle as the Vitalis orb below it in `.dock`.
 *
 * It appears only after real scrolling: a 150vh sentinel strip at the
 * document's top is watched with an IntersectionObserver (no scroll
 * listeners); once the sentinel has left the viewport — roughly 1.5
 * viewports down — the button shows. At scroll 0 it is hidden and out
 * of the tab order (visibility, see `.dock__top` in src/styles.css).
 * The scroll home is smooth, or instant under prefers-reduced-motion.
 *
 * The sentinel is created imperatively and prepended to <body>: the
 * button itself lives inside the fixed `.dock`, where an absolutely
 * positioned strip would anchor to the dock instead of the document.
 * The probe is decorative (aria-hidden) and removed on unmount.
 *
 * It renders inside CoachOrb's dock, so it exists exactly where the
 * orb does — the app routes, never on /coach itself.
 */

import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

export function BackToTop() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const sentinel = document.createElement("span");
    sentinel.className = "dock-sentinel";
    sentinel.setAttribute("aria-hidden", "true");
    document.body.prepend(sentinel);
    const io = new IntersectionObserver(
      ([entry]) => setShow(entry ? !entry.isIntersecting : false),
      { threshold: 0 },
    );
    io.observe(sentinel);
    return () => {
      io.disconnect();
      sentinel.remove();
    };
  }, []);

  const toTop = () => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
  };

  return (
    <button
      type="button"
      className="dock__top"
      data-show={show ? "true" : "false"}
      aria-label="Back to top"
      onClick={toTop}
    >
      <ArrowUp size={18} strokeWidth={1.75} aria-hidden />
    </button>
  );
}
