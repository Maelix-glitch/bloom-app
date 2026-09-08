export function ProgressRing({
  value,
  size = 168,
  caption,
  label,
}: {
  value: number;
  size?: number;
  caption?: string | undefined;
  /** Accessible description, e.g. "62% of today's goals". */
  label?: string | undefined;
}) {
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));

  return (
    <div
      className="relative grid place-items-center"
      style={{ width: size, height: size }}
      role="img"
      aria-label={label ?? `${pct}%${caption ? ` ${caption}` : ""}`}
    >
      <div
        className="home-halo absolute inset-2 rounded-full"
        style={{ background: "var(--home-gradient-glow)" }}
      />
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          stroke="var(--home-secondary)"
        />
        <defs>
          <linearGradient id="homeRingGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="oklch(0.72 0.13 255)" />
            <stop offset="60%" stopColor="oklch(0.78 0.14 320)" />
            <stop offset="100%" stopColor="oklch(0.9 0.08 340)" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          stroke="url(#homeRingGrad)"
          strokeDasharray={c}
          strokeDashoffset={c - (c * pct) / 100}
          style={{ transition: "stroke-dashoffset 1.4s cubic-bezier(0.22,1,0.36,1)" }}
        />
      </svg>
      <div className="absolute text-center">
        <p
          className="font-display text-3xl leading-none tabular-nums"
          data-testid="home-progress-value"
        >
          {pct}%
        </p>
        {caption ? <p className="mt-1 text-[10px] text-muted-foreground">{caption}</p> : null}
      </div>
    </div>
  );
}
