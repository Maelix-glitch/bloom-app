/**
 * DayDial — the trackers page's signature.
 *
 * One 24-hour dial, midnight at the top, with a ring per habit: sleep as the
 * span of the night, water / movement / screen as fills from midnight, study as
 * blocks wherever the sessions actually happened, and energy as six dots in the
 * middle. Nothing on it is decorative: every arc is a real logged value.
 */

import {
  TRACKERS,
  valueOf,
  type DayEntry,
  type Goals,
  type TrackerDef,
} from "@/lib/trackers/core";
import { TrackerIcon, TRACKER_ACCENT } from "@/components/tk/icons";

const C = 120;

const pol = (r: number, deg: number) => {
  const rad = ((deg - 90) * Math.PI) / 180;
  return {
    x: Math.round((C + r * Math.cos(rad)) * 100) / 100,
    y: Math.round((C + r * Math.sin(rad)) * 100) / 100,
  };
};

const arc = (r: number, from: number, to: number) => {
  const span = to - from;
  const a = pol(r, from);
  const b = pol(r, to);
  const large = Math.abs(span) > 180 ? 1 : 0;
  return `M ${a.x} ${a.y} A ${r} ${r} 0 ${large} 1 ${b.x} ${b.y}`;
};

/** "23:30" → 23.5, so a minute lands where it belongs on the dial. */
const hoursOf = (time: string | null) => {
  if (!time) return null;
  const [h, m] = time.split(":");
  const hour = Number(h);
  const min = Number(m);
  if (!Number.isFinite(hour) || !Number.isFinite(min)) return null;
  return hour + min / 60;
};

export function DayDial({
  entry,
  defs,
  goals,
  metToday,
}: {
  entry: DayEntry;
  defs: TrackerDef[];
  goals: Goals;
  metToday: number;
}) {
  const rings: { id: TrackerDef["id"]; r: number; node: React.ReactNode }[] = [];

  /* sleep — the span of the night, crossing midnight if it has to */
  const bed = hoursOf(entry.bedTime);
  const wake = hoursOf(entry.wakeTime);
  if (bed !== null && wake !== null && entry.sleepMinutes) {
    const span = ((wake - bed + 24) % 24) * 15;
    rings.push({
      id: "sleep",
      r: 102,
      node: (
        <path
          d={arc(102, bed * 15, bed * 15 + Math.max(span, 1))}
          fill="none"
          stroke={TRACKER_ACCENT.sleep}
          strokeWidth={13}
          strokeLinecap="round"
        />
      ),
    });
  }

  /* fills that run from midnight, as a share of their target */
  const fills: { id: "water" | "movement" | "screen"; r: number; share: number }[] = [
    {
      id: "water",
      r: 84,
      share: Math.min((entry.waterMl ?? 0) / (goals.waterMl || 2200), 1),
    },
    {
      id: "movement",
      r: 50,
      share: Math.min((entry.movementMinutes ?? 0) / (goals.movementMinutes || 30), 1),
    },
    {
      id: "screen",
      r: 66,
      share: Math.min((entry.screenMinutes ?? 0) / (goals.screenMinutes || 180), 1),
    },
  ];
  for (const f of fills) {
    if (f.share <= 0) continue;
    rings.push({
      id: f.id,
      r: f.r,
      node: (
        <path
          d={arc(f.r, 0, Math.max(f.share * 360, 1.5))}
          fill="none"
          stroke={TRACKER_ACCENT[f.id]}
          strokeWidth={11}
          strokeLinecap="round"
        />
      ),
    });
  }

  /* study — a block per session, on the hour it started */
  const sessions = entry.sessions ?? [];
  if (sessions.length) {
    let cursor = 9;
    const blocks = sessions.map((s) => {
      const start = hoursOf(s.startAt) ?? cursor;
      const length = (Math.max(s.minutes, 5) / 60) * 15;
      cursor = start + Math.max(s.minutes, 5) / 60 + 0.25;
      return { start, length };
    });
    rings.push({
      id: "study",
      r: 32,
      node: (
        <g>
          {blocks.map((b, i) => (
            <path
              key={`${b.start}-${i}`}
              d={arc(32, b.start * 15, b.start * 15 + Math.max(b.length, 2))}
              fill="none"
              stroke={TRACKER_ACCENT.study}
              strokeWidth={9}
              strokeLinecap="round"
            />
          ))}
        </g>
      ),
    });
  }

  const hourTicks = Array.from({ length: 24 }, (_, h) => {
    const a = pol(112, h * 15);
    const b = pol(h % 6 === 0 ? 106 : 109, h * 15);
    return (
      <line
        key={h}
        x1={a.x}
        y1={a.y}
        x2={b.x}
        y2={b.y}
        stroke="currentColor"
        strokeWidth={h % 6 === 0 ? 1.4 : 0.7}
        opacity={h % 6 === 0 ? 0.5 : 0.22}
      />
    );
  });

  const labels = [
    { h: 0, text: "12a" },
    { h: 6, text: "6a" },
    { h: 12, text: "12p" },
    { h: 18, text: "6p" },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,260px)_1fr] md:items-center">
      <svg
        viewBox="0 0 240 240"
        className="mx-auto w-full max-w-[260px] text-[var(--ci-text)]"
        role="img"
        aria-label="Today on a twenty-four hour dial"
      >
        <circle
          cx={C}
          cy={C}
          r={102}
          fill="none"
          stroke="currentColor"
          strokeWidth={13}
          opacity={0.07}
        />
        <circle
          cx={C}
          cy={C}
          r={84}
          fill="none"
          stroke="currentColor"
          strokeWidth={11}
          opacity={0.07}
        />
        <circle
          cx={C}
          cy={C}
          r={66}
          fill="none"
          stroke="currentColor"
          strokeWidth={11}
          opacity={0.07}
        />
        <circle
          cx={C}
          cy={C}
          r={50}
          fill="none"
          stroke="currentColor"
          strokeWidth={11}
          opacity={0.07}
        />
        <circle
          cx={C}
          cy={C}
          r={32}
          fill="none"
          stroke="currentColor"
          strokeWidth={9}
          opacity={0.07}
        />
        {rings.map((r) => (
          <g key={r.id}>{r.node}</g>
        ))}
        <g>{hourTicks}</g>
        {labels.map((l) => {
          const p = pol(122, l.h * 15);
          return (
            <text
              key={l.h}
              x={p.x}
              y={p.y + 3}
              textAnchor="middle"
              fontSize={8.5}
              fontFamily="var(--ci-font-mono)"
              fill="currentColor"
              opacity={0.55}
            >
              {l.text}
            </text>
          );
        })}

        {/* energy, as up to five dots in the middle */}
        <g>
          {[0, 1, 2, 3, 4].map((i) => (
            <circle
              key={i}
              cx={C - 20 + i * 10}
              cy={C + 26}
              r={3.4}
              fill={
                entry.energy !== null && i < entry.energy
                  ? TRACKER_ACCENT.energy
                  : "currentColor"
              }
              opacity={entry.energy !== null && i < entry.energy ? 1 : 0.16}
            />
          ))}
        </g>

        <text
          x={C}
          y={C - 4}
          textAnchor="middle"
          fontSize={30}
          fontFamily="var(--ci-font-display)"
          fill="currentColor"
        >
          {metToday}
        </text>
        <text
          x={C}
          y={C + 10}
          textAnchor="middle"
          fontSize={9}
          fontFamily="var(--ci-font-mono)"
          fill="currentColor"
          opacity={0.6}
        >
          OF {TRACKERS.length} TODAY
        </text>
      </svg>

      <ul className="grid gap-1.5 sm:grid-cols-2">
        {defs.map((d) => {
          const raw = valueOf(entry, d.id);
          return (
            <li
              key={d.id}
              className="flex items-center gap-2 text-[12.5px]"
              style={{ ["--tk-accent" as string]: TRACKER_ACCENT[d.id] }}
            >
              <span className="tk-head__tile !h-6 !w-6 !rounded-[7px]">
                <TrackerIcon id={d.id} size={12} />
              </span>
              <span className="truncate opacity-70">{d.name}</span>
              <span className="ml-auto font-[family-name:var(--ci-font-mono)] text-[11.5px]">
                {raw === null ? "— not yet" : d.format(raw)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default DayDial;
