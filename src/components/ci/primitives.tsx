/**
 * Small primitives shared by the Cycle Intelligence surfaces. Nothing here
 * knows about cycle data — it is all presentation, themed entirely through
 * the `.ci` CSS custom properties.
 */

import type { ButtonHTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { Confidence } from "@/lib/cycle/predict";

/* ---------------------------------- card ---------------------------------- */

export function Card({
  as: Tag = "section",
  className,
  padded = true,
  children,
  ...rest
}: {
  as?: "section" | "div" | "article" | "aside" | undefined;
  className?: string | undefined;
  padded?: boolean | undefined;
  children: ReactNode;
} & React.HTMLAttributes<HTMLElement>) {
  return (
    <Tag
      className={cn("ci-card", padded && "ci-card--pad", className)}
      {...(rest as React.HTMLAttributes<HTMLElement>)}
    >
      {children}
    </Tag>
  );
}

/* -------------------------------- headings -------------------------------- */

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("ci-eyebrow", className)}>{children}</p>;
}

export function SectionHead({
  eyebrow,
  title,
  note,
  aside,
  className,
}: {
  eyebrow: string;
  title: string;
  note?: ReactNode | undefined;
  aside?: ReactNode | undefined;
  className?: string | undefined;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-3", className)}>
      <div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h2 className="ci-display mt-1.5 text-[19px] leading-tight sm:text-[22px]">{title}</h2>
        {note ? (
          <p className="mt-1.5 max-w-[62ch] text-[13px] leading-relaxed ci-soft">{note}</p>
        ) : null}
      </div>
      {aside ? <div className="shrink-0">{aside}</div> : null}
    </div>
  );
}

/* --------------------------------- buttons --------------------------------- */

type ButtonVariant = "default" | "primary" | "ghost" | "danger";

export function Button({
  variant = "default",
  size = "md",
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant | undefined;
  size?: "sm" | "md" | undefined;
}) {
  return (
    <button
      type="button"
      className={cn(
        "ci-btn",
        variant === "primary" && "ci-btn--primary",
        variant === "ghost" && "ci-btn--ghost",
        variant === "danger" && "ci-btn--danger",
        size === "sm" && "ci-btn--sm",
        className,
      )}
      {...rest}
    />
  );
}

/* ---------------------------------- stats ---------------------------------- */

export function Stat({
  label,
  value,
  unit,
  sub,
  emphasis = false,
  className,
}: {
  label: string;
  value: ReactNode;
  unit?: string | undefined;
  sub?: ReactNode | undefined;
  emphasis?: boolean | undefined;
  className?: string | undefined;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="ci-eyebrow">{label}</p>
      <p
        className={cn(
          "mt-1.5 flex items-baseline gap-1.5",
          emphasis
            ? "ci-display text-[26px] leading-none sm:text-[30px]"
            : "text-[16px] leading-tight",
        )}
      >
        <span className={cn(emphasis ? "ci-display" : "font-medium", "truncate")}>{value}</span>
        {unit ? <span className="text-[12px] ci-muted">{unit}</span> : null}
      </p>
      {sub ? <p className="mt-1.5 text-[11.5px] leading-snug ci-muted">{sub}</p> : null}
    </div>
  );
}

/* -------------------------------- confidence -------------------------------- */

const CONFIDENCE_LABEL: Record<Confidence, string> = {
  none: "No confidence — generic estimate",
  low: "Low confidence",
  medium: "Medium confidence",
  high: "High confidence",
};

export function ConfidenceBadge({
  level,
  reason,
  className,
}: {
  level: Confidence;
  reason: string;
  className?: string | undefined;
}) {
  return (
    <span
      className={cn("ci-badge ci-badge--dot ci-confidence", className)}
      data-level={level}
      title={reason}
    >
      {CONFIDENCE_LABEL[level]}
    </span>
  );
}

/* -------------------------------- disclaimer -------------------------------- */

export function Disclaimer({ className }: { className?: string | undefined }) {
  return (
    <p className={cn("text-[11.5px] leading-relaxed ci-muted", className)}>
      Every date on this page is an estimate generated from the dates you logged — nothing more. It
      is not medical advice, it cannot diagnose anything, and the fertile window shown here is not
      contraception.
    </p>
  );
}

/* --------------------------------- misc ------------------------------------ */

export function Rule({ className }: { className?: string | undefined }) {
  return <hr className={cn("border-0 border-t ci-hair", className)} />;
}
