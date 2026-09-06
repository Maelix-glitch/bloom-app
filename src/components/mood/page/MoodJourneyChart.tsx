/**
 * MoodJourneyChart — the model's hand-drawn SVG line chart ("Your mood
 * journey"). Scales fluidly, no client-only deps. Points are real day
 * averages from the Mood record; days without an entry are simply absent.
 */

export type JourneyPoint = { label: string; value: number; color: string };

const W = 720;
const H = 220;
const PAD_X = 18;
const PAD_Y = 26;

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

export function MoodJourneyChart({ data }: { data: JourneyPoint[] }) {
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

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-44 w-full sm:h-56"
        role="img"
        aria-label="Mood over the selected period"
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

        {area ? <path d={area} fill="url(#mpJourneyFill)" /> : null}
        {line ? (
          <path
            d={line}
            fill="none"
            stroke="url(#mpJourneyLine)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        ) : null}

        {pts.map((p) => (
          <g key={p.label}>
            <circle cx={p.x} cy={p.y} r="8" fill={p.color} opacity="0.16" />
            <circle cx={p.x} cy={p.y} r="4" fill={p.color} />
          </g>
        ))}
      </svg>

      <div className="mt-4 flex justify-between gap-1 text-[0.65rem] tracking-wide text-muted-foreground sm:text-xs">
        {data.map((d) => (
          <span key={d.label}>{d.label}</span>
        ))}
      </div>
    </div>
  );
}
