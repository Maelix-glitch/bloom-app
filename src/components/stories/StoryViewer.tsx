/**
 * StoryViewer — full-screen story playback on a tiny state machine.
 *
 *   closed ⇄ viewing ⇄ paused
 *
 * One rAF loop drives progress for the whole session; changing story,
 * pausing, unmounting, or closing all reset/stop it, so two timers can never
 * run at once. Tap zones + swipe on touch, arrows/Escape on desktop.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";

import { cn } from "@/lib/utils";
import { formatRelativeDay } from "@/lib/profile/journey";
import { isStoryActive, STORY_DWELL_MS, type Story } from "@/lib/profile/types";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { StoryContent } from "@/components/stories/StoryContent";
import { EyeOff, Pause, Play, Trash2, X } from "lucide-react";

export type ViewerPhase = "closed" | "viewing" | "paused";

interface ViewTarget {
  stories: Story[];
  startIndex: number;
}

export function StoryViewer({
  target,
  viewerName,
  viewerAvatarPath,
  accent,
  onClose,
  onSeen,
  onDelete,
}: {
  target: ViewTarget | null;
  viewerName: string;
  viewerAvatarPath?: string | null | undefined;
  accent?: Story["accent"] | undefined;
  onClose: () => void;
  onSeen?: ((story: Story) => void) | undefined;
  onDelete?: ((story: Story) => void) | undefined;
}) {
  const open = target !== null;
  const [index, setIndex] = useState(target?.startIndex ?? 0);
  const [phase, setPhase] = useState<ViewerPhase>("closed");
  const [progress, setProgress] = useState(0);

  const stories = useMemo(() => target?.stories ?? [], [target]);
  const current = stories[index];

  const elapsedRef = useRef(0);
  const rafRef = useRef(0);
  const lastTickRef = useRef(0);
  const seenRef = useRef<Set<string>>(new Set());
  const swipeRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);

  /* opening / closing transitions */
  useEffect(() => {
    if (open) {
      setIndex(target?.startIndex ?? 0);
      setProgress(0);
      elapsedRef.current = 0;
      seenRef.current = new Set();
      setPhase("viewing");
    } else {
      setPhase("closed");
    }
  }, [open, target]);

  const stopLoop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    lastTickRef.current = 0;
  }, []);

  const goTo = useCallback(
    (nextIndex: number, direction: 1 | -1) => {
      if (!stories.length) return onClose();
      // Skip stories that quietly expired while the viewer was open.
      let i = nextIndex;
      while (i >= 0 && i < stories.length && !isStoryActive(stories[i]!)) {
        i += direction;
      }
      if (i < 0 || i >= stories.length) return onClose();
      elapsedRef.current = 0;
      setProgress(0);
      setIndex(i);
    },
    [stories, onClose],
  );

  const next = useCallback(() => {
    if (current) {
      seenRef.current.add(current.id);
      onSeen?.(current);
    }
    goTo(index + 1, 1);
  }, [current, goTo, index, onSeen]);

  const prev = useCallback(() => goTo(index - 1, -1), [goTo, index]);

  /* the one timer: progress for the active story only while phase === viewing */
  useEffect(() => {
    if (!open || phase !== "viewing" || !current) {
      stopLoop();
      return;
    }
    const dwell = STORY_DWELL_MS[current.kind];

    const frame = (now: number) => {
      const last = lastTickRef.current || now;
      lastTickRef.current = now;
      elapsedRef.current += now - last;
      const p = Math.min(1, elapsedRef.current / dwell);
      setProgress(p);
      if (p >= 1) {
        next();
        return;
      }
      rafRef.current = requestAnimationFrame(frame);
    };
    rafRef.current = requestAnimationFrame(frame);

    return stopLoop;
  }, [open, phase, current, next, stopLoop]);

  /* pause on background tab / while a delete confirmation is up */
  useEffect(() => {
    const onHide = () => {
      if (document.hidden) setPhase((p) => (p === "viewing" ? "paused" : p));
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, []);

  /* a story expiring or being deleted while open — glide to the next one */
  useEffect(() => {
    if (open && current && !isStoryActive(current)) goTo(index + 1, 1);
  }, [current, goTo, index, open, stories]);

  /* mark all viewed stories seen when closing */
  const close = useCallback(() => {
    if (current) {
      seenRef.current.add(current.id);
      onSeen?.(current);
    }
    stopLoop();
    setPhase("closed");
    onClose();
  }, [current, onClose, onSeen, stopLoop]);

  const togglePause = useCallback(() => {
    setPhase((p) => (p === "paused" ? "viewing" : p === "viewing" ? "paused" : p));
  }, []);

  /* keyboard */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      } else if (e.key === " " || e.key.toLowerCase() === "k") {
        e.preventDefault();
        togglePause();
      }
    };
    window.addEventListener("keydown", onKey, { capture: false });
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close, next, prev, togglePause]);

  /* gestures: horizontal swipe + hold-to-pause on the frame.
   * The two invisible nav buttons (left/right) own tap + keyboard input,
   * so a tap here only resumes playback — never double-advances. */
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    swipeRef.current = { x: e.clientX, y: e.clientY, t: Date.now() };
    setPhase((p) => (p === "viewing" ? "paused" : p));
  }, []);

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const start = swipeRef.current;
      swipeRef.current = null;
      if (!start) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      const dt = Date.now() - start.t;
      const isSwipe = Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) && dt < 700;
      const isTap = dt < 260 && Math.abs(dx) < 12 && Math.abs(dy) < 12;
      if (isSwipe) {
        if (dx < 0) next();
        else prev();
        setPhase("viewing");
        return;
      }
      if (isTap) {
        // taps landing on the nav buttons navigate via their own onClick;
        // any other tap just resumes.
        setPhase("viewing");
        return;
      }
      // hold: remains paused until Play, Space/K, or the next tap.
    },
    [next, prev],
  );

  if (!open || !current) return null;

  return (
    <DialogPrimitive.Root open onOpenChange={(o) => !o && close()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-[14px] data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            requestAnimationFrame(() => frameRef.current?.focus());
          }}
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          className={cn(
            "fixed inset-0 z-[71] flex items-center justify-center outline-none",
            "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:duration-200",
          )}
        >
          <DialogPrimitive.Title className="sr-only">Stories by {viewerName}</DialogPrimitive.Title>

          {/* the "phone-frame" column, centered; page behind stays dark */}
          <div
            ref={frameRef}
            tabIndex={-1}
            data-story-frame=""
            className="relative flex h-full w-full max-w-[460px] flex-col overflow-hidden outline-none transition-[transform,opacity] duration-200 data-[state=closed]:opacity-0 sm:h-[min(92vh,860px)] sm:rounded-[20px] sm:border sm:border-border"
            style={{
              background:
                "radial-gradient(140% 90% at 50% 0%, oklch(0.24 0.024 280), oklch(0.155 0.018 279) 70%)",
              boxShadow: "0 60px 140px -60px rgba(0,0,0,0.9)",
            }}
          >
            {/* progress segments */}
            <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex gap-1 px-3 pt-[max(10px,env(safe-area-inset-top))]">
              {stories.map((s, i) => (
                <div
                  key={s.id}
                  className="h-[2.5px] flex-1 overflow-hidden rounded-full bg-foreground/15"
                >
                  <div
                    className="h-full rounded-full bg-foreground/80"
                    style={{
                      width:
                        i < index ? "100%" : i === index ? `${Math.round(progress * 100)}%` : "0%",
                      transition: i === index ? "none" : "width 240ms ease",
                    }}
                  />
                </div>
              ))}
            </div>

            {/* header */}
            <div className="relative z-20 flex items-center gap-3 px-3 pb-2 pt-[max(22px,calc(env(safe-area-inset-top)+16px))]">
              <ProfileAvatar
                name={viewerName}
                avatarPath={viewerAvatarPath ?? null}
                accent={accent ?? "violet"}
                size={34}
                ring="none"
              />
              <div className="min-w-0 flex-1 leading-tight">
                <DialogPrimitive.Description asChild>
                  <p className="truncate text-[13px] font-medium text-foreground">{viewerName}</p>
                </DialogPrimitive.Description>
                <p className="mono text-[10px] uppercase tracking-[0.08em] text-faint">
                  {formatRelativeDay(current.createdAt)} ·{" "}
                  {current.visibility === "public" ? "shared" : "private"}
                </p>
              </div>
              <button
                type="button"
                onClick={togglePause}
                aria-label={phase === "paused" ? "Play story" : "Pause story"}
                className="grid size-9 place-items-center rounded-full text-foreground/80 transition-colors hover:bg-foreground/10"
              >
                {phase === "paused" ? <Play className="size-4" /> : <Pause className="size-4" />}
              </button>
              {onDelete ? (
                <button
                  type="button"
                  onClick={() => onDelete(current)}
                  aria-label="Delete story"
                  className="grid size-9 place-items-center rounded-full text-foreground/80 transition-colors hover:bg-rose/15 hover:text-rose"
                >
                  <Trash2 className="size-4" />
                </button>
              ) : null}
              <button
                type="button"
                onClick={close}
                aria-label="Close stories"
                className="grid size-9 place-items-center rounded-full text-foreground/80 transition-colors hover:bg-foreground/10"
              >
                <X className="size-4" />
              </button>
            </div>

            {/* content + invisible navigation zones (buttons for a11y) */}
            <div
              className="relative z-10 min-h-0 flex-1"
              onPointerDown={onPointerDown}
              onPointerUp={onPointerUp}
              onPointerCancel={() => {
                swipeRef.current = null;
                setPhase("viewing");
              }}
            >
              <StoryContent story={current} />
              <button
                type="button"
                aria-label="Previous story"
                onClick={prev}
                className="absolute inset-y-0 left-0 w-[38%] cursor-default"
              />
              <button
                type="button"
                aria-label="Next story"
                onClick={next}
                className="absolute inset-y-0 right-0 left-[62%] cursor-default"
              />
            </div>

            {/* footer / pause affordance */}
            <div className="relative z-20 flex items-center justify-between px-4 pb-[max(14px,calc(env(safe-area-inset-bottom)+10px))] pt-1">
              <p className="mono text-[10px] uppercase tracking-[0.08em] text-faint">
                {index + 1} of {stories.length}
              </p>
              <p className="mono inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.08em] text-faint">
                {current.visibility === "public" ? (
                  "shared from your profile"
                ) : (
                  <>
                    <EyeOff className="size-3" aria-hidden /> private — only you can see it
                  </>
                )}
              </p>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
