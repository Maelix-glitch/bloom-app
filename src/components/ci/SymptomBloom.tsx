/**
 * SymptomBloom — the symptoms someone actually logs, as petals.
 *
 * One petal per symptom, length set by how many days it was logged, coloured
 * by the phase it turns up in most. Eight petals at most: the point is the
 * shape of the whole thing, not a table of numbers.
 */

import { PHASE_LABEL, type Phase } from "@/lib/cycle/predict";
import type { SymptomTally } from "@/lib/cycle/dayLogs";

const SIZE = 260;
const C = SIZE / 2;
const R_INNER = 40;
const R_MAX = 104;

const PHASE_VAR: Record<string, string> = {
  menstrual: "var(--ci-menstrual)",
  follicular: "var(--ci-follicular)",
  ovulation: "var(--ci-ovulation)",
  luteal: "var(--ci-luteal)",
  late: "var(--ci-menstrual)",
};

function polar(r: number, deg: number): { x: number; y: number } {
  const rad = ((deg - 90) * Math.PI) / 180;
  /* Rounded: the server and the browser can differ in the last digit of a
     float, which React reports as a hydration mismatch on the attribute. */
  return {
    x: Math.round((C + r * Math.cos(rad)) * 100) / 100,
    y: Math.round((C + r * Math.sin(rad)) * 100) / 100,
  };
}

function trim(label: string): string {
  return label.length > 11 ? `${label.slice(0, 10)}…` : label;
}

export function SymptomBloom({ tally, total }: { tally: SymptomTally[]; total: number }) {
  const top = tally.filter((t) => t.count > 0).slice(0, 8);
  const max = top.reduce((m, t) => Math.max(m, t.count), 0) || 1;

  if (top.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-6">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full max-w-[220px]" aria-hidden>
          <circle
            cx={C}
            cy={C}
            r={R_INNER + 26}
            fill="none"
            stroke="var(--ci-text)"
            strokeWidth={1}
            strokeDasharray="3 7"
            opacity={0.22}
          />
          <circle
            cx={C}
            cy={C}
            r={R_INNER - 12}
            fill="none"
            stroke="var(--ci-text)"
            strokeWidth={1}
            opacity={0.14}
          />
        </svg>
        <p className="mt-2 text-[12px] ci-muted">Log a symptom and it blooms here.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="ci-bloom w-full max-w-[280px]"
        role="img"
        aria-label={`Symptom bloom: ${top
          .map((t) => `${t.key} on ${t.count} day${t.count === 1 ? "" : "s"}`)
          .join(", ")}.`}
      >
        {/* rings */}
        {[0.34, 0.67, 1].map((f) => (
          <circle
            key={f}
            cx={C}
            cy={C}
            r={R_INNER + (R_MAX - R_INNER) * f}
            fill="none"
            stroke="var(--ci-text)"
            strokeWidth={0.7}
            opacity={0.12}
          />
        ))}

        {top.map((t, i) => {
          const deg = (i / top.length) * 360;
          const len = R_INNER + (R_MAX - R_INNER) * (t.count / max);
          const a = polar(R_INNER, deg);
          const b = polar(len, deg);
          const tip = polar(len + 13, deg);
          const colour = t.topPhase ? PHASE_VAR[t.topPhase] : "var(--ci-text)";
          const right = tip.x >= C;
          return (
            <g key={t.key}>
              <line
                className="ci-petal"
                style={{ animationDelay: `${i * 55}ms` }}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={colour}
                strokeWidth={7}
                strokeLinecap="round"
                opacity={0.78}
              />
              <circle cx={b.x} cy={b.y} r={3.2} fill={colour} opacity={0.95} />
              <text
                x={tip.x}
                y={tip.y + 3}
                textAnchor={right ? "start" : "end"}
                className="ci-num"
                fontSize={9.5}
                fill="var(--ci-text)"
                opacity={0.7}
              >
                {trim(t.key)}
              </text>
            </g>
          );
        })}

        <circle
          cx={C}
          cy={C}
          r={R_INNER - 14}
          fill="none"
          stroke="var(--ci-text)"
          strokeWidth={1}
          opacity={0.16}
        />
        <text
          x={C}
          y={C - 1}
          textAnchor="middle"
          className="ci-display"
          fontSize={26}
          fill="var(--ci-text)"
        >
          {total}
        </text>
        <text
          x={C}
          y={C + 14}
          textAnchor="middle"
          className="ci-num"
          fontSize={8.5}
          letterSpacing={1.6}
          fill="var(--ci-text)"
          opacity={0.6}
        >
          DAYS
        </text>
      </svg>

      <p className="mt-1 text-[11px] leading-relaxed ci-muted">
        Longer petal, more days logged
        {top[0]?.topPhase
          ? ` · colour is the phase it shows up in (${PHASE_LABEL[top[0].topPhase as Phase] ?? top[0].topPhase})`
          : ""}
      </p>
    </div>
  );
}

export default SymptomBloom;
