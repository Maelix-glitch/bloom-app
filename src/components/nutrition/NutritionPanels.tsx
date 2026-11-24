/**
 * Nutrition — the week's rhythm, the micronutrient spectrum and the
 * pattern lab (N-UI). Presentation over the lib's aggregations:
 * WeekPanel reads `weekAggregates`, Spectrum reads `spectrumForDay`
 * rows (ICMR-NIN RDA 2020 references, sodium as a ceiling, incomplete
 * totals asterisked as floors), PatternLab reads `moodPatterns` and
 * keeps the honest empty state until the data earns a pattern.
 */

import type { CSSProperties } from "react";
import { Link } from "@tanstack/react-router";
import { FileText, FlaskConical } from "lucide-react";

import {
  type MoodPattern,
  type NutritionTargets,
  type SpectrumRow,
  type SpectrumSex,
  type WeekAggregates,
} from "@/lib/nutrition";
import { fmtGrams } from "@/lib/format";
import { formatGrams } from "./input";
import { Bar, MiniBars } from "./NutritionPrimitives";

/* ------------------------------- WeekPanel ------------------------------ */

export function WeekPanel({
  week,
  targets,
  reportDay,
}: {
  week: WeekAggregates;
  targets: NutritionTargets | null;
  /** The selected day the report window ends on. */
  reportDay: string;
}) {
  const values = week.days.map((d) => d.totals?.kcal ?? null);
  const max = Math.max(targets ? targets.kcal * 1.2 : 0, ...values.map((v) => v ?? 0), 1);
  const labels = week.days.map((d) =>
    new Date(`${d.day}T12:00:00`).toLocaleDateString(undefined, { weekday: "short" }).slice(0, 3),
  );
  return (
    <section className="nut-card nut-rise nut-week" aria-label="This week" style={{ "--d": "160ms" } as CSSProperties}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">This week</p>
          <h3 className="mt-1.5 font-display text-[22px] text-foreground">Your rhythm</h3>
        </div>
        <Link
          to="/nutrition/report"
          search={{ d: reportDay }}
          className="nut-btn nut-btn-ghost nut-btn-sm"
        >
          <FileText className="size-3.5" aria-hidden /> Clinician report
        </Link>
      </div>
      <div className="mt-4">
        <MiniBars values={values} max={max} target={targets?.kcal ?? null} labels={labels} />
      </div>
      <div className="mt-5 grid grid-cols-3 gap-3 border-t border-border-subtle pt-4">
        <div>
          <p className="font-display text-[24px] text-foreground tabular-nums">
            {week.avgKcal !== null ? week.avgKcal : "-"}
          </p>
          <p className="mt-0.5 text-[length:var(--text-caption)] text-muted-foreground">
            avg kcal
          </p>
        </div>
        <div>
          <p className="font-display text-[24px] text-foreground tabular-nums">
            {week.avgProteinG !== null ? fmtGrams(week.avgProteinG) : "-"}
          </p>
          <p className="mt-0.5 text-[length:var(--text-caption)] text-muted-foreground">
            avg protein g
          </p>
        </div>
        <div>
          <p className="font-display text-[24px] text-foreground tabular-nums">
            {week.proteinHitDays !== null ? `${week.proteinHitDays}/${week.loggedDays}` : "-"}
          </p>
          <p className="mt-0.5 text-[length:var(--text-caption)] text-muted-foreground">
            protein days
          </p>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------- Spectrum ------------------------------- */

function formatSpectrumValue(row: SpectrumRow): string {
  if (row.value === null) return "not reported";
  const grouped = (n: number) => Math.round(n).toLocaleString("en-IN");
  const value =
    row.key === "fibreG" || row.key === "ironMg" ? formatGrams(row.value) : grouped(row.value);
  return `${value} / ${grouped(row.reference)} ${row.unit}`;
}

export function Spectrum({
  rows,
  sex,
}: {
  rows: SpectrumRow[];
  sex: SpectrumSex;
}) {
  const anyIncomplete = rows.some((r) => r.incomplete);
  return (
    <section className="nut-card nut-rise nut-spectrum" aria-label="Micronutrient spectrum" style={{ "--d": "200ms" } as CSSProperties}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Micronutrient spectrum</p>
          <h3 className="mt-1.5 font-display text-[22px] text-foreground">Beyond the macros</h3>
        </div>
        <p className="max-w-[22ch] text-right text-[length:var(--text-caption)] leading-[var(--leading-body)] text-muted-foreground">
          Against common reference intakes for your profile. Sodium is a ceiling.
        </p>
      </div>
      <div className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2">
        {rows.map((row) => {
          const over = row.limit && row.value !== null && row.value > row.reference;
          const reached = !row.limit && row.value !== null && row.value >= row.reference;
          const color = row.limit
            ? over
              ? "var(--rose)"
              : "var(--sky)"
            : reached
              ? "var(--sage)"
              : "var(--gold)";
          return (
            <div key={row.key} className="nut-spectrum-row">
              <div className="flex items-baseline gap-2 text-[length:var(--text-callout)]">
                <span className="text-muted-foreground">
                  {row.label}
                  {row.limit ? (
                    <span className="ml-1.5 rounded-full border border-border-subtle px-1.5 py-px text-[length:var(--text-micro)] uppercase tracking-[var(--tracking-meta)] text-faint-strong">
                      limit
                    </span>
                  ) : null}
                  {row.incomplete ? (
                    <span
                      className="ml-1 font-semibold text-[var(--amber)]"
                      title="Some logged foods don't report this nutrient"
                    >
                      *
                    </span>
                  ) : null}
                </span>
                <span className="ml-auto font-semibold text-foreground tabular-nums">
                  {formatSpectrumValue(row)}
                </span>
              </div>
              <div className="mt-1.5">
                <Bar
                  fraction={
                    row.value === null ? null : Math.max(0, Math.min(1, row.value / row.reference))
                  }
                  color={color}
                  height={5}
                />
              </div>
            </div>
          );
        })}
      </div>
      <p className="nut-note">
        Reference intakes: ICMR-NIN Recommended Dietary Allowances 2020, adult values
        {sex ? ` for ${sex === "female" ? "women" : "men"}` : ""}. A guide, not a prescription.
      </p>
      {anyIncomplete ? (
        <p className="nut-note">
          * Some logged foods don't report this nutrient. Bloom treats that as "unknown", so
          the total is a floor, not a claim.
        </p>
      ) : null}
    </section>
  );
}

/* ------------------------------ PatternLab ------------------------------ */

export function PatternLab({ patterns }: { patterns: MoodPattern[] }) {
  return (
    <section className="nut-card nut-rise section" aria-label="Pattern lab" style={{ "--d": "240ms" } as CSSProperties}>
      <div className="section-head">
        <div className="section-head__main">
          <div className="eyebrow">Pattern lab</div>
          <h2 className="section-head__title mt-1.5">
            How food and mood <em className="nut-gold-text">move together</em>
          </h2>
        </div>
      </div>
      <p className="mt-2 max-w-[62ch] text-[length:var(--text-callout)] leading-[var(--leading-body)] text-muted-foreground">
        These are patterns in your data, not proof of cause, and each shows how many days
        stand behind it.
      </p>
      {patterns.length === 0 ? (
        <div className="empty-row mt-5">
          <span className="empty-row-icon" aria-hidden>
            <FlaskConical className="size-4" />
          </span>
          <p className="empty-row-text">
            <strong>No patterns yet.</strong> Patterns appear once you have at least two
            days on each side of a comparison, keep logging food and checking in on Mood.
          </p>
          <Link to="/mood" className="nut-btn nut-btn-ghost nut-btn-sm empty-row-action">
            Open Mood
          </Link>
        </div>
      ) : (
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {patterns.map((pattern) => (
            <article
              key={pattern.id}
              className="rounded-[var(--radius-control)] border border-border-subtle bg-[color-mix(in_oklab,var(--foreground)_3%,transparent)] p-4"
            >
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-[length:var(--text-callout)] font-semibold text-foreground">
                  {pattern.title}
                </h4>
                <span className="nut-chip" data-selected={pattern.confidence === "emerging" || undefined}>
                  {pattern.confidence}
                </span>
              </div>
              <p className="mt-3 font-display text-[34px] leading-none tabular-nums">
                <span style={{ color: pattern.delta > 0 ? "var(--sage)" : "var(--amber)" }}>
                  {pattern.delta > 0 ? "+" : "−"}
                  {formatGrams(Math.abs(pattern.delta))}
                </span>{" "}
                <span className="text-[length:var(--text-callout)] text-muted-foreground">
                  mood points
                </span>
              </p>
              <div className="mt-4 space-y-3">
                {[
                  { label: pattern.withLabel, avg: pattern.withAvg, n: pattern.withN, color: "var(--sage)" },
                  { label: pattern.withoutLabel, avg: pattern.withoutAvg, n: pattern.withoutN, color: "var(--gold)" },
                ].map((row) => (
                  <div key={row.label}>
                    <div className="flex items-baseline justify-between gap-2 text-[length:var(--text-caption)]">
                      <span className="text-muted-foreground">{row.label}</span>
                      <span className="shrink-0 font-semibold text-foreground tabular-nums">
                        {formatGrams(row.avg)} · {row.n} d
                      </span>
                    </div>
                    <div className="mt-1">
                      <Bar fraction={row.avg / 10} color={row.color} height={5} />
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
