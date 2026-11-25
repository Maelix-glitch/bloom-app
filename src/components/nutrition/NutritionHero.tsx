/**
 * Nutrition — the date strip and the day hero (N-UI).
 *
 * DateNav drives the whole tab's day: prev/next chevrons and a 7-day
 * strip centred on the selected day, each cell carrying a small ring
 * of that day's energy against the target (a track only, when there is
 * no target or nothing logged — never a fabricated fraction).
 *
 * The Hero is the prototype's card-gold composition on Bloom's rules:
 * the day's figure is kcal EATEN against the guide — progress, never a
 * countdown (brief v6, M-126) — and the two targets Bloom's engine
 * actually sets (kcal, protein) read as house meters; carbs and fat
 * are totals, drawn without target framing. The footer is ONE row
 * (M-124): the provenance ledger's one-line summary — the ledger
 * counts the day's energy by where it came from — and the eating
 * window as one chip; the window appears only when entries carry real
 * timestamps.
 * Safety states are Bloom's, unchanged: blocked → totals only, no
 * target framing anywhere and the gate's own note; no profile → the
 * unlock note naming the next step.
 */

import type { CSSProperties } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, ShieldCheck } from "lucide-react";

import { fmtCount, fmtGrams, fmtKcalApprox, plural } from "@/lib/format";
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

  /* The headline carries only the day's posture, derived from the
     engine's remaining figure; the numeral itself is what was EATEN
     (M-126) and lives in exactly one place on the card. */
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

  const ledger: { label: string; kcal: number; color: string }[] = [
    { label: "USDA FoodData Central", kcal: shares.usdaKcal, color: "var(--sage)" },
    { label: "Your value", kcal: shares.ownKcal, color: "var(--gold)" },
    { label: "Estimate, based on your photo", kcal: shares.estimateKcal, color: "var(--rose)" },
  ].filter((row) => row.kcal > 0);

  return (
    <section className="nut-card nut-card-gold nut-rise section section--lead" aria-label="Day totals" style={{ "--d": "80ms" } as CSSProperties}>
      <div className="flex flex-col items-center gap-7 sm:flex-row sm:items-center">
        {/* The day's figure (M-126): kcal EATEN so far, the guide as
            its context line. It used to be the countdown — the
            remaining figure as the hero numeral with a remaining-kcal
            caption beneath it, inside a concentric double ring
            (M-125). The targets
            and every computed number are unchanged; only the framing
            moved from what's left to what's done. */}
        <div className="shrink-0 text-center sm:w-[232px]">
          {targets ? (
            <>
              <span
                className="font-display text-[44px] leading-none text-foreground tabular-nums"
                data-metric="day-kcal-headline"
              >
                {fmtCount(totals.kcal)}
              </span>
              <span
                className="mt-1.5 block text-[length:var(--text-caption)] text-muted-foreground tabular-nums"
                data-metric="day-kcal-vs-target"
              >
                of your {fmtKcalApprox(targets.kcal)} guide
              </span>
            </>
          ) : (
            <>
              <span className="font-display text-[44px] leading-none text-foreground tabular-nums">
                {fmtCount(totals.kcal)}
              </span>
              <span className="mt-1.5 block text-[length:var(--text-caption)] text-muted-foreground tabular-nums">
                kcal
              </span>
            </>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="eyebrow">{dayLabel(day, today)}</p>
          <h2 className="mt-2 font-display text-[34px] leading-[1.08] text-foreground">
            {headline}
          </h2>
          <div className="mt-5 space-y-3.5">
            {/* Calories and Protein read as house meters against the
                guide (M-125): each meter's max is the guide and its
                value what was eaten, figures adjacent on the label
                row. Carbs and fat are totals — the engine sets no
                guide for them, so they carry no track at all (the old
                rows drew empty tracks under them whenever a target
                existed). Computed day totals go through the shared
                display formatter (whole, grouped) — the input
                module's formatGrams is for the person's own entered
                amounts, where their decimal is theirs. */}
            <div>
              <div className="flex items-baseline gap-2 text-[length:var(--text-callout)]">
                <span
                  className="size-2 shrink-0 translate-y-[-1px] rounded-full"
                  style={{ background: "var(--gold-soft)" }}
                  aria-hidden
                />
                <span className="text-muted-foreground">Calories</span>
                <span className="ml-auto font-semibold text-foreground tabular-nums">
                  {targets ? (
                    <>
                      {fmtCount(totals.kcal)} of {fmtKcalApprox(targets.kcal)}
                    </>
                  ) : (
                    <>{fmtCount(totals.kcal)} kcal</>
                  )}
                </span>
              </div>
              {targets ? (
                <div className="ml-4 mt-1.5">
                  <div
                    className="meter"
                    role="progressbar"
                    aria-label="Calories against target"
                    aria-valuemin={0}
                    aria-valuemax={Math.round(targets.kcal)}
                    aria-valuenow={Math.round(totals.kcal)}
                    style={
                      {
                        "--v": `${Math.max(0, Math.min(100, pctOfTarget(totals.kcal, targets.kcal)))}%`,
                      } as CSSProperties
                    }
                  />
                </div>
              ) : null}
            </div>

            <div>
              <div className="flex items-baseline gap-2 text-[length:var(--text-callout)]">
                <span
                  className="size-2 shrink-0 translate-y-[-1px] rounded-full"
                  style={{ background: "var(--sage)" }}
                  aria-hidden
                />
                <span className="text-muted-foreground">Protein</span>
                <span
                  className="ml-auto font-semibold text-foreground tabular-nums"
                  data-metric="day-protein-vs-target"
                >
                  {fmtGrams(totals.proteinG)} g
                  {targets ? (
                    <span className="font-normal text-muted-foreground">
                      {" "}
                      of ~{fmtGrams(targets.proteinG)} g
                    </span>
                  ) : null}
                </span>
              </div>
              {targets ? (
                <div className="ml-4 mt-1.5">
                  <div
                    className="meter"
                    role="progressbar"
                    aria-label="Protein against target"
                    aria-valuemin={0}
                    aria-valuemax={Math.round(targets.proteinG)}
                    aria-valuenow={Math.round(totals.proteinG)}
                    style={
                      {
                        "--v": `${Math.max(0, Math.min(100, (comparison.proteinFraction ?? 0) * 100))}%`,
                      } as CSSProperties
                    }
                  />
                </div>
              ) : null}
            </div>

            {[
              { label: "Carbs", value: totals.carbsG, color: "var(--macro-carb)" },
              { label: "Fat", value: totals.fatG, color: "var(--amber)" },
            ].map((m) => (
              <div
                key={m.label}
                className="flex items-baseline gap-2 text-[length:var(--text-callout)]"
              >
                <span
                  className="size-2 shrink-0 translate-y-[-1px] rounded-full"
                  style={{ background: m.color }}
                  aria-hidden
                />
                <span className="text-muted-foreground">{m.label}</span>
                <span className="ml-auto font-semibold text-foreground tabular-nums">
                  {fmtGrams(m.value)} g
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <hr className="nut-hairline my-6" />

      {/* ONE footer row (M-124): the ledger's summary in one line on
          the left — entry count plus its factual state, where the
          empty day's "Nothing to verify yet" belongs — and the eating
          window as one chip on the right. The ledger detail (bar +
          source rows) and the target's own source line follow below. */}
      <div className="nut-hero-foot flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <p className="flex items-center gap-2 text-[length:var(--text-callout)] font-medium text-foreground">
          <ShieldCheck className="size-4 shrink-0 text-[var(--sage)]" aria-hidden />
          Provenance ledger
          <span className="font-normal text-muted-foreground">
            · {plural(log.entries.length, "entry", "entries")}
            {shares.verifiedShare !== null
              ? ` · ${Math.round(shares.verifiedShare * 100)}% from stated values`
              : " · Nothing to verify yet"}
          </span>
        </p>
        <span className="nut-chip">
          Eating window ·{" "}
          {window
            ? window.spanMinutes > 0
              ? `${window.first} → ${window.last} · ${formatSpan(window.spanMinutes)}`
              : window.first
            : "appears with your first log"}
        </span>
      </div>

      {shares.totalKcal > 0 ? (
        <>
          <div className="nut-ledger mt-4" aria-hidden>
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

      {/* The target's own provenance — the BMR/TDEE specifics moved
          here, into the ledger detail (M-124), out of the sentence
          that used to wrap under the estimate chip. */}
      {targetState.kind === "ready" && bmr !== null && tdee !== null ? (
        <p
          className="mt-3 text-[length:var(--text-caption)] text-muted-foreground"
          data-testid="target-source-line"
        >
          Where the target comes from: {fmtCount(bmr)} kcal at rest, {fmtKcalApprox(tdee)} with
          activity (Mifflin–St Jeor).
        </p>
      ) : null}

      {targetState.kind === "ready" ? (
        <p className="nut-note flex items-center gap-2">
          <EstimateChip />
          <span>
            Targets are estimates (Mifflin–St Jeor), a guide for the day, not a prescription.
          </span>
        </p>
      ) : targetState.kind === "blocked" ? (
        <p className="nut-note">
          Your safety answers mean Bloom doesn't set calorie targets for you. These totals
          are simply your record, logging still works exactly the same.
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
