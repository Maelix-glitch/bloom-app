/**
 * StoryViewer — Instagram-exact full-screen story viewer.
 *
 * Instagram specs implemented:
 * - Full-screen black (#000) backdrop, no blur, no rounded corners on mobile
 * - On desktop: centered 500px column with black sides, 9:16 aspect
 * - Top progress: thin 2px white lines, gap 4px, background rgba(255,255,255,0.35)
 * - Header: 32px avatar, 14px bold username white, 14px time gray, right: more (⋯) + close (×)
 * - Tap: left 30% = prev, right 70% = next, tap and hold = pause
 * - Swipe down >80px = close with drag follow, swipe left/right = next/prev user (here: next/prev story)
 * - Bottom: other user = rounded reply input "Reply to {name}..." + heart + paper-plane; own = eye views + controls
 * - Auto-advance: image 5s, video = video duration, pause on hold/sheet/visibility
 * - Keyboard: Esc close, ← → navigate, Space pause
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Eye, MoreHorizontal, Send, X, Heart, Trash2, Volume2, VolumeX } from "lucide-react";

import { cn } from "@/lib/utils";
import { isStoryActive, STORY_DWELL_MS, type Story } from "@/lib/profile/types";
import { storyMediaUrl } from "@/lib/profile/storyMeta";
import { StoryCanvas, type CanvasInteraction, type CanvasMedia } from "./StoryCanvas";
import { StoryContent } from "./StoryContent";
import { GiftSheet, ReplySheet, StoryInsightsSheet } from "./InteractionSheets";
import { GIFT_META } from "@/lib/stories/catalogs";
import { recordView } from "@/lib/stories/interactions";
import { storyAge } from "@/lib/stories/time";
import { StoryErrorBoundary } from "./ErrorBoundary";
import type { StoryGiftKind } from "@/lib/stories/types";
import { toast } from "sonner";

export type ViewerPhase = "closed" | "viewing" | "paused";

interface ViewTarget {
  stories: Story[];
  startIndex: number;
}

export function isRichStory(story: Story): boolean {
  return (
    story.kind === "video" ||
    story.mediaType === "video" ||
    (story.elements?.length ?? 0) > 0 ||
    Boolean(story.backgroundId)
  );
}

const HOLD_MS = 200;

export function StoryViewer({
  target,
  viewerName,
  viewerAvatarPath,
  accent,
  onClose,
  onSeen,
  onDelete,
  userId = null,
  userName = null,
  ownerId = null,
  onShareAgain,
  onAddToHighlight,
}: {
  target: ViewTarget | null;
  viewerName: string;
  viewerAvatarPath?: string | null | undefined;
  accent?: Story["accent"] | undefined;
  onClose: () => void;
  onSeen?: ((story: Story) => void) | undefined;
  onDelete?: ((story: Story) => void) | undefined;
  userId?: string | null | undefined;
  userName?: string | null | undefined;
  ownerId?: string | null | undefined;
  onShareAgain?: ((story: Story) => void) | undefined;
  onAddToHighlight?: ((story: Story) => void) | undefined;
}) {
  const open = target !== null;
  const [index, setIndex] = useState(target?.startIndex ?? 0);
  const [phase, setPhase] = useState<ViewerPhase>("closed");
  const [progress, setProgress] = useState(0);
  const [muted, setMuted] = useState(true);
  const [sheet, setSheet] = useState<"reply" | "gift" | "insights" | null>(null);
  const [dragY, setDragY] = useState(0);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const stories = useMemo(() => target?.stories ?? [], [target]);
  const current = stories[index];
  const isOwner = Boolean(onDelete) || (ownerId !== null && userId !== null && ownerId === userId);

  const elapsedRef = useRef(0);
  const rafRef = useRef(0);
  const lastTickRef = useRef(0);
  const seenRef = useRef<Set<string>>(new Set());
  const viewedRef = useRef<Set<string>>(new Set());
  const swipeRef = useRef<{ x: number; y: number; t: number } | null>(null);
  const holdTimer = useRef<number | undefined>(undefined);
  const holdActive = useRef(false);
  const suppressTap = useRef(false);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const videoTime = useRef<{ currentMs: number; durationMs: number } | null>(null);

  const isVideo = current?.mediaType === "video" || current?.kind === "video";
  const rich = current ? isRichStory(current) : false;

  /* open/close */
  useEffect(() => {
    if (open) {
      setIndex(target?.startIndex ?? 0);
      setProgress(0);
      elapsedRef.current = 0;
      videoTime.current = null;
      seenRef.current = new Set();
      viewedRef.current = new Set();
      setSheet(null);
      setPhase("viewing");
      setDragY(0);
      setDragX(0);
      requestAnimationFrame(() => frameRef.current?.focus());
    } else {
      setPhase("closed");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const stopLoop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    lastTickRef.current = 0;
  }, []);

  useEffect(() => stopLoop, [stopLoop]);

  const goTo = useCallback(
    (nextIndex: number, direction: 1 | -1) => {
      if (!stories.length) return onClose();
      let i = nextIndex;
      while (i >= 0 && i < stories.length && !isStoryActive(stories[i]!)) {
        i += direction;
      }
      if (i < 0 || i >= stories.length) return onClose();
      elapsedRef.current = 0;
      videoTime.current = null;
      setProgress(0);
      setMuted(true);
      setIndex(i);
      setPhase((p) => (p === "closed" ? p : "viewing"));
      setDragY(0);
      setDragX(0);
    },
    [stories, onClose],
  );

  const markCurrentSeen = useCallback(() => {
    if (!current || seenRef.current.has(current.id)) return;
    seenRef.current.add(current.id);
    onSeen?.(current);
  }, [current, onSeen]);

  const next = useCallback(() => {
    markCurrentSeen();
    goTo(index + 1, 1);
  }, [goTo, index, markCurrentSeen]);

  const prev = useCallback(() => goTo(index - 1, -1), [goTo, index]);

  useEffect(() => {
    if (!open || !current) return;
    if (viewedRef.current.has(current.id)) return;
    viewedRef.current.add(current.id);
    void recordView(current.id, userId, userName);
  }, [open, current, userId, userName]);

  /* progress */
  useEffect(() => {
    if (!open || phase !== "viewing" || !current) {
      stopLoop();
      return;
    }
    if (isVideo) return stopLoop();

    const dwell = current.durationMs ?? STORY_DWELL_MS[current.kind] ?? 5000;
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
  }, [open, phase, current, isVideo, next, stopLoop]);

  const handleVideoTime = useCallback((currentMs: number, durationMs: number) => {
    videoTime.current = { currentMs, durationMs };
    if (durationMs > 0) setProgress(Math.min(1, currentMs / durationMs));
  }, []);

  useEffect(() => {
    if (!open) return;
    if (sheet) setPhase("paused");
    else setPhase("viewing");
  }, [sheet, open]);

  useEffect(() => {
    const onHide = () => {
      if (document.hidden) setPhase((p) => (p === "viewing" ? "paused" : p));
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, []);

  useEffect(() => {
    if (open && current && !isStoryActive(current)) {
      if (stories.length <= 1) {
        toast("This story has ended.");
        onClose();
      } else {
        goTo(index + 1, 1);
      }
    }
  }, [current, goTo, index, open, onClose, stories.length]);

  useEffect(() => {
    if (!open) return;
    const upcoming = stories[index + 1];
    if (!upcoming?.mediaPath) return;
    const url = storyMediaUrl(upcoming);
    if (!url) return;
    if (upcoming.mediaType === "video" || upcoming.kind === "video") {
      const video = document.createElement("video");
      video.preload = "auto";
      video.src = url;
    } else {
      const img = new Image();
      img.src = url;
    }
  }, [open, stories, index]);

  const close = useCallback(() => {
    markCurrentSeen();
    stopLoop();
    window.clearTimeout(holdTimer.current);
    setPhase("closed");
    onClose();
  }, [markCurrentSeen, onClose, stopLoop]);

  const togglePause = useCallback(() => {
    setPhase((p) => (p === "paused" ? "viewing" : p === "viewing" ? "paused" : p));
  }, []);

  /* keyboard */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      if (e.key === "Escape") {
        e.preventDefault();
        if (sheet) setSheet(null);
        else close();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prev();
      } else if (e.key === " " || e.key.toLowerCase() === "k") {
        e.preventDefault();
        togglePause();
      } else if (e.key.toLowerCase() === "m") {
        setMuted((m) => !m);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close, next, prev, togglePause, sheet]);

  /* gestures - Instagram style */
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    // Ignore if clicking header buttons
    const target = e.target as HTMLElement;
    if (target.closest("button")) return;

    swipeRef.current = { x: e.clientX, y: e.clientY, t: Date.now() };
    holdActive.current = false;
    setIsDragging(false);
    window.clearTimeout(holdTimer.current);
    holdTimer.current = window.setTimeout(() => {
      holdActive.current = true;
      suppressTap.current = true;
      setPhase((p) => (p === "viewing" ? "paused" : p));
    }, HOLD_MS);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const start = swipeRef.current;
    if (!start) return;

    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 8) {
      window.clearTimeout(holdTimer.current);
      if (!holdActive.current) {
        setIsDragging(true);
        // Vertical drag dominates -> close gesture
        if (Math.abs(dy) > Math.abs(dx) && dy > 0) {
          setDragY(dy);
          setDragX(dx * 0.3); // slight horizontal follow
        } else if (Math.abs(dx) > 20) {
          setDragX(dx);
        }
      }
    }
  }, []);

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const start = swipeRef.current;
      swipeRef.current = null;
      window.clearTimeout(holdTimer.current);

      const wasHold = holdActive.current;
      holdActive.current = false;

      if (!start) {
        setIsDragging(false);
        setDragY(0);
        setDragX(0);
        return;
      }

      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      const dt = Date.now() - start.t;

      // Drag down to close (Instagram)
      if (dy > 80 && Math.abs(dy) > Math.abs(dx) * 1.2 && dt < 800) {
        setPhase("viewing");
        close();
        return;
      }

      // Horizontal swipe to navigate (Instagram)
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.2 && dt < 600) {
        if (dx < 0) next();
        else prev();
        setPhase("viewing");
        setDragY(0);
        setDragX(0);
        setIsDragging(false);
        window.setTimeout(() => {
          suppressTap.current = false;
        }, 0);
        return;
      }

      if (wasHold) {
        setPhase("viewing");
        setDragY(0);
        setDragX(0);
        setIsDragging(false);
        window.setTimeout(() => {
          suppressTap.current = false;
        }, 60);
        return;
      }

      // Reset drag
      setDragY(0);
      setDragX(0);
      setIsDragging(false);
    },
    [close, next, prev],
  );

  const onZoneTap = useCallback(
    (direction: 1 | -1) => {
      if (suppressTap.current) {
        suppressTap.current = false;
        return;
      }
      if (phase === "paused" && !sheet) {
        setPhase("viewing");
        return;
      }
      if (direction === 1) next();
      else prev();
    },
    [next, prev, phase, sheet],
  );

  const interaction: CanvasInteraction | null = useMemo(
    () => (current ? { storyId: current.id, userId, userName, isOwner } : null),
    [current, userId, userName, isOwner],
  );

  if (!open || !current) return null;

  const media: CanvasMedia =
    current.mediaType === "video" || current.kind === "video"
      ? { type: "video", src: storyMediaUrl(current) }
      : current.mediaPath
        ? { type: "image", src: storyMediaUrl(current) }
        : { type: "none", src: null };

  const paused = phase === "paused";

  // Instagram time format: "5h", "1d" etc
  const timeAgo = storyAge(current.createdAt)
    .replace(" ago", "")
    .replace("minutes", "m")
    .replace("minute", "m")
    .replace("hours", "h")
    .replace("hour", "h")
    .replace("days", "d")
    .replace("day", "d")
    .replace(" ", "");

  return (
    <StoryErrorBoundary>
      <div
        className="ig-viewer-root fixed inset-0 z-[100] bg-black"
        role="dialog"
        aria-modal="true"
        aria-label={`Stories by ${viewerName}`}
      style={{
        transform: isDragging ? `translate(${dragX}px, ${dragY}px)` : undefined,
        opacity: isDragging && dragY > 0 ? Math.max(0.5, 1 - dragY / 400) : 1,
        transition: isDragging ? "none" : "transform 200ms ease, opacity 200ms ease",
      }}
    >
      {/* Full-screen container - Instagram centers content on desktop */}
      <div className="ig-viewer-container">
        <div
          ref={frameRef}
          tabIndex={-1}
          className="ig-viewer-frame"
          style={{
            background: "#000",
          }}
        >
          {/* Progress bars - Instagram top */}
          <div className="ig-progress-container">
            {stories.map((s, i) => (
              <div key={s.id} className="ig-progress-bar">
                <div
                  className="ig-progress-fill"
                  style={{
                    width: i < index ? "100%" : i === index ? `${Math.round(progress * 100)}%` : "0%",
                  }}
                />
              </div>
            ))}
          </div>

          {/* Header - Instagram style */}
          <div className="ig-viewer-header">
            <div className="ig-header-left">
              <div className="ig-header-avatar">
                {viewerAvatarPath ? (
                  <img
                    src={viewerAvatarPath}
                    alt={viewerName}
                    className="size-full rounded-full object-cover"
                  />
                ) : (
                  <span className="grid size-full place-items-center rounded-full bg-[#363636] text-[12px] font-semibold text-white">
                    {viewerName.slice(0, 1).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="ig-header-info">
                <span className="ig-header-username">{viewerName}</span>
                <span className="ig-header-time">{timeAgo}</span>
              </div>
            </div>

            <div className="ig-header-right">
              {isVideo ? (
                <button
                  type="button"
                  onClick={() => setMuted((m) => !m)}
                  aria-label={muted ? "Unmute" : "Mute"}
                  className="ig-header-btn"
                >
                  {muted ? <VolumeX className="size-[18px]" /> : <Volume2 className="size-[18px]" />}
                </button>
              ) : null}
              <button type="button" aria-label="More options" className="ig-header-btn">
                <MoreHorizontal className="size-[20px]" />
              </button>
              <button type="button" onClick={close} aria-label="Close" className="ig-header-btn">
                <X className="size-[22px]" />
              </button>
            </div>
          </div>

          {/* Content + tap zones */}
          <div
            className="ig-viewer-content"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={() => {
              swipeRef.current = null;
              window.clearTimeout(holdTimer.current);
              holdActive.current = false;
              setIsDragging(false);
              setDragY(0);
              setDragX(0);
            }}
          >
            {rich ? (
              <StoryCanvas
                key={current.id}
                media={media}
                backgroundId={current.backgroundId}
                filterId={current.filterId}
                adjustments={current.adjustments}
                elements={current.elements ?? []}
                mode="interactive"
                interaction={interaction}
                paused={paused}
                muted={muted}
                onVideoTime={handleVideoTime}
                onVideoEnded={() => next()}
                alt={current.altText ?? current.title ?? `Story by ${viewerName}`}
                createdAt={current.createdAt}
                className="ig-canvas"
              />
            ) : (
              <div className="ig-canvas-static">
                <StoryContent story={current} />
              </div>
            )}

            {/* Instagram tap zones - invisible but functional */}
            <button
              type="button"
              aria-label="Previous story"
              onClick={() => onZoneTap(-1)}
              className="ig-tap-zone ig-tap-zone-left"
            />
            <button
              type="button"
              aria-label="Next story"
              onClick={() => onZoneTap(1)}
              className="ig-tap-zone ig-tap-zone-right"
            />
          </div>

          {/* Footer - Instagram style */}
          <div className="ig-viewer-footer">
            {isOwner ? (
              <div className="ig-footer-owner">
                <button
                  type="button"
                  onClick={() => setSheet("insights")}
                  className="ig-footer-views-btn"
                >
                  <Eye className="size-[18px]" />
                  <span>Viewers</span>
                </button>
                <div className="ig-footer-owner-actions">
                  <button
                    type="button"
                    onClick={() => onDelete && current && onDelete(current)}
                    aria-label="Delete"
                    className="ig-footer-icon-btn"
                  >
                    <Trash2 className="size-[20px]" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setSheet("insights")}
                    aria-label="More"
                    className="ig-footer-icon-btn"
                  >
                    <MoreHorizontal className="size-[20px]" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="ig-footer-reply">
                <div className="ig-reply-input-wrap">
                  <input
                    type="text"
                    placeholder={`Reply to ${viewerName}...`}
                    readOnly
                    onFocus={() => setSheet("reply")}
                    onClick={() => setSheet("reply")}
                    className="ig-reply-input"
                  />
                </div>
                <button
                  type="button"
                  aria-label="Like"
                  className="ig-footer-icon-btn"
                  onClick={() => {
                    // Quick heart reaction
                    toast("❤️ Sent");
                  }}
                >
                  <Heart className="size-[24px]" />
                </button>
                <button
                  type="button"
                  aria-label="Send"
                  className="ig-footer-icon-btn"
                  onClick={() => setSheet("reply")}
                >
                  <Send className="size-[24px]" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sheets */}
      {sheet === "reply" ? (
        <ReplySheet
          story={current}
          ownerName={isOwner ? "your story" : viewerName}
          userId={userId}
          userName={userName}
          isOwner={isOwner}
          onClose={() => setSheet(null)}
          onSent={() => toast(isOwner ? "Reply noted." : `Sent to ${viewerName}.`)}
        />
      ) : null}
      {sheet === "gift" ? (
        <GiftSheet
          story={current}
          ownerName={viewerName}
          userId={userId}
          userName={userName}
          onClose={() => setSheet(null)}
          onSent={(gift) => {
            toast(`${GIFT_META[gift].glyph} Sent to ${viewerName}.`);
          }}
        />
      ) : null}
      {sheet === "insights" && isOwner ? (
        <StoryInsightsSheet
          story={current}
          userId={userId}
          onClose={() => setSheet(null)}
          onDelete={() => {
            setSheet(null);
            if (onDelete) onDelete(current);
          }}
          onShareAgain={
            onShareAgain
              ? () => {
                  setSheet(null);
                  onShareAgain(current);
                }
              : undefined
          }
          onAddToHighlight={
            onAddToHighlight
              ? () => {
                  setSheet(null);
                  onAddToHighlight(current);
                }
              : undefined
          }
        />
      ) : null}
      </div>
    </StoryErrorBoundary>
  );
}
