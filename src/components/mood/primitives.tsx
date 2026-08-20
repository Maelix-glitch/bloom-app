import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Evidence } from "@/lib/mood/types";

export type Accent = "violet" | "sky" | "amber" | "sage" | "rose";

export const accentText: Record<Accent, string> = {
  violet: "text-violet",
  sky: "text-sky",
  amber: "text-amber",
  sage: "text-sage",
  rose: "text-rose",
};

export const accentVar: Record<Accent, string> = {
  violet: "var(--violet)",
  sky: "var(--sky)",
  amber: "var(--amber)",
  sage: "var(--sage)",
  rose: "var(--rose)",
};

export function Panel({
  className,
  children,
  glow,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { glow?: Accent }) {
  return (
    <div
      {...rest}
      className={cn(
        "panel relative overflow-hidden transition-[border-color,box-shadow,transform] duration-500",
        "hover:border-border-strong",
        className,
      )}
    >
      {glow ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-32 opacity-70"
          style={{
            background: `radial-gradient(120% 100% at 50% 0%, color-mix(in oklab, ${accentVar[glow]} 16%, transparent), transparent 70%)`,
          }}
        />
      ) : null}
      <div className="relative">{children}</div>
    </div>
  );
}

export function SectionHead({
  eyebrow,
  title,
  sub,
  right,
}: {
  eyebrow?: string;
  title: string;
  sub?: string;
  right?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow ? <p className="eyebrow mb-2">{eyebrow}</p> : null}
        <h2 className="display text-[20px] leading-tight sm:text-[23px]">{title}</h2>
        {sub ? <p className="mt-1 max-w-[60ch] text-[13px] text-muted-foreground">{sub}</p> : null}
      </div>
      {right}
    </div>
  );
}

export function useCountUp(value: number, decimals = 1, duration = 900) {
  const [display, setDisplay] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const reduce =
      typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setDisplay(value);
      from.current = value;
      return;
    }
    const start = performance.now();
    const origin = from.current;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(origin + (value - origin) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return display.toFixed(decimals);
}

export function CountUp({ value, decimals = 1 }: { value: number; decimals?: number }) {
  return <>{useCountUp(value, decimals)}</>;
}

export function Delta({ value, unit = "%", invert }: { value: number | null; unit?: string; invert?: boolean }) {
  if (value === null || Number.isNaN(value))
    return <span className="mono text-[11px] text-faint">no baseline</span>;
  const good = invert ? value < 0 : value > 0;
  const flat = Math.abs(value) < 0.05;
  return (
    <span
      className={cn(
        "mono inline-flex items-center gap-1 text-[11px]",
        flat ? "text-faint" : good ? "text-sage" : "text-rose",
      )}
    >
      <span aria-hidden>{flat ? "→" : good ? "↑" : "↓"}</span>
      {value > 0 ? "+" : ""}
      {value.toFixed(1)}
      {unit}
    </span>
  );
}

const evidenceStyles: Record<Evidence, string> = {
  insufficient: "text-faint border-border",
  low: "text-amber border-amber/40",
  moderate: "text-sky border-sky/40",
  strong: "text-sage border-sage/40",
};

export function EvidencePill({ evidence, n }: { evidence: Evidence; n?: number }) {
  return (
    <span
      className={cn(
        "mono inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.08em]",
        evidenceStyles[evidence],
      )}
    >
      <span className="size-1 rounded-full bg-current" />
      {evidence === "insufficient" ? "insufficient" : evidence}
      {typeof n === "number" ? <span className="text-faint">· {n} obs</span> : null}
    </span>
  );
}

export function Metric({
  label,
  value,
  suffix,
  sub,
  accent = "violet",
  decimals = 1,
  raw,
}: {
  label: string;
  value?: number;
  suffix?: string;
  sub?: ReactNode;
  accent?: Accent;
  decimals?: number;
  raw?: string;
}) {
  return (
    <div className="group relative flex flex-col gap-2 p-5">
      <p className="eyebrow">{label}</p>
      <p className="numeric flex items-baseline gap-1 text-[30px] leading-none">
        <span className={accentText[accent]}>
          {raw ?? (typeof value === "number" ? <CountUp value={value} decimals={decimals} /> : "—")}
        </span>
        {suffix ? <span className="mono text-[11px] text-faint">{suffix}</span> : null}
      </p>
      {sub ? <div className="text-[11px] text-muted-foreground">{sub}</div> : null}
    </div>
  );
}

export function Insufficient({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[12px] border border-dashed border-border bg-surface-2/40 p-6 text-center">
      <p className="display text-[15px] text-muted-foreground">Not enough data yet.</p>
      <p className="mono mt-2 text-[11px] text-faint">{children}</p>
    </div>
  );
}

export function Reveal({
  delay = 0,
  className,
  children,
}: {
  delay?: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn("animate-rise opacity-0", className)}
      style={{ animationDelay: `${delay}ms`, animationFillMode: "forwards" }}
    >
      {children}
    </div>
  );
}
