/**
 * Sparkline — fourteen days of one tracker, as a line with a fill under it.
 * Gaps where nothing was logged, so the shape never invents a day.
 */

export function Sparkline({
  values,
  accent,
  goal,
  height = 38,
  label,
}: {
  values: (number | null)[];
  accent: string;
  goal?: number | null;
  height?: number;
  label: string;
}) {
  const W = 140;
  const H = 38;
  const real = values.filter((v): v is number => v !== null);
  const max = Math.max(goal ?? 0, ...real, 1);
  const step = values.length > 1 ? W / (values.length - 1) : W;
  const y = (v: number) => H - 2 - (v / max) * (H - 5);

  const segments: string[] = [];
  let open = false;
  values.forEach((v, i) => {
    const x = Math.round(i * step * 100) / 100;
    if (v === null) {
      open = false;
      return;
    }
    const py = Math.round(y(v) * 100) / 100;
    segments.push(`${open ? "L" : "M"} ${x} ${py}`);
    open = true;
  });

  const last = [...values].reverse().find((v): v is number => v !== null);
  const lastX = Math.round((values.length - 1 - [...values].reverse().findIndex((v) => v !== null)) * step * 100) / 100;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
      role="img"
      aria-label={label}
      className="tk-row__spark block overflow-visible"
    >
      {goal ? (
        <line
          x1={0}
          x2={W}
          y1={Math.round(y(goal) * 100) / 100}
          y2={Math.round(y(goal) * 100) / 100}
          stroke={accent}
          strokeWidth={1}
          strokeDasharray="3 3"
          opacity={0.4}
          vectorEffect="non-scaling-stroke"
        />
      ) : null}
      {segments.length ? (
        <>
          <path
            d={`${segments.join(" ")}`}
            fill="none"
            stroke={accent}
            strokeWidth={1.6}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          <path
            d={`${segments.join(" ")} L ${Math.round((values.length - 1) * step * 100) / 100} ${H} L 0 ${H} Z`}
            fill={accent}
            opacity={0.1}
            stroke="none"
          />
        </>
      ) : (
        <line
          x1={0}
          x2={W}
          y1={H - 2}
          y2={H - 2}
          stroke="currentColor"
          strokeWidth={1}
          opacity={0.15}
          vectorEffect="non-scaling-stroke"
        />
      )}
      {last !== undefined ? (
        <circle
          cx={lastX}
          cy={Math.round(y(last) * 100) / 100}
          r={2.2}
          fill={accent}
          vectorEffect="non-scaling-stroke"
        />
      ) : null}
    </svg>
  );
}

export default Sparkline;
