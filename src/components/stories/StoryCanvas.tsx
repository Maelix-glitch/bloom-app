/**
 * StoryCanvas — one renderer for "what a story looks like."
 *
 * The viewer (interactive), the editor (selectable), thumbnails (static) and
 * the 1080×1920 exporter all read the same element list. Layers paint in
 * z-order over a background that is data, not a component: a photo layer can
 * be cropped, masked, framed and filtered; a shape layer is one normalized
 * path; a data layer prints only what Bloom actually logged.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, Link2, Music2 } from "lucide-react";

import type {
  BloomStoryData,
  StoryAdjustments,
  StoryDataElement,
  StoryElement,
  StoryPhotoElement,
  StoryShapeElement,
} from "@/lib/stories/types";
import { adjustmentsToCss, filterById } from "@/lib/stories/catalogs";
import { StickerArt } from "@/lib/stories/stickers";
import { countdownParts } from "@/lib/stories/time";
import {
  backgroundLayers,
  defaultBackground,
  presetBackground,
  type StoryBackgroundState,
} from "@/lib/stories/canvas/backgrounds";
import { frameById, maskById, maskClipPath, maskRadius } from "@/lib/stories/canvas/masks";
import { coverGeometryPercent } from "@/lib/stories/canvas/photogeom";
import { shapeById } from "@/lib/stories/canvas/shapes";
import { resolveText } from "@/lib/stories/canvas/typography";
import { metricReading, METRIC_LABELS } from "@/lib/stories/data/metrics";
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

/** The four draggable corners of a selected element. */
const RESIZE_CORNERS = [
  { id: "nw", x: "left", y: "top", cursor: "nwse-resize" },
  { id: "ne", x: "right", y: "top", cursor: "nesw-resize" },
  { id: "sw", x: "left", y: "bottom", cursor: "nesw-resize" },
  { id: "se", x: "right", y: "bottom", cursor: "nwse-resize" },
] as const;

export function useCanvasScale(
  ref: React.RefObject<HTMLDivElement | null>,
  fixed?: number | undefined,
): number {
  const [width, setWidth] = useState(fixed ?? 390);
  useEffect(() => {
    if (typeof fixed === "number") {
      setWidth(fixed * 390);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(Math.max(200, el.clientWidth));
    update();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref, fixed]);
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

/* ------------------------------ photo masks ------------------------------ */

/**
 * One shared set of `objectBoundingBox` clip paths. Coordinates are 0–1 so a
 * mask scales with its slot instead of being pinned to pixels.
 */
export function PhotoMaskDefs() {
  const masks = [
    [
      "oval",
      "M0.5 0 C0.776 0 1 0.224 1 0.5 C1 0.776 0.776 1 0.5 1 C0.224 1 0 0.776 0 0.5 C0 0.224 0.224 0 0.5 0 Z",
    ],
    ["arch", "M0 1 L0 0.5 A0.5 0.5 0 0 1 1 0.5 L1 1 Z"],
    ["arch-soft", "M0 1 L0 0.42 C0 0.16 0.22 0 0.5 0 C0.78 0 1 0.16 1 0.42 L1 1 Z"],
    [
      "blob",
      "M0.52 0.03 C0.7 0.08 0.85 0.16 0.92 0.33 C0.98 0.47 0.97 0.66 0.85 0.79 C0.74 0.91 0.58 0.96 0.42 0.97 C0.26 0.98 0.13 0.9 0.07 0.75 C0.01 0.61 0.03 0.44 0.11 0.3 C0.19 0.16 0.36 0.05 0.52 0.03 Z",
    ],
    ["leaf", "M0.5 0 C0.86 0.26 0.96 0.6 0.5 1 C0.04 0.6 0.14 0.26 0.5 0 Z"],
    ["diamond", "M0.5 0 L1 0.5 L0.5 1 L0 0.5 Z"],
    ["hexagon", "M0.5 0 L1 0.25 L1 0.75 L0.5 1 L0 0.75 L0 0.25 Z"],
    [
      "scallop",
      "M0 0.06 Q0.06 0 0.125 0.05 Q0.19 0 0.25 0.05 Q0.31 0 0.375 0.05 Q0.44 0 0.5 0.05 Q0.56 0 0.625 0.05 Q0.69 0 0.75 0.05 Q0.81 0 0.875 0.05 Q0.94 0 1 0.06 L1 0.94 Q0.94 1 0.875 0.95 Q0.81 1 0.75 0.95 Q0.69 1 0.625 0.95 Q0.56 1 0.5 0.95 Q0.44 1 0.375 0.95 Q0.31 1 0.25 0.95 Q0.19 1 0.125 0.95 Q0.06 1 0 0.94 Z",
    ],
    [
      "torn",
      "M0.01 0.04 L0.14 0.015 L0.28 0.05 L0.42 0.02 L0.58 0.055 L0.72 0.02 L0.86 0.05 L0.99 0.03 L0.98 0.96 L0.85 0.985 L0.71 0.95 L0.57 0.98 L0.43 0.95 L0.29 0.98 L0.15 0.95 L0.02 0.97 Z",
    ],
    ["asym", "M0 0.16 C0 0.07 0.07 0 0.16 0 L1 0 L1 0.84 C1 0.93 0.93 1 0.84 1 L0 1 Z"],
  ] as const;
  return (
    <svg
      width="0"
      height="0"
      aria-hidden
      focusable="false"
      className="pointer-events-none absolute"
    >
      <defs>
        {masks.map(([id, d]) => (
          <clipPath key={id} id={`bloom-pmask-${id}`} clipPathUnits="objectBoundingBox">
            <path d={d} />
          </clipPath>
        ))}
      </defs>
    </svg>
  );
}

/* --------------------------------- pieces ------------------------------- */

/**
 * Corner resize handles. They live *inside* the transformed element, so they
 * inherit its rotation and scale and stay pinned to its corners. The inverse
 * scale (1 / scale / k) keeps them a constant size on screen — a handle on a
 * 4× element is the same touch target as one on a 0.25× element, on any phone.
 *
 * The gesture itself is handled by ElementLayer, which reads `data-se-handle`.
 */
function ResizeHandles({
  scale,
  k,
  onResizeStart,
}: {
  scale: number;
  k: number;
  onResizeStart?: ((e: React.PointerEvent, corner: string) => void) | undefined;
}) {
  const inv = 1 / Math.max(0.05, scale * k);
  return (
    <>
      {RESIZE_CORNERS.map((c) => (
        <span
          key={c.id}
          className="se-rz"
          data-se-handle={c.id}
          data-corner={c.id}
          aria-hidden
          style={
            {
              [c.y]: 0,
              [c.x]: 0,
              "--se-rz-inv": inv,
              cursor: c.cursor,
            } as React.CSSProperties
          }
          onPointerDown={
            onResizeStart
              ? (e) => {
                  e.stopPropagation();
                  onResizeStart(e, c.id);
                }
              : undefined
          }
        />
      ))}
    </>
  );
}

function Placed({
  el,
  k,
  interactive,
  selected,
  onSelect,
  onResizeStart,
  children,
}: {
  el: StoryElement;
  k: number;
  interactive: boolean;
  selected: boolean;
  onSelect?: ((id: string | null) => void) | undefined;
  onResizeStart?: ((e: React.PointerEvent, corner: string) => void) | undefined;
  children: React.ReactNode;
}) {
  void k;
  const sized = typeof el.w === "number" && typeof el.h === "number";
  return (
    <div
      className="scanvas-el"
      data-se-el={el.id}
      data-selected={selected || undefined}
      data-interactive={interactive || undefined}
      data-locked={el.locked || undefined}
      data-kind={el.kind}
      style={{
        left: `${el.x * 100}%`,
        top: `${el.y * 100}%`,
        ...(sized
          ? { width: `${(el.w as number) * 100}%`, height: `${(el.h as number) * 100}%` }
          : {}),
        transform: `translate(-50%, -50%) rotate(${el.rotation}deg) scale(${el.scale})`,
        zIndex: 10 + el.z,
        opacity: typeof el.opacity === "number" ? el.opacity / 100 : undefined,
        mixBlendMode: (el.blend as React.CSSProperties["mixBlendMode"]) ?? undefined,
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
      {selected && onResizeStart ? (
        <ResizeHandles scale={el.scale} k={k} onResizeStart={onResizeStart} />
      ) : null}
    </div>
  );
}

function TextPiece({ el, k }: { el: Extract<StoryElement, { kind: "text" }>; k: number }) {
  const r = resolveText(el.preset, el.style ?? {}, k);
  const backdrop = el.style?.backdrop ?? legacyBackdrop(el.background);
  const bgColor =
    el.style?.backdropColor ??
    el.backgroundColor ??
    (backdrop === "pill" || backdrop === "highlight"
      ? "rgba(20,17,29,0.62)"
      : backdrop === "veil"
        ? "rgba(20,17,29,0.4)"
        : "transparent");
  return (
    <div
      className="se-text"
      data-bg={backdrop}
      data-anim={el.animation && el.animation !== "none" ? el.animation : undefined}
      style={{
        fontFamily: r.fontFamily,
        fontWeight: r.fontWeight,
        fontStyle: r.fontStyle,
        letterSpacing: `${r.letterSpacingEm}em`,
        lineHeight: r.lineHeight,
        textTransform: r.textTransform,
        fontSize: r.fontSize,
        color: el.color,
        opacity: el.opacity / 100,
        textAlign: el.align,
        textShadow: r.shadow,
        WebkitTextStroke: r.outline > 0 ? `${r.outline}px ${r.outlineColor}` : undefined,
        background: backdrop === "none" || backdrop === "outline" ? "transparent" : bgColor,
        maxWidth: r.maxWidth,
      }}
    >
      {el.text}
    </div>
  );
}

function legacyBackdrop(
  value: string,
): "none" | "pill" | "highlight" | "veil" | "outline" | "card" {
  return value === "pill" ||
    value === "highlight" ||
    value === "veil" ||
    value === "outline" ||
    value === "card"
    ? value
    : "none";
}

/* --------------------------------- photo -------------------------------- */

/** Frame chrome padding as a fraction of the box width. */
function framePadding(el: StoryPhotoElement): { top: number; side: number; bottom: number } {
  const def = frameById(el.frame);
  if (def.id === "none" || def.id === "tape") return { top: 0, side: 0, bottom: 0 };
  return { top: def.pad, side: def.pad, bottom: def.padBottom ?? def.pad };
}

function PhotoPiece({
  el,
  editing,
  onAddPhoto,
}: {
  el: StoryPhotoElement;
  editing: boolean;
  onAddPhoto?: ((el: StoryPhotoElement) => void) | undefined;
}) {
  const frame = frameById(el.frame);
  const pad = framePadding(el);
  const filter = filterById(el.filterId);
  const adjustments = adjustmentsToCss(null);
  const clip = maskClipPath(el.mask);
  const radius = maskRadius(el.mask);
  const empty = !el.src;

  // Inner box in canonical 9:16 units — the same ratios the exporter uses, so
  // the crop you see is the crop you get at 1080×1920.
  const outerW = el.w * 390;
  const outerH = (el.h * (390 * 16)) / 9;
  const innerBox = {
    w: Math.max(1, outerW * (1 - 2 * pad.side)),
    h: Math.max(1, outerH * (1 - pad.top - pad.bottom)),
  };
  const geom = coverGeometryPercent(innerBox, {
    naturalWidth: el.naturalWidth,
    naturalHeight: el.naturalHeight,
    zoom: el.zoom,
    panX: el.panX,
    panY: el.panY,
    flipX: el.flipX,
    flipY: el.flipY,
    fit: el.fit,
  });

  const imgStyle: React.CSSProperties = {
    position: "absolute",
    left: `${geom.left}%`,
    top: `${geom.top}%`,
    width: `${geom.width}%`,
    height: `${geom.height}%`,
    transform: `scaleX(${el.flipX ? -1 : 1}) scaleY(${el.flipY ? -1 : 1})`,
    filter: [filter.css, adjustments].filter((f) => f !== "none").join(" ") || undefined,
    backgroundColor: el.letterbox ?? undefined,
  };

  return (
    <div
      className="sphoto"
      data-empty={empty || undefined}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        filter: frame.shadow ? "drop-shadow(0 18px 34px rgba(8,6,16,0.38))" : undefined,
      }}
    >
      {/* frame chrome */}
      {frame.id !== "none" && frame.id !== "tape" ? (
        <div
          className="sphoto-frame"
          style={{
            position: "absolute",
            inset: 0,
            background: el.frameColor,
            borderRadius: el.mask === "circle" ? "50%" : "4px",
          }}
          aria-hidden
        />
      ) : null}

      {/* the image itself */}
      <div
        className="sphoto-inner"
        style={{
          position: "absolute",
          top: `${pad.top * 100}%`,
          left: `${pad.side * 100}%`,
          right: `${pad.side * 100}%`,
          bottom: `${pad.bottom * 100}%`,
          overflow: "hidden",
          clipPath: clip,
          WebkitClipPath: clip,
          borderRadius: clip ? undefined : radius,
          background: empty
            ? "rgba(148,142,168,0.16)"
            : el.blurFill
              ? undefined
              : (el.letterbox ?? undefined),
          boxShadow: el.border ? `inset 0 0 0 ${el.border.width}px ${el.border.color}` : undefined,
        }}
      >
        {empty ? (
          editing ? (
            <button
              type="button"
              className="sphoto-empty"
              onClick={(e) => {
                e.stopPropagation();
                onAddPhoto?.(el);
              }}
              aria-label={el.slot ? `Add photo to ${el.slot}` : "Add photo"}
            >
              <ImagePlus className="size-5" strokeWidth={1.6} aria-hidden />
              <span>Add photo</span>
            </button>
          ) : null
        ) : (
          <>
            {el.blurFill ? (
              <img
                src={el.src}
                alt=""
                aria-hidden
                draggable={false}
                className="sphoto-blurfill"
                style={{
                  position: "absolute",
                  inset: "-12%",
                  width: "124%",
                  height: "124%",
                  objectFit: "cover",
                  filter: "blur(28px) brightness(0.86)",
                  transform: `scaleX(${el.flipX ? -1 : 1}) scaleY(${el.flipY ? -1 : 1})`,
                }}
              />
            ) : null}
            <img src={el.src} alt={el.alt || ""} draggable={false} style={imgStyle} />
            {filter.wash ? (
              <span
                className="pointer-events-none absolute inset-0"
                style={{
                  background: filter.wash[0],
                  mixBlendMode: filter.wash[1] as React.CSSProperties["mixBlendMode"],
                  opacity: filter.wash[2],
                }}
                aria-hidden
              />
            ) : null}
          </>
        )}
      </div>

      {/* tape strips */}
      {frame.id === "tape" ? (
        <>
          <span
            className="sphoto-tape"
            style={{ top: "-4%", left: "8%", transform: "rotate(-14deg)" }}
            aria-hidden
          />
          <span
            className="sphoto-tape"
            style={{ bottom: "-4%", right: "8%", transform: "rotate(-12deg)" }}
            aria-hidden
          />
        </>
      ) : null}

      {/* film sprockets */}
      {frame.id === "film" ? (
        <>
          <span className="sphoto-sprockets" style={{ top: "3.5%" }} aria-hidden />
          <span className="sphoto-sprockets" style={{ bottom: "3.5%" }} aria-hidden />
        </>
      ) : null}

      {/* window muntins */}
      {frame.id === "window" ? (
        <>
          <span
            className="sphoto-muntin"
            style={{ left: 0, right: 0, top: "50%", height: 3, background: el.frameColor }}
            aria-hidden
          />
          <span
            className="sphoto-muntin"
            style={{ top: 0, bottom: 0, left: "50%", width: 3, background: el.frameColor }}
            aria-hidden
          />
        </>
      ) : null}

      {/* magazine caption strip */}
      {frame.id === "magazine" ? (
        <span className="sphoto-caption-strip" style={{ background: el.frameColor }} aria-hidden />
      ) : null}
    </div>
  );
}

/* --------------------------------- shape -------------------------------- */

function ShapePiece({ el, k }: { el: StoryShapeElement; k: number }) {
  const def = shapeById(el.shape);
  if (!def) return null;
  void k;

  if (def.render.mode === "radial") {
    const color = el.fill ?? "#ffffff";
    return (
      <span
        className="block size-full"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${color} 0%, ${fade(color)} 72%)`,
          filter: el.blur > 0 ? `blur(${el.blur}px)` : undefined,
        }}
        aria-hidden
      />
    );
  }

  if (def.render.mode === "roundRect") {
    return (
      <span
        className="block size-full"
        style={{
          background: el.fill ?? "transparent",
          border: el.stroke ? `${el.strokeWidth}px solid ${el.stroke}` : undefined,
          borderRadius: `${def.render.radius * 100}%`,
          filter: el.blur > 0 ? `blur(${el.blur}px)` : undefined,
        }}
        aria-hidden
      />
    );
  }

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="block size-full"
      aria-hidden
      focusable="false"
      style={{ filter: el.blur > 0 ? `blur(${el.blur}px)` : undefined }}
    >
      <path
        d={def.d}
        fill={el.fill ?? "none"}
        stroke={el.stroke ?? "none"}
        strokeWidth={def.stroke ? (el.strokeWidth * 100) / 100 : el.strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

function fade(color: string): string {
  if (color.startsWith("#")) {
    const hex = color.length >= 7 ? color.slice(1, 7) : color.slice(1).padEnd(6, "0");
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, 0)`;
  }
  return "rgba(255,255,255,0)";
}

/* ---------------------------------- data -------------------------------- */

function DataPiece({
  el,
  data,
  k,
}: {
  el: StoryDataElement;
  data: BloomStoryData | null;
  k: number;
}) {
  const reading = metricReading(data, el.metric);
  const shown =
    reading ??
    (el.manualValue
      ? { value: el.manualValue, sub: METRIC_LABELS[el.metric], progress: null }
      : null);

  if (!shown) {
    return el.hideWhenEmpty ? null : (
      <div className="sdata sdata-empty" style={{ fontSize: 12 * k }}>
        <span className="sdata-label">{el.label || METRIC_LABELS[el.metric]}</span>
        <span className="sdata-none">Nothing logged yet</span>
      </div>
    );
  }

  const label = el.label || METRIC_LABELS[el.metric];

  switch (el.variant) {
    case "inline":
      return (
        <span className="sdata sdata-inline" style={{ fontSize: 12.5 * k }}>
          {el.metric !== "today" ? <span className="sdata-label">{label}</span> : null}
          <span className="sdata-value" style={{ color: el.accent }}>
            {shown.value}
          </span>
          {shown.sub ? <span className="sdata-sub">{shown.sub}</span> : null}
        </span>
      );
    case "ring": {
      const pct = shown.progress === null ? 0 : Math.round(shown.progress * 100);
      const R = 42;
      const C = 2 * Math.PI * R;
      return (
        <div className="sdata sdata-ring" style={{ width: "100%", height: "100%" }}>
          <svg viewBox="0 0 100 100" className="sdata-ring-svg" aria-hidden focusable="false">
            <circle
              cx="50"
              cy="50"
              r={R}
              fill="none"
              stroke="rgba(255,255,255,0.18)"
              strokeWidth="6"
            />
            <circle
              cx="50"
              cy="50"
              r={R}
              fill="none"
              stroke={el.accent}
              strokeWidth="6"
              strokeLinecap="round"
              strokeDasharray={`${(C * pct) / 100} ${C}`}
              transform="rotate(-90 50 50)"
            />
          </svg>
          <span className="sdata-ring-center">
            <b style={{ fontSize: 19 * k }}>{shown.value}</b>
            <span style={{ fontSize: 10 * k }}>{label}</span>
          </span>
        </div>
      );
    }
    case "bars": {
      const pct = shown.progress === null ? null : Math.round(shown.progress * 100);
      return (
        <div className="sdata sdata-bars">
          <span className="sdata-bars-head">
            <span className="sdata-label">{label}</span>
            <b style={{ color: el.accent }}>{shown.value}</b>
          </span>
          {pct !== null ? (
            <span className="sdata-bar">
              <span
                className="sdata-bar-fill"
                style={{ width: `${pct}%`, background: el.accent }}
              />
            </span>
          ) : null}
          {shown.sub ? <span className="sdata-sub">{shown.sub}</span> : null}
        </div>
      );
    }
    case "list": {
      const names = data?.habits?.names ?? [];
      const done = data?.habits?.done ?? 0;
      return (
        <div className="sdata sdata-list">
          <span className="sdata-list-head">
            <span className="sdata-label">{label}</span>
            <b style={{ color: el.accent }}>{shown.value}</b>
          </span>
          <ul>
            {(names.length > 0 ? names : [shown.sub]).slice(0, 6).map((name, i) => (
              <li key={`${name}-${i}`}>
                <span className="sdata-tick" data-on={i < done || undefined} aria-hidden />
                <span>{name}</span>
              </li>
            ))}
          </ul>
        </div>
      );
    }
    case "phase": {
      const cycle = data?.cycle ?? null;
      const pct = shown.progress === null ? 0 : shown.progress;
      return (
        <div className="sdata sdata-phase">
          <span className="sdata-phase-day" style={{ color: el.accent }}>
            {shown.value}
          </span>
          <span className="sdata-phase-name">{shown.sub}</span>
          <span className="sdata-phase-track" aria-hidden>
            <span
              className="sdata-phase-fill"
              style={{ width: `${Math.round(pct * 100)}%`, background: el.accent }}
            />
          </span>
          {cycle?.estimated ? (
            <span className="sdata-sub">estimated from your last logged period</span>
          ) : null}
        </div>
      );
    }
    default:
      return (
        <div className="sdata sdata-card">
          <span className="sdata-label">{label}</span>
          <b className="sdata-big" style={{ color: el.accent }}>
            {shown.value}
          </b>
          {shown.sub ? <span className="sdata-sub">{shown.sub}</span> : null}
          {shown.progress !== null ? (
            <span className="sdata-bar">
              <span
                className="sdata-bar-fill"
                style={{ width: `${Math.round(shown.progress * 100)}%`, background: el.accent }}
              />
            </span>
          ) : null}
        </div>
      );
  }
}

/* ------------------------------ interactions ----------------------------- */

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
      style={{ width: 230 * k, [stringVar("--sx-accent")]: accent } as React.CSSProperties}
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

const stringVar = (name: string) => name as unknown as number;

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
      style={{ width: 230 * k, [stringVar("--sx-accent")]: accent } as React.CSSProperties}
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
      style={{ width: 230 * k, [stringVar("--sx-accent")]: accent } as React.CSSProperties}
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
  background,
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
  onAddPhoto,
  onResizeStart,
  resizeEnabled = true,
  data = null,
  alt,
  createdAt,
  className,
  innerRef,
  showMaskDefs = true,
  fixedScale,
}: {
  media: CanvasMedia;
  /** Legacy preset id — still honoured when `background` is absent. */
  backgroundId?: string | null | undefined;
  /** Full background state. Wins over `backgroundId` when present. */
  background?: StoryBackgroundState | null | undefined;
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
  /** Editor only: tapping an empty photo slot opens the picker. */
  onAddPhoto?: ((el: StoryPhotoElement) => void) | undefined;
  /** Editor only: dragging a corner handle resizes the selected element. */
  onResizeStart?: ((e: React.PointerEvent, corner: string) => void) | undefined;
  /** Editor only: hide the handles while a tool sheet owns the screen. */
  resizeEnabled?: boolean | undefined;
  /** Real Bloom readings for data layers. */
  data?: BloomStoryData | null | undefined;
  alt?: string | undefined;
  createdAt?: string | undefined;
  className?: string | undefined;
  innerRef?: React.Ref<HTMLDivElement> | undefined;
  showMaskDefs?: boolean | undefined;
  /**
   * Render at a known scale instead of measuring — used by template
   * thumbnails, where 100+ ResizeObservers would be pure waste.
   */
  fixedScale?: number | undefined;
}) {
  const localRef = useRef<HTMLDivElement | null>(null);
  const ref = (innerRef as React.RefObject<HTMLDivElement | null>) ?? localRef;
  const k = useCanvasScale(ref, fixedScale);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  const bg = useMemo<StoryBackgroundState>(
    () => background ?? (backgroundId ? presetBackground(backgroundId) : defaultBackground()),
    [background, backgroundId],
  );
  const layers = useMemo(() => backgroundLayers(bg), [bg]);

  const filter = filterById(filterId);
  const adjustmentsCss = adjustmentsToCss(adjustments);
  const combinedFilter =
    [filter.css, adjustmentsCss].filter((f) => f !== "none").join(" ") || "none";

  const ordered = useMemo(
    () => [...elements].filter((e) => e.visible !== false).sort((a, b) => a.z - b.z),
    [elements],
  );

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

  useEffect(() => {
    if (paused) setPlayingAudio(null);
  }, [paused]);
  useEffect(() => () => setPlayingAudio(null), []);

  const fail = useCallback(() => {
    setFailed(true);
    onMediaFail?.();
  }, [onMediaFail]);

  const interactive = mode === "interactive";
  const editing = mode === "edit";
  const reducedMotion = useMemo(() => prefersReducedMotion(), []);
  const hasBaseMedia = media.type !== "none" && media.src && !failed;

  return (
    <div
      ref={ref}
      className={`scanvas bstory ${className ?? ""}`}
      style={hasBaseMedia ? { background: "#0c0a14" } : layers.base}
      onPointerDown={editing && onSelect ? () => onSelect(null) : undefined}
    >
      {showMaskDefs ? <PhotoMaskDefs /> : null}

      {/* background layers: user photo, overlay, texture */}
      {!hasBaseMedia ? (
        <>
          {layers.photoStyle ? (
            <div className="scanvas-bg-photo" style={layers.photoStyle} aria-hidden />
          ) : null}
          {layers.overlayStyle ? (
            <div className="scanvas-bg-overlay" style={layers.overlayStyle} aria-hidden />
          ) : null}
          {layers.textureStyle ? (
            <div className="scanvas-bg-texture" style={layers.textureStyle} aria-hidden />
          ) : null}
        </>
      ) : null}

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
          const selectable = editing;
          return (
            <Placed
              key={el.id}
              el={el}
              k={k}
              interactive={canInteract}
              selected={selectable && selectedId === el.id}
              onSelect={selectable ? onSelect : undefined}
              onResizeStart={selectable && !el.locked && resizeEnabled ? onResizeStart : undefined}
            >
              {el.kind === "text" ? <TextPiece el={el} k={k} /> : null}
              {el.kind === "photo" ? (
                <PhotoPiece el={el} editing={editing} onAddPhoto={onAddPhoto} />
              ) : null}
              {el.kind === "shape" ? <ShapePiece el={el} k={k} /> : null}
              {el.kind === "data" ? <DataPiece el={el} data={data} k={k} /> : null}
              {el.kind === "sticker" ? (
                el.src ? (
                  <img
                    src={reducedMotion && el.still ? el.still : el.src}
                    alt=""
                    draggable={false}
                    style={{
                      width: Math.min(
                        180 * k,
                        ((el.width ?? 200) / Math.max(1, el.height ?? 200)) * 140 * k + 40 * k,
                      ),
                      maxWidth: 220 * k,
                      filter: "drop-shadow(0 8px 18px rgba(8,6,16,0.45))",
                    }}
                  />
                ) : (
                  <StickerArt
                    id={el.stickerId}
                    size={Math.max(28, 96 * k)}
                    tint={el.tint}
                    style={
                      typeof el.opacity === "number" ? { opacity: el.opacity / 100 } : undefined
                    }
                  />
                )
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

/** Keep the mask catalog importable without pulling the whole canvas in. */
export { maskById };

export function StoryLinkBadge() {
  return (
    <span className="sv-chip text-[11px]">
      <Link2 className="size-3" aria-hidden /> Link
    </span>
  );
}
