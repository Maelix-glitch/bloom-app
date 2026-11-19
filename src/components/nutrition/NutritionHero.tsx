/**
 * Nutrition — the date strip and the day hero (N-UI).
 *
 * DateNav drives the whole tab's day: prev/next chevrons and a 7-day
 * strip centred on the selected day, each cell carrying a small ring
 * of that day's energy against the target (a track only, when there is
 * no target or nothing logged — never a fabricated fraction).
 *
 * The Hero is the prototype's card-gold composition on Bloom's rules:
 * rings only for the two targets Bloom's engine actually sets (kcal,
 * protein — carbs and fat are totals, drawn without target framing);
 * the provenance ledger counts the day's energy by where it came from;
 * the eating window appears only when entries carry real timestamps.
 * Safety states are Bloom's, unchanged: blocked → totals only, no
 * target framing anywhere and the gate's own note; no profile → the
 * unlock note naming the next step.
 */

import type { CSSProperties } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react";

import { fmtCount, fmtGrams, fmtKcalApprox } from "@/lib/format";
import { shiftDay } from "@/lib/localDay";
import {
  eatingWindowOf,
  formatSpan,
  kcalByProvenance,
  type DayLog,
  type NutritionTargets,
  type TotalsComparison,
} from "@/lib/nutrition";
import { pctOfTarget } from "@/lib/nutrition/targets";
import type { NutritionTargetState } from "@/hooks/useNutrition";
import { Bar, Rings } from "./NutritionPrimitives";
import { EstimateChip } from "./ProvenanceBadge";

/* --------------------------------- dates -------------------------------- */

export function dayLabel(day: string, today: string): string {
  if (day === today) return "Today";
  if (day === shiftDay(today, -1)) return "Yesterday";
  if (day === shiftDay(today, 1)) return "Tomorrow";
  return new Date(`${day}T12:00:00`).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "short",
  });
}

function weekdayShort(day: string): string {
  return new Date(`${day}T12:00:00`).toLocaleDateString("en-IN", { weekday: "short" });
}

/* -------------------------------- DateNav ------------------------------- */

export function DateNav({
  day,
  today,
  onSelect,
  kcalOfDay,
  targets,
}: {
  day: string;
  today: string;
  onSelect: (day: string) => void;
  /** The day's logged kcal, or null when nothing was logged. */
  kcalOfDay: (day: string) => number | null;
  targets: NutritionTargets | null;
}) {
  const strip = [-3, -2, -1, 0, 1, 2, 3].map((offset) => shiftDay(day, offset));
  return (
    <nav className="nut-datenav nut-rise" aria-label="Choose a day" style={{ "--d": "40ms" } as CSSProperties}>
      <button
        type="button"
        className="nut-icon-btn self-center"
        aria-label="Previous day"
        onClick={() => onSelect(shiftDay(day, -1))}
      >
        <ChevronLeft className="size-[17px]" aria-hidden />
      </button>
      <div className="flex flex-1 items-stretch gap-1.5">
        {strip.map((stripDay) => {
          const selected = stripDay === day;
          const kcal = kcalOfDay(stripDay);
          const fraction =
            targets && kcal !== null ? Math.max(0, Math.min(1, kcal / targets.kcal)) : null;
          const r = 15;
          const circ = 2 * Math.PI * r;
          return (
            <button
              key={stripDay}
              type="button"
              className="nut-daycell"
              data-selected={selected || undefined}
              aria-label={dayLabel(stripDay, today)}
              aria-current={selected ? "date" : undefined}
              onClick={() => onSelect(stripDay)}
            >
              <span className="nut-daycell-weekday">{weekdayShort(stripDay)}</span>
              <span className="relative grid size-9 place-items-center">
                <svg width={36} height={36} viewBox="0 0 36 36" aria-hidden>
                  <circle
                    cx={18}
                    cy={18}
                    r={r}
                    fill="none"
                    strokeWidth={2.5}
                    style={{ stroke: "color-mix(in oklab, var(--foreground) 10%, transparent)" }}
                  />
                  {fraction !== null ? (
                    <circle
                      cx={18}
                      cy={18}
                      r={r}
                      fill="none"
                      strokeWidth={2.5}
                      strokeLinecap="round"
                      transform="rotate(-90 18 18)"
                      strokeDasharray={circ}
                      strokeDashoffset={circ * (1 - fraction)}
                      style={{ stroke: selected ? "var(--gold-soft)" : "var(--gold)", opacity: selected ? 1 : 0.6 }}
                    />
                  ) : null}
                </svg>
                <span className="nut-daycell-num absolute">{stripDay.slice(8)}</span>
              </span>
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className="nut-icon-btn self-center"
        aria-label="Next day"
        onClick={() => onSelect(shiftDay(day, 1))}
      >
        <ChevronRight className="size-[17px]" aria-hidden />
      </button>
    </nav>
  );
}

/* ---------------------------------- Hero --------------------------------- */

export function NutritionHero({
  day,
  today,
  log,
  targetState,
  comparison,
  bmr,
  tdee,
}: {
  day: string;
  today: string;
  log: DayLog;
  targetState: NutritionTargetState;
  comparison: TotalsComparison;
  /** Genuinely available body numbers for the footnote, when the
   *  Trackers body profile computes them; otherwise null. */
  bmr: number | null;
  tdee: number | null;
}) {
  const targets = targetState.kind === "ready" ? targetState.targets : null;
  const totals = log.totals;
  const shares = kcalByProvenance(log.entries);
  const window = eatingWindowOf(log.entries);
  const empty = log.entries.length === 0;

  /* The remaining figure is the ring centre's hero numeral now (§H),
     so the headline no longer repeats it — it carries only the day's
     posture, and the number lives in exactly one place on the card. */
  const headline = empty ? (
    <>
      A blank page, <em className="nut-gold-text">ready.</em>
    </>
  ) : targets && comparison.kcalRemaining !== null ? (
    comparison.kcalRemaining > 0 ? (
      <>
        Still <em className="nut-gold-text">room</em> to enjoy
      </>
    ) : comparison.kcalRemaining === 0 ? (
      <>
        Right at your <em className="nut-gold-text">guide.</em>
      </>
    ) : (
      <>Past your guide {day === today ? "today" : "that day"}</>
    )
  ) : (
    <>{fmtCount(totals.kcal)} kcal logged {day === today ? "today" : "that day"}</>
  );

  const macros: {
    label: string;
    color: string;
    value: string;
    targetText?: string;
    fraction: number | null;
    metric?: string;
  }[] = [
    {
      label: "Protein",
      color: "var(--sage)",
      metric: "day-protein-vs-target",
      /* Computed day totals go through the shared display formatter
         (whole, grouped) — the input module's formatGrams is for the
         person's own entered amounts, where their decimal is theirs. */
      value: `${fmtGrams(totals.proteinG)} g`,
      ...(targets ? { targetText: ` / ~${fmtGrams(targets.proteinG)} g` } : {}),
      fraction: comparison.proteinFraction,
    },
    {
      label: "Carbs",
      color: "var(--sky)",
      value: `${fmtGrams(totals.carbsG)} g`,
      fraction: null,
    },
    {
      label: "Fat",
      color: "var(--amber)",
      value: `${fmtGrams(totals.fatG)} g`,
      fraction: null,
    },
  ];

  const ledger: { label: string; kcal: number; color: string }[] = [
    { label: "USDA FoodData Central", kcal: shares.usdaKcal, color: "var(--sage)" },
    { label: "Your value", kcal: shares.ownKcal, color: "var(--gold)" },
    { label: "Estimate — based on your photo", kcal: shares.estimateKcal, color: "var(--rose)" },
  ].filter((row) => row.kcal > 0);

  return (
    <section className="nut-card nut-card-gold nut-rise mt-5" aria-label="Day totals" style={{ "--d": "80ms" } as CSSProperties}>
      <div className="flex flex-col items-center gap-7 sm:flex-row sm:items-center">
        <div
          {...(targets
            ? {
                role: "progressbar",
                "aria-label": "Calories against target",
                "aria-valuemin": 0,
                "aria-valuemax": 100,
                "aria-valuenow": pctOfTarget(totals.kcal, targets.kcal),
              }
            : {})}
        >
          <Rings
            size={232}
            stroke={11}
            gap={7}
            rings={[
              { fraction: comparison.kcalFraction, color: "var(--gold-soft)" },
              { fraction: comparison.proteinFraction, color: "var(--sage)" },
            ]}
          >
            {/* The centre answers "how much is left" (§H): with a
                target, the hero numeral is the REMAINING figure and
                the caption carries the consumed-vs-target pair; the
                arc still draws the consumed fraction. Without a
                target there is no remainder to state, so the centre
                stays the day's logged total, plainly captioned. */}
            {targets && comparison.kcalRemaining !== null ? (
              <>
                <span
                  className="font-display text-[44px] leading-none text-foreground tabular-nums"
                  data-metric="day-kcal-headline"
                >
                  {fmtCount(Math.abs(comparison.kcalRemaining))}
                </span>
                <span className="mt-1.5 text-[length:var(--text-caption)] text-muted-foreground tabular-nums">
                  {comparison.kcalRemaining < 0 ? "kcal past your guide" : "kcal left"}
                </span>
                <span
                  className="mt-0.5 text-[length:var(--text-caption)] text-muted-foreground tabular-nums"
                  data-metric="day-kcal-vs-target"
                >
                  {fmtCount(totals.kcal)} of {fmtKcalApprox(targets.kcal)} eaten
                </span>
              </>
            ) : (
              <>
                <span className="font-display text-[44px] leading-none text-foreground tabular-nums">
                  {fmtCount(totals.kcal)}
                </span>
                <span className="mt-1.5 text-[length:var(--text-caption)] text-muted-foreground tabular-nums">
                  kcal
                </span>
              </>
            )}
          </Rings>
        </div>

        <div className="min-w-0 flex-1">
          <p className="eyebrow">{dayLabel(day, today)}</p>
          <h2 className="mt-2 font-display text-[34px] leading-[1.08] text-foreground">
            {headline}
          </h2>
          <div className="mt-5 space-y-3.5">
            {macros.map((macro, i) => (
              <div key={macro.label}>
                <div className="flex items-baseline gap-2 text-[length:var(--text-callout)]">
                  <span
                    className="size-2 shrink-0 translate-y-[-1px] rounded-full"
                    style={{ background: macro.color }}
                    aria-hidden
                  />
                  <span className="text-muted-foreground">{macro.label}</span>
                  <span
                    className="ml-auto font-semibold text-foreground tabular-nums"
                    data-metric={macro.metric}
                  >
                    {macro.value}
                    {macro.targetText ? (
                      <span className="font-normal text-muted-foreground">{macro.targetText}</span>
                    ) : null}
                  </span>
                </div>
                {targets ? (
                  <div className="ml-4 mt-1.5">
                    <Bar fraction={macro.fraction} color={macro.color} height={5} delay={200 + i * 120} />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>

      <hr className="nut-hairline my-6" />

      <div className="grid gap-6 sm:grid-cols-[1.4fr_1fr]">
        <div>
          <div className="flex items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-[length:var(--text-callout)] font-medium text-foreground">
              <ShieldCheck className="size-4 text-[var(--sage)]" aria-hidden />
              Provenance ledger
            </p>
            {shares.verifiedShare !== null ? (
              <p className="text-right">
                <span className="font-display text-[length:var(--text-title)] text-foreground tabular-nums">
                  {Math.round(shares.verifiedShare * 100)}%
                </span>{" "}
                <span className="text-[length:var(--text-caption)] text-muted-foreground">
                  of your energy is from stated values, not estimates
                </span>
              </p>
            ) : (
              <p className="text-[length:var(--text-caption)] text-muted-foreground">
                Nothing to verify yet
              </p>
            )}
          </div>
          {shares.totalKcal > 0 ? (
            <>
              <div className="nut-ledger mt-3" aria-hidden>
                {ledger.map((row) => (
                  <span
                    key={row.label}
                    style={{
                      width: `${(row.kcal / shares.totalKcal) * 100}%`,
                      background: row.color,
                    }}
                  />
                ))}
              </div>
              <ul className="mt-3 space-y-1.5">
                {ledger.map((row) => (
                  <li
                    key={row.label}
                    className="flex items-center gap-2 text-[length:var(--text-caption)] text-muted-foreground"
                  >
                    <span className="size-2 rounded-full" style={{ background: row.color }} aria-hidden />
                    {row.label}
                    <span className="ml-auto font-semibold text-foreground tabular-nums">
                      {fmtCount(row.kcal)} kcal
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>

        <div>
          <p className="eyebrow">Eating window</p>
          {window ? (
            <>
              <p className="mt-2 font-display text-[24px] text-foreground tabular-nums">
                {window.first} → {window.last}
              </p>
              <p className="mt-1 text-[length:var(--text-caption)] text-muted-foreground">
                {window.spanMinutes > 0 ? formatSpan(window.spanMinutes) : "A single sitting so far"}
              </p>
            </>
          ) : (
            <p className="mt-2 text-[length:var(--text-callout)] text-muted-foreground">
              Appears with your first log.
            </p>
          )}
        </div>
      </div>

      {targetState.kind === "ready" ? (
        <p className="nut-note">
          <EstimateChip /> Targets are estimates from your body numbers (Mifflin–St Jeor
          {bmr !== null && tdee !== null
            ? `, ${fmtCount(bmr)} kcal at rest, ${fmtKcalApprox(tdee)} with activity`
            : ""}
          ) — a guide for the day, not a prescription.
        </p>
      ) : targetState.kind === "blocked" ? (
        <p className="nut-note">
          Your safety answers mean Bloom doesn't set calorie targets for you. These totals
          are simply your record — logging still works exactly the same.
        </p>
      ) : (
        <p className="nut-note">
          No target yet: targets come from your body numbers.{" "}
          <Link to="/trackers" className="nut-inline-link">
            Add them on Trackers
          </Link>{" "}
          or take the assessment, and this day will measure against one.
        </p>
      )}
    </section>
  );
}
