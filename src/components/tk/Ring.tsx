/**
 * Ring — the one shape the trackers page keeps coming back to.
 *
 * Geometry is rounded so the server and the browser serialise the same
 * numbers (a float that differs in the last digit is a hydration mismatch).
 */

export function Ring({
  progress,
  accent,
  size = 46,
  stroke = 6,
  children,
  empty = false,
  label,
}: {
  progress: number;
  accent: string;
  size?: number;
  stroke?: number;
  children?: React.ReactNode;
  empty?: boolean;
  label?: string;
}) {
  const c = size / 2;
  const r = c - stroke / 2 - 1;
  const circ = Math.round(2 * Math.PI * r * 100) / 100;
  const offset = Math.round(circ * (1 - Math.max(0, Math.min(1, progress))) * 100) / 100;

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      className="tk-ring"
      role="img"
      aria-label={label}
      style={{ width: size, height: size }}
    >
      <circle
        cx={c}
        cy={c}
        r={r}
        fill="none"
        stroke="color-mix(in oklab, var(--ci-text) 12%, transparent)"
        strokeWidth={stroke}
      />
      <circle
        cx={c}
        cy={c}
        r={r}
        fill="none"
        stroke={accent}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        opacity={empty ? 0.28 : 0.95}
        transform={`rotate(-90 ${c} ${c})`}
      />
      {children ? (
        <text
          x={c}
          y={c + 4}
          textAnchor="middle"
          fontSize={size * 0.34}
          fontFamily="var(--ci-font-mono)"
          fill="var(--ci-text)"
        >
          {children}
        </text>
      ) : null}
    </svg>
  );
}

export default Ring;
