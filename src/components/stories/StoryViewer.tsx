/**
 * StoryViewer — the immersive full-screen story session.
 *
 *   closed ⇄ viewing ⇄ paused
 *
 * One rAF loop drives image/text progress; video stories sync to real
 * playback time. Tap zones + hold-to-pause + swipe (down closes, sideways
 * navigates), arrows/Escape/Space on desktop. Reactions, private replies,
 * and Bloom gifts float above the content; owners get quiet insights.
 * Sheets pause playback; everything resumes where it left off.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronUp,
  Eye,
  EyeOff,
  Gift as GiftIcon,
  Pause,
  Play,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { isStoryActive, STORY_DWELL_MS, type Story } from "@/lib/profile/types";
import { storyMediaUrl } from "@/lib/profile/storyMeta";
import { StoryAvatar } from "./StoryAvatar";
import { StoryCanvas, type CanvasInteraction, type CanvasMedia } from "./StoryCanvas";
import { StoryContent } from "./StoryContent";
import { GiftSheet, ReactionBar, ReplySheet, StoryInsightsSheet } from "./InteractionSheets";
import { GIFT_META } from "@/lib/stories/catalogs";
import { recordView } from "@/lib/stories/interactions";
import { storyAge } from "@/lib/stories/time";
import type { StoryGiftKind } from "@/lib/stories/types";
import { normalizeAccent } from "@/lib/profile/types";
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

const HOLD_MS = 210;

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
  const [pop, setPop] = useState<{ id: number; glyph: string } | null>(null);
  const [burst, setBurst] = useState<{ id: number; gift: StoryGiftKind } | null>(null);

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
  const popTimer = useRef<number | undefined>(undefined);

  const isVideo = current?.mediaType === "video" || current?.kind === "video";
  const rich = current ? isRichStory(current) : false;

  /* ------------------------------ open/close ----------------------------- */
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

  /* record a server-side view once per story per session (best-effort) */
  useEffect(() => {
    if (!open || !current) return;
    if (viewedRef.current.has(current.id)) return;
    viewedRef.current.add(current.id);
    void recordView(current.id, userId, userName);
  }, [open, current, userId, userName]);

  /* ------------------------------- progress ------------------------------ */
  useEffect(() => {
    if (!open || phase !== "viewing" || !current) {
      stopLoop();
      return;
    }
    // Video stories: the <video> clock drives progress (see onVideoTime).
    if (isVideo) return stopLoop();

    const dwell = current.durationMs ?? STORY_DWELL_MS[current.kind] ?? 7000;
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

  /* pause while any sheet is open; resume after */
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

  /* a story expiring or being deleted while open — glide onward */
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

  /* prefetch the next story's media */
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

  /* -------------------------------- keyboard ------------------------------ */
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

  /* ------------------------------- gestures ------------------------------ */
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    swipeRef.current = { x: e.clientX, y: e.clientY, t: Date.now() };
    holdActive.current = false;
    window.clearTimeout(holdTimer.current);
    holdTimer.current = window.setTimeout(() => {
      holdActive.current = true;
      suppressTap.current = true;
      setPhase((p) => (p === "viewing" ? "paused" : p));
    }, HOLD_MS);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    const start = swipeRef.current;
    if (!start || holdActive.current) return;
    // Moving early cancels the hold — it's a swipe or scroll, not a pause.
    if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > 12) {
      window.clearTimeout(holdTimer.current);
    }
  }, []);

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const start = swipeRef.current;
      swipeRef.current = null;
      window.clearTimeout(holdTimer.current);
      if (!start) return;
      const wasHold = holdActive.current;
      holdActive.current = false;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      const dt = Date.now() - start.t;

      // Swipe down exits; sideways navigates.
      if (dy > 72 && Math.abs(dy) > Math.abs(dx) * 1.4 && dt < 800) {
        setPhase("viewing");
        close();
        return;
      }
      if (Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy) * 1.3 && dt < 700) {
        if (dx < 0) next();
        else prev();
        setPhase("viewing");
        window.setTimeout(() => {
          suppressTap.current = false;
        }, 0);
        return;
      }
      if (wasHold) {
        // Held to pause: release resumes; the tap must not navigate.
        setPhase("viewing");
        window.setTimeout(() => {
          suppressTap.current = false;
        }, 60);
      }
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

  /* ------------------------------ interactions --------------------------- */
  const firePop = useCallback((glyph: string) => {
    window.clearTimeout(popTimer.current);
    setPop({ id: Date.now(), glyph });
    popTimer.current = window.setTimeout(() => setPop(null), 900);
  }, []);

  const fireBurst = useCallback((gift: StoryGiftKind) => {
    setBurst({ id: Date.now(), gift });
    window.setTimeout(() => setBurst(null), 1700);
  }, []);

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

  return (
    <div
      className="bstory sv-root fixed inset-0 z-[70]"
      role="dialog"
      aria-modal="true"
      aria-label={`Stories by ${viewerName}`}
    >
      <div className="absolute inset-0 bg-black/88 backdrop-blur-[14px]" aria-hidden />

      <div className="absolute inset-0 flex items-center justify-center">
        <div
          ref={frameRef}
          tabIndex={-1}
          data-story-frame=""
          className="sv-frame relative flex h-full w-full max-w-[460px] flex-col overflow-hidden outline-none sm:h-[min(92vh,860px)] sm:rounded-2xl sm:border sm:border-white/10"
          style={{
            background:
              "radial-gradient(140% 90% at 50% 0%, oklch(0.24 0.024 280), oklch(0.155 0.018 279) 70%)",
            boxShadow: "0 60px 140px -60px rgba(0,0,0,0.9)",
          }}
        >
          {/* progress */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex gap-1 px-3 pt-[max(10px,env(safe-area-inset-top))]">
            {stories.map((s, i) => (
              <div key={s.id} className="sv-progress">
                <span
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
          <div className="relative z-30 flex items-center gap-2.5 px-2.5 pb-1 pt-[max(24px,calc(env(safe-area-inset-top)+18px))]">
            <StoryAvatar
              name={viewerName}
              avatarPath={viewerAvatarPath ?? null}
              accent={accent ?? "violet"}
              size={34}
              ring="none"
            />
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-[13px] font-semibold text-white">{viewerName}</p>
              <p className="mono text-[10px] uppercase tracking-[0.08em] text-white/55">
                {storyAge(current.createdAt)}
                {" · "}
                {current.visibility === "public" ? "shared" : "private"}
                {current.audience === "close" ? " · close friends" : ""}
              </p>
            </div>
            {isVideo ? (
              <button
                type="button"
                onClick={() => setMuted((m) => !m)}
                aria-label={muted ? "Unmute video" : "Mute video"}
                className="sv-icon-btn"
              >
                {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
              </button>
            ) : null}
            <button
              type="button"
              onClick={togglePause}
              aria-label={paused ? "Play story" : "Pause story"}
              className="sv-icon-btn"
            >
              {paused ? <Play className="size-4" /> : <Pause className="size-4" />}
            </button>
            {isOwner && onDelete ? (
              <button
                type="button"
                onClick={() => onDelete(current)}
                aria-label="Delete story"
                className="sv-icon-btn hover:!bg-rose/20 hover:!text-[#ff9d9d]"
              >
                <Trash2 className="size-4" />
              </button>
            ) : null}
            <button
              type="button"
              onClick={close}
              aria-label="Close stories"
              className="sv-icon-btn"
            >
              <X className="size-[18px]" />
            </button>
          </div>

          {/* content + tap zones */}
          <div
            className="relative z-10 min-h-0 flex-1"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={() => {
              swipeRef.current = null;
              window.clearTimeout(holdTimer.current);
              holdActive.current = false;
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
              />
            ) : (
              <div className="sv-media absolute inset-0">
                <StoryContent story={current} />
              </div>
            )}

            {/* invisible navigation zones (real buttons for a11y) */}
            <button
              type="button"
              aria-label="Previous story"
              onClick={() => onZoneTap(-1)}
              className="absolute inset-y-0 left-0 z-20 w-[34%] cursor-default"
            />
            <button
              type="button"
              aria-label="Next story"
              onClick={() => onZoneTap(1)}
              className="absolute inset-y-0 right-0 z-20 w-[34%] cursor-default"
            />

            {/* reaction pop */}
            {pop ? (
              <div
                key={pop.id}
                className="pointer-events-none absolute inset-0 z-30 grid place-items-center"
                aria-hidden
              >
                <span className="sv-heart-pop text-[84px] leading-none drop-shadow-[0_10px_30px_rgba(0,0,0,0.6)]">
                  {pop.glyph}
                </span>
              </div>
            ) : null}

            {/* gift burst */}
            {burst ? (
              <div
                key={burst.id}
                className="pointer-events-none absolute inset-0 z-30 overflow-hidden"
                aria-hidden
              >
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <span
                    key={i}
                    className="sv-gift-particle"
                    style={{
                      left: `${30 + i * 8 + (i % 2) * 4}%`,
                      animationDelay: `${i * 90}ms`,
                      color: GIFT_META[burst.gift].tint,
                    }}
                  >
                    {GIFT_META[burst.gift].glyph}
                  </span>
                ))}
              </div>
            ) : null}

            {paused && !sheet ? (
              <div
                className="pointer-events-none absolute inset-x-0 top-1/2 z-30 flex -translate-y-1/2 justify-center"
                aria-hidden
              >
                <span className="sv-chip sv-toast">
                  <Pause className="size-3" /> Paused
                </span>
              </div>
            ) : null}
          </div>

          {/* footer */}
          <div className="relative z-30 flex flex-col gap-2 px-3 pb-[max(12px,calc(env(safe-area-inset-bottom)+8px))] pt-1">
            {isOwner ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSheet("insights")}
                  className="sv-reply-pill min-w-0 flex-1"
                  aria-label="Open story insights"
                >
                  <Eye className="size-4 shrink-0 text-white/60" aria-hidden />
                  <span className="truncate text-white/60">Views & replies…</span>
                  <ChevronUp className="size-4 shrink-0 text-white/60" aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => setSheet("insights")}
                  aria-label="Story insights"
                  className="sv-react-btn !w-[46px] shrink-0 border !border-white/12 bg-white/5 text-[17px]"
                >
                  <Eye className="size-[18px] text-white/80" aria-hidden />
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-center">
                  <ReactionBar
                    storyId={current.id}
                    userId={userId}
                    userName={userName}
                    enabled
                    onPop={firePop}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSheet("reply")}
                    className="sv-reply-pill min-w-0 flex-1"
                    aria-label={`Reply to ${viewerName}'s story`}
                  >
                    <span className="truncate text-white/60">Reply to {viewerName}…</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSheet("gift")}
                    aria-label={`Send ${viewerName} a Bloom gift`}
                    className="sv-react-btn shrink-0 border !border-white/12 bg-white/5"
                  >
                    <GiftIcon className="size-5 text-[#eed9a4]" aria-hidden />
                  </button>
                </div>
              </>
            )}
            <div className="flex items-center justify-between px-1">
              <p className="mono text-[10px] uppercase tracking-[0.08em] text-white/40">
                {index + 1} of {stories.length}
              </p>
              <p className="mono inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.08em] text-white/40">
                {current.visibility === "public" ? (
                  current.audience === "close" ? (
                    "close friends"
                  ) : (
                    "shared from their profile"
                  )
                ) : (
                  <>
                    <EyeOff className="size-3" aria-hidden /> private
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* sheets live above the frame and pause playback */}
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
            fireBurst(gift);
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
  );
}
