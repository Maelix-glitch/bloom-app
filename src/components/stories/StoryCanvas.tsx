/**
 * StoryCanvas — one renderer for "what a story looks like."
 * The viewer (interactive), the editor (selectable), and thumbnails (static)
 * all compose this. Base layer = media or curated background + filter;
 * canvas elements float above in z-order with canvas-relative placement.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link2, Music2 } from "lucide-react";

import type { StoryAdjustments, StoryElement } from "@/lib/stories/types";
import {
  adjustmentsToCss,
  backgroundById,
  filterById,
  fontPresetById,
} from "@/lib/stories/catalogs";
import { StickerArt } from "@/lib/stories/stickers";
import { countdownParts } from "@/lib/stories/time";
import {
  castVote,
  getPollTally,
  getSliderStats,
  type SliderStats,
  type StoryPollTally,
} from "@/lib/stories/interactions";

export interface CanvasMedia {
  type: "none" | "image" | "video";
  src: string | null;
  poster?: string | null | undefined;
}

export interface CanvasInteraction {
  storyId: string;
  userId: string | null;
  userName?: string | null | undefined;
  isOwner: boolean;
}

const INTERACTIVE_KINDS = new Set(["poll", "question", "slider", "countdown", "music", "mention"]);

function useCanvasScale(ref: React.RefObject<HTMLDivElement | null>): number {
  const [width, setWidth] = useState(390);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(Math.max(200, el.clientWidth));
    update();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return width / 390;
}

function useNowTick(active: boolean, ms = 1000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => setNow(Date.now()), ms);
    return () => window.clearInterval(id);
  }, [active, ms]);
  return now;
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/* --------------------------------- pieces ------------------------------- */

function Placed({
  el,
  k,
  interactive,
  selected,
  onSelect,
  children,
}: {
  el: StoryElement;
  k: number;
  interactive: boolean;
  selected: boolean;
  onSelect?: ((id: string | null) => void) | undefined;
  children: React.ReactNode;
}) {
  void k;
  return (
    <div
      className="scanvas-el"
      data-selected={selected || undefined}
      data-interactive={interactive || undefined}
      style={{
        left: `${el.x * 100}%`,
        top: `${el.y * 100}%`,
        transform: `translate(-50%, -50%) rotate(${el.rotation}deg) scale(${el.scale})`,
        zIndex: 10 + el.z,
        pointerEvents: interactive || onSelect ? "auto" : "none",
      }}
      onPointerDown={
        onSelect
          ? (e) => {
              e.stopPropagation();
              onSelect(el.id);
            }
          : undefined
      }
    >
      {children}
    </div>
  );
}

function TextPiece({ el, k }: { el: Extract<StoryElement, { kind: "text" }>; k: number }) {
  const preset = fontPresetById(el.preset);
  const bgColor =
    el.backgroundColor ??
    (el.background === "pill" || el.background === "highlight"
      ? "rgba(20,17,29,0.62)"
      : el.background === "veil"
        ? "rgba(20,17,29,0.4)"
        : "transparent");
  return (
    <div
      className="se-text"
      data-bg={el.background}
      data-anim={el.animation && el.animation !== "none" ? el.animation : undefined}
      style={{
        fontFamily: preset.fontFamily,
        fontWeight: preset.fontWeight,
        fontStyle: preset.fontStyle,
        letterSpacing: preset.letterSpacing,
        lineHeight: preset.lineHeight,
        textTransform: preset.textTransform,
        fontSize: Math.max(10, preset.baseSize * k),
        color: el.color,
        opacity: el.opacity / 100,
        textAlign: el.align,
        textShadow: el.background === "none" ? preset.shadow : "none",
        background:
          el.background === "none" || el.background === "outline" ? "transparent" : bgColor,
        maxWidth: 340 * k,
      }}
    >
      {el.text}
    </div>
  );
}

function PollPiece({
  el,
  k,
  interaction,
}: {
  el: Extract<StoryElement, { kind: "poll" }>;
  k: number;
  interaction: CanvasInteraction | null;
}) {
  const [tally, setTally] = useState<StoryPollTally | null>(null);
  const [busy, setBusy] = useState(false);
  const accent = el.color ?? "#eed9a4";

  useEffect(() => {
    let alive = true;
    if (!interaction) return;
    void getPollTally(interaction.storyId, el.id, el.options.length, interaction.userId).then(
      (t) => alive && setTally(t),
    );
    return () => {
      alive = false;
    };
  }, [interaction, el.id, el.options.length]);

  const vote = useCallback(
    async (index: number) => {
      if (!interaction || busy) return;
      setBusy(true);
      try {
        const t = await castVote(interaction.storyId, el.id, index, interaction.userId);
        setTally({
          ...t,
          counts:
            t.counts.length === el.options.length
              ? t.counts
              : [...t.counts, ...Array(el.options.length - t.counts.length).fill(0)].slice(
                  0,
                  el.options.length,
                ),
        });
      } catch {
        /* toast lives with the caller; the sticker simply stays */
      } finally {
        setBusy(false);
      }
    },
    [interaction, busy, el.id, el.options.length],
  );

  const showResults = tally !== null && (tally.mine !== null || (interaction?.isOwner ?? false));
  return (
    <div
      className="sx-poll"
      style={{ width: 230 * k, ["--sx-accent" as string]: accent } as React.CSSProperties}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <h4>{el.question}</h4>
      {el.options.map((option, i) => {
        const pct =
          showResults && tally && tally.total > 0
            ? Math.round(((tally.counts[i] ?? 0) / tally.total) * 100)
            : 0;
        return (
          <button
            key={`${el.id}-opt-${i}`}
            type="button"
            className="sx-opt"
            data-voted={tally?.mine === i || undefined}
            disabled={!interaction || busy}
            onClick={() => void vote(i)}
            aria-label={`Vote for ${option}`}
          >
            {showResults ? (
              <span className="sx-opt-fill" style={{ width: `${pct}%` }} aria-hidden />
            ) : null}
            <span className="sx-opt-label">
              <span className="truncate">{option}</span>
              {showResults ? <span>{pct}%</span> : null}
            </span>
          </button>
        );
      })}
      {showResults && tally ? (
        <p className="mt-2 text-[10.5px] text-[color:var(--story-ink-faint)]">
          {tally.total} {tally.total === 1 ? "vote" : "votes"}
        </p>
      ) : null}
    </div>
  );
}

function QuestionPiece({
  el,
  k,
  interaction,
}: {
  el: Extract<StoryElement, { kind: "question" }>;
  k: number;
  interaction: CanvasInteraction | null;
}) {
  const [value, setValue] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const send = useCallback(async () => {
    if (!interaction || busy || !value.trim()) return;
    setBusy(true);
    try {
      await castVote(interaction.storyId, el.id, 0, interaction.userId, value.trim());
      setSent(true);
    } catch {
      /* keep the draft */
    } finally {
      setBusy(false);
    }
  }, [interaction, busy, value, el.id]);

  return (
    <div
      className="sx-question"
      style={{ width: 230 * k }}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <h4>{el.prompt}</h4>
      {sent ? (
        <p className="rounded-full bg-[rgba(244,239,228,0.1)] px-3 py-2 text-[12.5px]">
          Sent — thank you.
        </p>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
          className="flex gap-1.5"
        >
          <input
            value={value}
            onChange={(e) => setValue(e.target.value.slice(0, 280))}
            placeholder={el.placeholder ?? "Write something kind…"}
            maxLength={280}
            disabled={!interaction || busy}
            aria-label="Your response"
            className="min-w-0 flex-1 rounded-full border border-[rgba(244,239,228,0.2)] bg-[rgba(244,239,228,0.07)] px-3 py-2 text-[12.5px] text-[#f4efe4] outline-none placeholder:text-[rgba(244,239,228,0.45)] focus:border-[rgba(238,217,164,0.55)]"
          />
          <button
            type="submit"
            disabled={!interaction || busy || !value.trim()}
            aria-label="Send response"
            className="grid size-9 shrink-0 place-items-center rounded-full bg-[#f4efe4] text-[13px] font-bold text-[#221d33] transition-transform active:scale-90 disabled:opacity-40"
          >
            ↑
          </button>
        </form>
      )}
    </div>
  );
}

function SliderPiece({
  el,
  k,
  interaction,
}: {
  el: Extract<StoryElement, { kind: "slider" }>;
  k: number;
  interaction: CanvasInteraction | null;
}) {
  const [stats, setStats] = useState<SliderStats | null>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const accent = el.color ?? "#e0a3b8";

  useEffect(() => {
    let alive = true;
    if (!interaction) return;
    void getSliderStats(interaction.storyId, el.id, interaction.userId).then(
      (s) => alive && setStats(s),
    );
    return () => {
      alive = false;
    };
  }, [interaction, el.id]);

  const valueFromClientX = useCallback((clientX: number): number => {
    const track = trackRef.current;
    if (!track) return 50;
    const rect = track.getBoundingClientRect();
    return Math.max(0, Math.min(100, Math.round(((clientX - rect.left) / rect.width) * 100)));
  }, []);

  const commit = useCallback(
    async (value: number) => {
      if (!interaction) return;
      try {
        const s = await castVote(interaction.storyId, el.id, value, interaction.userId);
        // castVote returns a poll tally; re-read proper slider stats.
        void getSliderStats(interaction.storyId, el.id, interaction.userId).then(setStats);
        setStats((prev) => prev ?? { elementId: el.id, average: s.mine, count: 1, mine: value });
      } catch {
        /* keep calm */
      }
    },
    [interaction, el.id],
  );

  const shown = drag ?? stats?.mine ?? 50;
  return (
    <div
      className="sx-slider"
      style={{ width: 230 * k, ["--sx-accent" as string]: accent } as React.CSSProperties}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <h4>{el.prompt}</h4>
      <div
        ref={trackRef}
        className="sx-slider-track"
        role="slider"
        aria-label={el.prompt}
        aria-valuenow={shown}
        aria-valuemin={0}
        aria-valuemax={100}
        tabIndex={interaction ? 0 : -1}
        onKeyDown={(e) => {
          if (!interaction) return;
          const step = e.shiftKey ? 10 : 5;
          if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
            e.preventDefault();
            const v = Math.max(0, shown - step);
            setDrag(v);
            void commit(v);
          } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
            e.preventDefault();
            const v = Math.min(100, shown + step);
            setDrag(v);
            void commit(v);
          }
        }}
        onPointerDown={(e) => {
          if (!interaction) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          setDrag(valueFromClientX(e.clientX));
        }}
        onPointerMove={(e) => {
          if (drag === null || !interaction) return;
          if (e.buttons === 0) return;
          setDrag(valueFromClientX(e.clientX));
        }}
        onPointerUp={(e) => {
          if (drag === null) return;
          const v = valueFromClientX(e.clientX);
          setDrag(null);
          void commit(v);
        }}
      >
        <span className="sx-slider-fill" style={{ width: `${shown}%` }} aria-hidden />
        <span className="sx-slider-knob" style={{ left: `${shown}%` }} aria-hidden>
          {el.emoji}
        </span>
      </div>
      {stats && stats.count > 0 ? (
        <p className="mt-2 text-[10.5px] text-[color:var(--story-ink-faint)]">
          {stats.average !== null ? `avg ${stats.average} · ` : ""}
          {stats.count} {stats.count === 1 ? "response" : "responses"}
        </p>
      ) : null}
    </div>
  );
}

function CountdownPiece({
  el,
  k,
}: {
  el: Extract<StoryElement, { kind: "countdown" }>;
  k: number;
}) {
  const now = useNowTick(true, 1000);
  const parts = useMemo(() => countdownParts(el.targetAt, now), [el.targetAt, now]);
  const accent = el.color ?? "#eed9a4";
  return (
    <div
      className="sx-countdown"
      style={{ width: 230 * k, ["--sx-accent" as string]: accent } as React.CSSProperties}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <h4>{el.title}</h4>
      {parts.done ? (
        <p className="display text-[20px]">It's here.</p>
      ) : (
        <div className="sx-countdown-digits">
          <div>
            <b>{parts.days}</b>
            <span>days</span>
          </div>
          <div>
            <b>{String(parts.hours).padStart(2, "0")}</b>
            <span>hrs</span>
          </div>
          <div>
            <b>{String(parts.minutes).padStart(2, "0")}</b>
            <span>min</span>
          </div>
          <div>
            <b>{String(parts.seconds).padStart(2, "0")}</b>
            <span>sec</span>
          </div>
        </div>
      )}
    </div>
  );
}

function MentionPiece({ el }: { el: Extract<StoryElement, { kind: "mention" }> }) {
  const valid = /^[a-z0-9_]{3,30}$/.test(el.handle);
  return (
    <span
      className="sx-mention"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        if (valid) window.location.assign(`/@${el.handle}`);
      }}
      role={valid ? "link" : undefined}
      tabIndex={valid ? 0 : undefined}
      onKeyDown={(e) => {
        if (valid && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          window.location.assign(`/@${el.handle}`);
        }
      }}
    >
      @{el.handle}
    </span>
  );
}

function DatePiece({
  el,
  fallback,
}: {
  el: Extract<StoryElement, { kind: "date" }>;
  fallback: string;
}) {
  const at = el.at ?? fallback;
  const d = new Date(at);
  const label = Number.isFinite(d.getTime())
    ? d.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })
    : "";
  return (
    <span className="sx-date" data-style={el.style ?? "soft"}>
      {label}
    </span>
  );
}

function MusicPiece({
  el,
  playing,
  onToggle,
}: {
  el: Extract<StoryElement, { kind: "music" }>;
  playing: boolean;
  onToggle: (id: string | null) => void;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.currentTime = (el.startMs ?? 0) / 1000;
      void audio.play().catch(() => onToggle(null));
      const stopAt = window.setTimeout(
        () => {
          audio.pause();
          onToggle(null);
        },
        Math.min(el.durationMs || 15000, 60000),
      );
      return () => window.clearTimeout(stopAt);
    }
    audio.pause();
    return undefined;
  }, [playing, el.startMs, el.durationMs, el.id, onToggle]);

  useEffect(() => () => audioRef.current?.pause(), []);

  return (
    <button
      type="button"
      className="sx-music"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        if (el.src) onToggle(playing ? null : el.id);
      }}
      aria-label={playing ? `Pause ${el.title}` : `Play ${el.title}`}
    >
      <span className="sx-music-disc" data-playing={playing || undefined}>
        <Music2 className="size-3.5 text-[#221d33]" aria-hidden />
      </span>
      <span className="min-w-0 text-left leading-tight">
        <span className="block truncate text-[12.5px] font-semibold">{el.title}</span>
        <span className="block truncate text-[11px] text-[color:var(--story-ink-dim)]">
          {el.artist}
        </span>
      </span>
      {el.src ? <audio ref={audioRef} src={el.src} preload="none" /> : null}
    </button>
  );
}

/* --------------------------------- canvas ------------------------------- */

export function StoryCanvas({
  media,
  backgroundId,
  filterId,
  adjustments,
  elements = [],
  mode = "static",
  selectedId = null,
  onSelect,
  interaction = null,
  paused = false,
  muted = true,
  onToggleMute,
  onVideoTime,
  onVideoEnded,
  onMediaFail,
  alt,
  createdAt,
  className,
  innerRef,
}: {
  media: CanvasMedia;
  backgroundId?: string | null | undefined;
  filterId?: string | null | undefined;
  adjustments?: StoryAdjustments | null | undefined;
  elements?: StoryElement[] | undefined;
  mode?: "static" | "interactive" | "edit" | undefined;
  selectedId?: string | null | undefined;
  onSelect?: ((id: string | null) => void) | undefined;
  interaction?: CanvasInteraction | null | undefined;
  paused?: boolean | undefined;
  muted?: boolean | undefined;
  onToggleMute?: (() => void) | undefined;
  onVideoTime?: ((currentMs: number, durationMs: number) => void) | undefined;
  onVideoEnded?: (() => void) | undefined;
  onMediaFail?: (() => void) | undefined;
  alt?: string | undefined;
  createdAt?: string | undefined;
  className?: string | undefined;
  innerRef?: React.Ref<HTMLDivElement> | undefined;
}) {
  const localRef = useRef<HTMLDivElement | null>(null);
  const ref = (innerRef as React.RefObject<HTMLDivElement | null>) ?? localRef;
  const k = useCanvasScale(ref);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const background = backgroundById(backgroundId);
  const filter = filterById(filterId);
  const adjustmentsCss = adjustmentsToCss(adjustments);
  const combinedFilter =
    [filter.css, adjustmentsCss].filter((f) => f !== "none").join(" ") || "none";

  const ordered = useMemo(() => [...elements].sort((a, b) => a.z - b.z), [elements]);

  /* video transport follows pause state */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (paused) {
      video.pause();
    } else {
      void video.play().catch(() => {
        /* autoplay policies: stays on the poster until the user taps */
      });
    }
  }, [paused, media.src]);

  /* pause any sticker audio when the story pauses or unmounts */
  useEffect(() => {
    if (paused) setPlayingAudio(null);
  }, [paused]);
  useEffect(() => () => setPlayingAudio(null), []);

  const fail = useCallback(() => {
    setFailed(true);
    onMediaFail?.();
  }, [onMediaFail]);

  const interactive = mode === "interactive";
  const reducedMotion = useMemo(() => prefersReducedMotion(), []);

  return (
    <div
      ref={ref}
      className={`scanvas bstory ${className ?? ""}`}
      style={{ background: media.type === "none" || !media.src ? background.css : "#0c0a14" }}
      onPointerDown={mode === "edit" && onSelect ? () => onSelect(null) : undefined}
    >
      {/* base media */}
      {media.type !== "none" && media.src && !failed ? (
        media.type === "video" ? (
          <div className="absolute inset-0 grid place-items-center">
            <video
              key={media.src}
              ref={videoRef}
              src={media.src}
              poster={media.poster ?? undefined}
              className="size-full object-contain"
              style={{ filter: combinedFilter }}
              playsInline
              muted={muted}
              loop={false}
              autoPlay={!paused}
              preload="auto"
              aria-label={alt ?? "Story video"}
              onTimeUpdate={(e) => {
                const v = e.currentTarget;
                if (v.duration) onVideoTime?.(v.currentTime * 1000, v.duration * 1000);
              }}
              onLoadedMetadata={(e) => {
                const v = e.currentTarget;
                if (v.duration) onVideoTime?.(v.currentTime * 1000, v.duration * 1000);
              }}
              onEnded={() => onVideoEnded?.()}
              onError={fail}
            />
            {filter.wash ? (
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background: filter.wash[0],
                  mixBlendMode: filter.wash[1] as React.CSSProperties["mixBlendMode"],
                  opacity: filter.wash[2],
                }}
                aria-hidden
              />
            ) : null}
            {onToggleMute ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleMute();
                }}
                aria-label={muted ? "Unmute video" : "Mute video"}
                className="sv-chip absolute bottom-3 right-3 !py-1.5 text-[11px]"
              >
                {muted ? "Tap to unmute" : "Mute"}
              </button>
            ) : null}
          </div>
        ) : (
          <div className="absolute inset-0">
            <img
              src={media.src}
              alt={alt ?? ""}
              draggable={false}
              className="size-full object-cover"
              style={{ filter: combinedFilter }}
              onError={fail}
            />
            {filter.wash ? (
              <div
                className="pointer-events-none absolute inset-0"
                style={{
                  background: filter.wash[0],
                  mixBlendMode: filter.wash[1] as React.CSSProperties["mixBlendMode"],
                  opacity: filter.wash[2],
                }}
                aria-hidden
              />
            ) : null}
            {/* legibility veils top + bottom */}
            <div
              className="pointer-events-none absolute inset-x-0 top-0 h-28"
              style={{ background: "linear-gradient(180deg, rgba(10,8,20,0.5), transparent)" }}
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-32"
              style={{ background: "linear-gradient(0deg, rgba(10,8,20,0.55), transparent)" }}
              aria-hidden
            />
          </div>
        )
      ) : null}

      {failed ? (
        <div className="absolute inset-0 grid place-items-center px-8 text-center">
          <div>
            <p className="display text-[17px] text-[color:var(--story-ink)]">
              This moment couldn't load.
            </p>
            <button
              type="button"
              onClick={() => setFailed(false)}
              className="sv-chip mt-3 text-[12px]"
            >
              Try again
            </button>
          </div>
        </div>
      ) : null}

      {/* drawings always sit full-bleed directly over the base */}
      {ordered
        .filter((el) => el.kind === "drawing")
        .map((el) => (
          <img
            key={el.id}
            src={(el as Extract<StoryElement, { kind: "drawing" }>).src}
            alt=""
            draggable={false}
            className="pointer-events-none absolute inset-0 size-full object-fill"
            style={{ zIndex: 10 + el.z }}
            aria-hidden
          />
        ))}

      {/* placed elements */}
      {ordered
        .filter((el) => el.kind !== "drawing")
        .map((el) => {
          const canInteract = interactive && INTERACTIVE_KINDS.has(el.kind) && interaction !== null;
          const selectable = mode === "edit";
          return (
            <Placed
              key={el.id}
              el={el}
              k={k}
              interactive={canInteract}
              selected={selectable && selectedId === el.id}
              onSelect={selectable ? onSelect : undefined}
            >
              {el.kind === "text" ? <TextPiece el={el} k={k} /> : null}
              {el.kind === "sticker" ? (
                <StickerArt id={el.stickerId} size={Math.max(28, 96 * k)} tint={el.tint} />
              ) : null}
              {el.kind === "gif" ? (
                <img
                  src={reducedMotion && el.still ? el.still : el.src}
                  alt=""
                  draggable={false}
                  style={{
                    width: Math.min(
                      200 * k,
                      (el.width / Math.max(1, el.height)) * 160 * k + 80 * k,
                    ),
                    maxWidth: 260 * k,
                    borderRadius: 14,
                    boxShadow: "0 18px 50px -18px rgba(0,0,0,0.7)",
                  }}
                />
              ) : null}
              {el.kind === "poll" ? (
                <PollPiece el={el} k={k} interaction={interactive ? interaction : null} />
              ) : null}
              {el.kind === "question" ? (
                <QuestionPiece el={el} k={k} interaction={interactive ? interaction : null} />
              ) : null}
              {el.kind === "slider" ? (
                <SliderPiece el={el} k={k} interaction={interactive ? interaction : null} />
              ) : null}
              {el.kind === "countdown" ? <CountdownPiece el={el} k={k} /> : null}
              {el.kind === "mention" ? <MentionPiece el={el} /> : null}
              {el.kind === "date" ? (
                <DatePiece el={el} fallback={createdAt ?? new Date().toISOString()} />
              ) : null}
              {el.kind === "music" ? (
                <MusicPiece el={el} playing={playingAudio === el.id} onToggle={setPlayingAudio} />
              ) : null}
            </Placed>
          );
        })}
    </div>
  );
}

export function StoryLinkBadge() {
  return (
    <span className="sv-chip text-[11px]">
      <Link2 className="size-3" aria-hidden /> Link
    </span>
  );
}
