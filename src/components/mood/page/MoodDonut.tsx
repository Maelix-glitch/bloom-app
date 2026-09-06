/**
 * MoodDonut — the model's "Mood distribution" ring + legend. Slices are the
 * real mood buckets (Excellent → Very difficult) over the selected period.
 */

export type DonutSlice = { label: string; value: number; color: string };

export function MoodDonut({
  slices,
  total,
  unit = "entries",
}: {
  slices: DonutSlice[];
  total: number;
  unit?: string;
}) {
  const R = 54;
  const C = 2 * Math.PI * R;
  const sum = slices.reduce((a, s) => a + s.value, 0) || 1;
  let offset = 0;

  return (
    <div className="flex flex-col items-center gap-8 sm:flex-row sm:gap-10">
      <div className="relative shrink-0">
        <svg
          viewBox="0 0 140 140"
          className="h-40 w-40 -rotate-90 sm:h-44 sm:w-44"
          aria-hidden="true"
        >
          <circle cx="70" cy="70" r={R} fill="none" stroke="oklch(1 0 0 / 0.07)" strokeWidth="15" />
          {slices
            .filter((s) => s.value > 0)
            .map((s) => {
              const len = (s.value / sum) * C;
              const visible = Math.max(len - 3, 0);
              const dash = `${visible} ${C - visible}`;
              const el = (
                <circle
                  key={s.label}
                  cx="70"
                  cy="70"
                  r={R}
                  fill="none"
                  stroke={s.color}
                  strokeWidth="15"
                  strokeLinecap="round"
                  strokeDasharray={dash}
                  strokeDashoffset={-offset}
                  opacity="0.85"
                />
              );
              offset += len;
              return el;
            })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-4xl leading-none text-foreground">{total}</span>
          <span className="mt-1 text-xs text-muted-foreground">{unit}</span>
        </div>
      </div>

      <ul className="w-full space-y-3.5">
        {slices.map((s) => (
          <li key={s.label} className="flex items-center gap-3 text-sm">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: s.color }}
            />
            <span className="min-w-0 flex-1 truncate text-foreground/85">{s.label}</span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {Math.round((s.value / sum) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
