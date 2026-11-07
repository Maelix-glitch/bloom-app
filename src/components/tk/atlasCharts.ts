/**
 * Chart geometry for the Trackers page — drawn honestly at low data.
 *
 * The rule (UI update plan §6.2): a chart shows the days that were logged
 * and nothing else. Unlogged days break the line instead of being bridged
 * by a smooth curve through nothing; a single logged day is a dot, and it
 * is the caller's job to say "one day" in words next to it. Nothing here
 * invents a point, an average or a trend.
 */

export interface PlottedPoint {
  i: number;
  v: number;
}

/**
 * The logged points of a series, grouped into runs of consecutive days.
 * A run is the only thing a line may ever connect: two runs are separated
 * by at least one unlogged day, and no path crosses that gap.
 */
export function loggedRuns(values: (number | null)[]): PlottedPoint[][] {
  const runs: PlottedPoint[][] = [];
  let current: PlottedPoint[] = [];
  values.forEach((v, i) => {
    if (v === null) {
      if (current.length > 0) runs.push(current);
      current = [];
      return;
    }
    current.push({ i, v });
  });
  if (current.length > 0) runs.push(current);
  return runs;
}

/** How many days of the series were actually logged. */
export function loggedCount(values: (number | null)[]): number {
  return values.reduce<number>((n, v) => (v === null ? n : n + 1), 0);
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export interface Contour {
  /** One straight-segment path per run of two or more consecutive days. */
  lines: string[];
  /** The area under each line, closed to the baseline. */
  areas: string[];
  /** Every logged point, so a lone day still shows as a dot. */
  dots: { x: number; y: number }[];
  /** Total logged days in the series. */
  logged: number;
}

/**
 * A territory contour: straight segments between neighbouring logged days,
 * a dot on every logged day, and nothing at all across a gap.
 */
export function contour(
  values: (number | null)[],
  width: number,
  height: number,
  peak: number,
): Contour {
  const x = (i: number) => round2((i / Math.max(values.length - 1, 1)) * width);
  const y = (v: number) => round2(height - (v / peak) * (height - 6) - 3);
  const lines: string[] = [];
  const areas: string[] = [];
  const dots: { x: number; y: number }[] = [];
  for (const run of loggedRuns(values)) {
    for (const p of run) dots.push({ x: x(p.i), y: y(p.v) });
    if (run.length < 2) continue;
    const line = run.map((p, k) => `${k === 0 ? "M" : "L"} ${x(p.i)} ${y(p.v)}`).join(" ");
    lines.push(line);
    areas.push(
      `${line} L ${x(run[run.length - 1]!.i)} ${height} L ${x(run[0]!.i)} ${height} Z`,
    );
  }
  return { lines, areas, dots, logged: loggedCount(values) };
}

export interface RouteLine {
  /** One straight-segment path per run of two or more consecutive days. */
  lines: string[];
  /** Logged days that stand alone (no logged neighbour) — drawn as dots. */
  singles: { x: number; y: number }[];
  /** Total logged days in the series. */
  logged: number;
}

/**
 * One tracker's path on the fourteen-day route chart. Same honesty rule as
 * the contour: lines only join consecutive logged days; a day with no
 * logged neighbour is a dot, never silently absent while the legend still
 * lists its tracker.
 */
export function routePath(
  values: (number | null)[],
  x: (i: number) => number,
  y: (v: number) => number,
): RouteLine {
  const lines: string[] = [];
  const singles: { x: number; y: number }[] = [];
  for (const run of loggedRuns(values)) {
    if (run.length === 1) {
      singles.push({ x: x(run[0]!.i), y: y(run[0]!.v) });
      continue;
    }
    lines.push(run.map((p, k) => `${k === 0 ? "M" : "L"} ${x(p.i)} ${y(p.v)}`).join(" "));
  }
  return { lines, singles, logged: loggedCount(values) };
}
