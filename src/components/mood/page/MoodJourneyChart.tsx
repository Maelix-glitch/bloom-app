/**
 * MoodJourneyChart — the model's hand-drawn SVG line chart ("Your mood
 * journey"). Scales fluidly, no chart library. Points are real day averages
 * from the Mood record; days without an entry are simply absent.
 *
 * Motion (see styles/mood-motion.css): the line draws itself the first time
 * the chart scrolls into view, points arrive left → right, the latest point
 * breathes, and hovering a point shows a small tooltip. Re-ranging redraws.
 */

import { useEffect, useRef, useState } from "react";

export type JourneyPoint = { label: string; value: number; color: string; detail?: string };

const H = 220;
const PAD_X = 18;
const PAD_Y = 26;
const DEFAULT_W = 720;

function smoothPath(pts: { x: number; y: number }[]) {
  const first = pts[0];
  if (!first || pts.length < 2) return "";
  let d = `M${first.x} ${first.y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p = pts[i]!;
    const n = pts[i + 1]!;
    const mx = (p.x + n.x) / 2;
    d += ` C${mx} ${p.y}, ${mx} ${n.y}, ${n.x} ${n.y}`;
  }
  return d;
}

/** Reads once as "very low … very high" so the tooltip says something human. */
function moodWord(value: number): string {
  if (value >= 0.85) return "Bright";
  if (value >= 0.65) return "Good";
  if (value >= 0.45) return "Steady";
  if (value >= 0.25) return "Low";
  return "Heavy";
}

export function MoodJourneyChart({ data }: { data: JourneyPoint[] }) {
  /* the viewBox is as wide as the box is on screen (in units of its height),
     so circles stay round and the label row lines up with the points */
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [W, setW] = useState(DEFAULT_W);
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([entry]) => {
      const svg = el.querySelector("svg");
      const box = entry?.contentRect;
      if (!box || !svg) return;
      const h = svg.getBoundingClientRect().height || 1;
      setW(Math.max(200, Math.round((box.width / h) * H)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const stepX = data.length > 1 ? (W - PAD_X * 2) / (data.length - 1) : 0;
  const pts = data.map((d, i) => ({
    // A single point sits in the middle rather than on the left edge.
    x: data.length > 1 ? PAD_X + i * stepX : W / 2,
    // value 0..1 (low mood -> high mood)
    y: PAD_Y + (1 - d.value) * (H - PAD_Y * 2),
    ...d,
  }));
  const line = smoothPath(pts);
  const last = pts[pts.length - 1];
  const first = pts[0];
  const area = line && last && first ? `${line} L${last.x} ${H} L${first.x} ${H} Z` : "";

  /* draw once when the chart is on screen; redraw when the data changes */
  const [inView, setInView] = useState(false);
  const signature = data.map((d) => `${d.label}:${d.value.toFixed(2)}`).join("|");
  useEffect(() => {
    setInView(false);
    const el = wrapRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          // next frame, so the reset above has painted and the draw restarts
          requestAnimationFrame(() => setInView(true));
          io.disconnect();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [signature]);

  const [hover, setHover] = useState<number | null>(null);
  const hovered = hover !== null ? pts[hover] : null;
  /* the SVG keeps its aspect ratio inside a wider box — anchor the tooltip
     to where the point really is on screen, not to a stretched percentage */
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [tipPos, setTipPos] = useState<{ left: number; top: number } | null>(null);
  useEffect(() => {
    if (!hovered || !svgRef.current || !wrapRef.current) {
      setTipPos(null);
      return;
    }
    const svg = svgRef.current.getBoundingClientRect();
    const wrap = wrapRef.current.getBoundingClientRect();
    const scale = Math.min(svg.width / W, svg.height / H);
    const ox = (svg.width - W * scale) / 2;
    const oy = (svg.height - H * scale) / 2;
    setTipPos({
      left: svg.left - wrap.left + ox + hovered.x * scale,
      top: svg.top - wrap.top + oy + hovered.y * scale,
    });
  }, [hovered, W]);

  return (
    <div className="relative w-full" ref={wrapRef} data-inview={inView}>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="h-44 w-full sm:h-56"
        role="img"
        aria-label="Mood over the selected period"
        onMouseLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="mpJourneyFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.86 0.1 85)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="oklch(0.86 0.1 85)" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="mpJourneyLine" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="oklch(0.86 0.1 85)" />
            <stop offset="45%" stopColor="oklch(0.76 0.06 200)" />
            <stop offset="100%" stopColor="oklch(0.82 0.09 40)" />
          </linearGradient>
        </defs>

        {pts.map((p) => (
          <line
            key={`g-${p.label}`}
            x1={p.x}
            y1={PAD_Y - 12}
            x2={p.x}
            y2={H - PAD_Y + 6}
            stroke="oklch(1 0 0 / 0.06)"
            strokeWidth="1"
          />
        ))}

        {area ? <path d={area} fill="url(#mpJourneyFill)" className="mm-area" /> : null}
        {line ? (
          <path
            d={line}
            fill="none"
            stroke="url(#mpJourneyLine)"
            strokeWidth="2.5"
            strokeLinecap="round"
            pathLength={1}
            className="mm-line"
          />
        ) : null}

        {pts.map((p, i) => {
          const isLast = i === pts.length - 1;
          const isHover = hover === i;
          return (
            <g
              key={p.label}
              className="mm-point"
              style={{ ["--mm-i" as string]: i } as React.CSSProperties}
            >
              {isLast ? (
                <circle cx={p.x} cy={p.y} r="8" fill={p.color} className="mm-point-pulse" />
              ) : null}
              <circle cx={p.x} cy={p.y} r="8" fill={p.color} opacity={isHover ? 0.3 : 0.16} />
              <circle cx={p.x} cy={p.y} r={isHover ? 5.5 : 4} fill={p.color} />
              {/* generous invisible hit target */}
              <circle
                cx={p.x}
                cy={p.y}
                r="16"
                fill="transparent"
                className="mm-hit"
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                tabIndex={0}
                aria-label={`${p.label}: ${moodWord(p.value)}`}
              />
            </g>
          );
        })}
      </svg>

      {hovered && tipPos ? (
        <div className="mm-tip" style={{ left: tipPos.left, top: tipPos.top }} role="status">
          {moodWord(hovered.value)}
          <small>
            {hovered.label}
            {hovered.detail ? ` · ${hovered.detail}` : ""}
          </small>
        </div>
      ) : null}

      <div className="relative mt-4 h-4 text-[0.65rem] tracking-wide text-muted-foreground sm:text-xs">
        {pts.map((p) => (
          <span
            key={p.label}
            className="absolute -translate-x-1/2 whitespace-nowrap"
            style={{ left: `${(p.x / W) * 100}%` }}
          >
            {p.label}
          </span>
        ))}
      </div>
    </div>
  );
}
