/**
 * TourOverlay — the spotlight that follows Bloom's tutorial.
 *
 * This file is the reason the tour feels like butter, so the rules it holds
 * itself to are worth stating:
 *
 *  · **One frame loop, no timers.** The old overlay re-read the target on a
 *    300ms `setInterval` and pushed every reading through React state, so the
 *    highlight trailed the page by up to a third of a second and the card
 *    re-rendered three times a second. Now a single `requestAnimationFrame`
 *    loop reads the target's rect and writes geometry straight to `style` —
 *    React re-renders when the *step* changes, never for motion.
 *  · **Springs, not transitions.** Moving between steps interpolates through a
 *    spring, so the highlight travels from the old control to the new one
 *    (easing out of the smooth scroll on the way) instead of snapping.
 *  · **Glued while the page scrolls.** A spring would swim behind a flick, so
 *    during a real scroll — and under `prefers-reduced-motion` — the geometry
 *    jumps straight to the target. That reads as "pinned to the element",
 *    which is what a highlight is supposed to be.
 *  · **One veil, one hole.** The dim is a single element whose border box *is*
 *    the hole and whose box-shadow paints everything around it, so the cutout
 *    is a rounded rect wearing the target's own radius and it animates as one
 *    thing. Four transparent catchers keep the veil clickable while leaving
 *    the highlighted control usable.
 *  · **Never park on a dead end.** A step whose control isn't on this screen
 *    (a feature switched off, a rail still mounting) waits a beat and then
 *    moves itself along, rather than showing a warning and asking the person
 *    to press Next.
 */

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

import type { TourStep } from "@/lib/tour/types";
import {
  prefersReducedMotion,
  Spring,
  SpringRect,
  SPRING_FOCUS,
  SPRING_SOFT,
} from "@/lib/tour/spring";
import { isComfortable, placeCard, type Placement } from "@/lib/tour/placement";
import { bottomInset, holeFor, holeRadius, readTarget, reveal } from "@/lib/tour/target";
import { cn } from "@/lib/utils";

import { TourTooltip } from "./TourTooltip";

interface Props {
  step: TourStep | null;
  index: number;
  total: number;
  /** Which way the step just changed — the card's content slides in from there. */
  direction: 1 | -1;
  /** The tour is over: fade out where you stand, then unmount. */
  leaving?: boolean;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onClose: () => void;
}

/** Widest the card ever gets; narrow screens take the viewport minus margins. */
const CARD_MAX = 360;
const MARGIN = 14;
/** How long a step waits for its control to appear before it moves on. */
const SEEK_GRACE = 1_200;
/** How long a step waits for a control it had already found to come back. */
const LOST_GRACE = 2_400;
/** How long a step gets to travel from the previous one before it pins. */
const GLIDE = 900;
/** After a scroll or resize, for this long, the highlight is glued not sprung. */
const LOCK_WINDOW = 140;

interface Motion {
  hole: SpringRect;
  cardX: Spring;
  cardY: Spring;
  arrow: Spring;
  /** Flipped the first time a target is found: the veil fades in *after* the
   *  hole is in place, so it never opens out of the top-left corner. */
  revealed: boolean;
}

export function TourOverlay({
  step,
  index,
  total,
  direction,
  leaving = false,
  onNext,
  onPrev,
  onSkip,
  onClose,
}: Props) {
  const veilRef = useRef<HTMLDivElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);
  const catcherRefs = useRef<(HTMLDivElement | null)[]>([]);

  const motionRef = useRef<Motion | null>(null);
  if (motionRef.current === null) {
    motionRef.current = {
      hole: new SpringRect(SPRING_FOCUS),
      cardX: new Spring(0, SPRING_FOCUS),
      cardY: new Spring(0, SPRING_FOCUS),
      arrow: new Spring(0, SPRING_SOFT),
      revealed: false,
    };
  }
  const motion = motionRef.current;

  const [placement, setPlacement] = useState<Placement>("bottom");
  const [seeking, setSeeking] = useState(true);

  /* Latest callbacks in a ref: the frame loop must not restart when a parent
     re-renders, or a step would lose its springs mid-flight. */
  const handlers = useRef({ onNext, onPrev, onSkip, onClose });
  useEffect(() => {
    handlers.current = { onNext, onPrev, onSkip, onClose };
  });

  const target = step?.target ?? null;
  const stepId = step?.id ?? null;
  const preferred = step?.placement ?? "auto";

  /* ------------------------------- frame loop ------------------------------- */
  useEffect(() => {
    if (!target) return undefined;

    const reduce = prefersReducedMotion();
    const stepStart = performance.now();

    let raf = 0;
    let element: HTMLElement | null = null;
    let lastFrame = stepStart;
    let lastJump = -Infinity;
    let painted = "";
    let sought = false;
    let advanced = false;
    let seenOnce = false;
    let lostAt = 0;
    let inset = bottomInset();
    let cardBox = { width: Math.min(CARD_MAX, window.innerWidth - MARGIN * 2), height: 240 };
    let shown: Placement | null = null;

    const viewport = () => ({
      width: window.innerWidth,
      height: window.innerHeight,
      safeBottom: inset,
    });

    /** The card's own size. Layout reads live here, never in the frame loop. */
    const measureCard = () => {
      inset = bottomInset();
      const slot = slotRef.current;
      if (!slot) return;
      const width = Math.min(CARD_MAX, window.innerWidth - MARGIN * 2);
      slot.style.width = `${width}px`;
      const height = slot.offsetHeight;
      if (height > 0) cardBox = { width, height };
    };

    const put = (
      el: HTMLElement | null | undefined,
      x: number,
      y: number,
      w: number,
      h: number,
    ) => {
      if (!el) return;
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      el.style.width = `${w}px`;
      el.style.height = `${h}px`;
    };

    /** Every write, after every read: at most one layout pass per frame. */
    const paint = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const x = motion.hole.x.get();
      const y = motion.hole.y.get();
      const w = Math.max(0, motion.hole.width.get());
      const h = Math.max(0, motion.hole.height.get());
      const r = Math.max(0, motion.hole.radius.get());
      const cx = motion.cardX.get();
      const cy = motion.cardY.get();
      const ax = motion.arrow.get();

      const signature = [x, y, w, h, r, cx, cy, ax, vw, vh].map((n) => n.toFixed(1)).join("|");
      if (signature === painted) return;
      painted = signature;

      const veil = veilRef.current;
      if (veil) {
        veil.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        veil.style.width = `${w}px`;
        veil.style.height = `${h}px`;
        veil.style.borderRadius = `${r}px`;
      }

      const [top, bottom, left, right] = catcherRefs.current;
      put(top, 0, 0, vw, Math.max(0, y));
      put(bottom, 0, y + h, vw, Math.max(0, vh - y - h));
      put(left, 0, y, Math.max(0, x), h);
      put(right, x + w, y, Math.max(0, vw - x - w), h);

      const slot = slotRef.current;
      if (slot) {
        slot.style.transform = `translate3d(${cx}px, ${cy}px, 0)`;
        slot.style.setProperty("--tour-arrow", `${ax}px`);
      }
    };

    const frame = (now: number) => {
      raf = window.requestAnimationFrame(frame);
      const dt = (now - lastFrame) / 1000;
      lastFrame = now;

      /* -- find the control this step points at ---------------------------- */
      if (!element || !element.isConnected) {
        const found = readTarget(target);
        if (!found) {
          element = null;
          /*
           * Two different kinds of "not here". A step that has *never* found its
           * control is pointing at something this screen doesn't have — a nav
           * that's switched off, a rail for a feature that's empty — so after a
           * beat the tour moves itself along rather than parking on a warning.
           * A step that *had* its control and lost it is usually mid-re-render:
           * React replaced the node for a frame. That gets a longer leash, or a
           * list refreshing would silently eat a step of the tour.
           */
          if (advanced) return;
          if (!seenOnce) {
            if (now - stepStart > SEEK_GRACE) {
              advanced = true;
              handlers.current.onNext();
            }
          } else {
            if (!lostAt) lostAt = now;
            if (now - lostAt > LOST_GRACE) {
              advanced = true;
              handlers.current.onNext();
            }
          }
          return;
        }
        element = found;
        lostAt = 0;
        seenOnce = true;
        setSeeking(false);
        /* First sight of it: bring it somewhere a card can sit beside it —
           once, smoothly, and only if it actually needs it. */
        if (!sought) {
          sought = true;
          const first = element.getBoundingClientRect();
          if (first.width + first.height > 0) {
            const comfortable = isComfortable(
              holeFor(first, holeRadius(element)),
              viewport(),
              cardBox,
            );
            if (!comfortable) reveal(element, reduce ? "auto" : "smooth");
          }
        }
      }

      /* -- read ------------------------------------------------------------- */
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) return; // hidden: wait it out
      const next = holeFor(rect, holeRadius(element));
      const result = placeCard({
        hole: next,
        card: cardBox,
        viewport: viewport(),
        preferred,
        margin: MARGIN,
      });

      /* -- drive ------------------------------------------------------------ */
      const glued = reduce || now - lastJump < LOCK_WINDOW;
      const firstSight = !motion.revealed;
      if (glued || firstSight) {
        motion.hole.jump(next);
        motion.cardX.jump(result.card.x);
        motion.cardY.jump(result.card.y);
        motion.arrow.jump(result.arrow);
      } else {
        motion.hole.set(next);
        motion.cardX.set(result.card.x);
        motion.cardY.set(result.card.y);
        motion.arrow.set(result.arrow);
      }

      motion.hole.step(dt);
      motion.cardX.step(dt);
      motion.cardY.step(dt);
      motion.arrow.step(dt);
      paint();

      if (firstSight) {
        motion.revealed = true;
        veilRef.current?.classList.add("is-up");
      }
      if (result.placement !== shown) {
        shown = result.placement;
        setPlacement(result.placement);
      }
    };

    /* -- what wakes and pins the loop --------------------------------------- */
    const onScroll = () => {
      /* Gliding to a new step is sprung; a scroll the person started is pinned,
         so the highlight never swims behind their finger. */
      if (performance.now() - stepStart > GLIDE) lastJump = performance.now();
    };
    const onResize = () => {
      lastJump = performance.now();
      measureCard();
    };

    measureCard();
    setSeeking(!readTarget(target));
    const slot = slotRef.current;
    const observer =
      typeof ResizeObserver !== "undefined" && slot ? new ResizeObserver(measureCard) : null;
    if (observer && slot) observer.observe(slot);

    window.addEventListener("scroll", onScroll, { passive: true, capture: true });
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    window.visualViewport?.addEventListener("resize", onResize);
    raf = window.requestAnimationFrame(frame);

    return () => {
      window.cancelAnimationFrame(raf);
      observer?.disconnect();
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);
    };
    /* Springs are refs, handlers are refs: the loop restarts per step only. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, stepId, preferred]);

  /* ------------------------------ focus & keys ------------------------------ */
  const restoreFocus = useRef<Element | null>(null);

  useLayoutEffect(() => {
    if (restoreFocus.current === null) restoreFocus.current = document.activeElement;
    const slot = slotRef.current;
    if (!slot) return;
    /* Take focus only when it isn't already inside the card — pulling it back
       from someone who tabbed to "Skip" would be its own kind of jank. */
    if (slot.contains(document.activeElement)) return;
    const card = slot.querySelector<HTMLElement>("[data-tour-card]");
    (card ?? slot).focus({ preventScroll: true });
  }, [stepId]);

  useEffect(
    () => () => {
      const previous = restoreFocus.current;
      restoreFocus.current = null;
      if (previous instanceof HTMLElement && previous.isConnected) {
        previous.focus({ preventScroll: true });
      }
    },
    [],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        handlers.current.onClose();
        return;
      }
      const fromControl =
        event.target instanceof HTMLElement &&
        Boolean(event.target.closest("button, a[href], input, textarea, select"));
      if (event.key === "ArrowRight") {
        event.preventDefault();
        handlers.current.onNext();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        handlers.current.onPrev();
      } else if ((event.key === "Enter" || event.key === " ") && !fromControl) {
        event.preventDefault();
        handlers.current.onNext();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* -------------------------------- swipe ---------------------------------- */
  const swipe = useRef<{ x: number; y: number; at: number } | null>(null);
  const onPointerDown = (event: ReactPointerEvent) => {
    swipe.current = { x: event.clientX, y: event.clientY, at: performance.now() };
  };
  const onPointerUp = (event: ReactPointerEvent) => {
    const start = swipe.current;
    swipe.current = null;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    /* A deliberate horizontal flick, not a scroll or a long press. */
    if (Math.abs(dx) < 56 || Math.abs(dx) < Math.abs(dy) * 1.4) return;
    if (performance.now() - start.at > 900) return;
    if (dx < 0) handlers.current.onNext();
    else handlers.current.onPrev();
  };

  if (!step) return null;

  return (
    <div className={cn("tour-overlay", leaving && "is-leaving")} data-tour-step={step.id}>
      {/* the dim — its border box is the hole, its shadow is the veil */}
      <div ref={veilRef} className="tour-veil" aria-hidden="true">
        <span className="tour-ring" aria-hidden="true" />
      </div>

      {/* four transparent panes around the hole: tap outside to leave, tap the
          highlighted control to use it */}
      {[0, 1, 2, 3].map((pane) => (
        <div
          key={pane}
          aria-hidden="true"
          className="tour-catcher"
          ref={(node) => {
            catcherRefs.current[pane] = node;
          }}
          onClick={onClose}
        />
      ))}

      <div
        ref={slotRef}
        className={cn("tour-slot", seeking && "is-seeking")}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          swipe.current = null;
        }}
      >
        <TourTooltip
          step={step}
          index={index}
          total={total}
          placement={placement}
          direction={direction}
          onNext={onNext}
          onPrev={onPrev}
          onSkip={onSkip}
          onClose={onClose}
        />
      </div>

      <p className="sr-only" aria-live="polite">
        {`Step ${index + 1} of ${total}. ${step.title}. ${step.body}`}
      </p>
    </div>
  );
}
